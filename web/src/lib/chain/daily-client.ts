import { parseEventLogs, toHex, type Account, type Chain, type Hex, type Transport, type WalletClient } from "viem";
import { DAILY_ABI } from "@/lib/chain/daily-abi";
import { DAILY_ADDRESS, publicClient } from "@/lib/chain/config";
import { getLightning } from "@/lib/chain/inco";
import { DIGS, tileFromIndex, tileIndex, type Dig, type Temperature, type Tile } from "@/lib/daily";

export type DigPhase = "idle" | "signing" | "confirming" | "reading";

interface DugArgs {
  x: number;
  y: number;
  digNumber: number;
  temperature: Hex;
}

function toTemperature(value: unknown): Temperature {
  const n = typeof value === "bigint" ? Number(value) : Number(value ?? 5);
  return Math.min(5, Math.max(0, n)) as Temperature;
}

export interface DailySnapshot {
  day: number;
  digs: Dig[];
  digsLeft: number;
  finished: boolean;
  foundOn: number;
  hunters: number;
  finders: number;
  // The hunter's own sealed guess. `sealed` is what the chain records; `right`
  // is what only this wallet can read back.
  sealed: boolean;
  guessedTile: Tile | null;
  guessRight: boolean | null;
}

// The covalidator answers 503 often enough to matter — a single refused read on
// page load used to leave a whole board sitting on "still arriving" until the
// player reloaded by hand. Digging already retried; loading did not.
async function withRetry<T>(attempt: () => Promise<T>, tries = 4): Promise<T | null> {
  for (let n = 0; n < tries; n += 1) {
    try {
      return await attempt();
    } catch {
      if (n < tries - 1) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  return null;
}

export class DailyClient {
  private digs: Dig[] = [];
  private finished = false;
  private foundOn = 0;
  private hunters = 0;
  private finders = 0;
  private sealed = false;
  private guessedTile: Tile | null = null;
  private guessRight: boolean | null = null;

  constructor(
    private readonly day: number,
    private readonly wallet: WalletClient<Transport, Chain, Account>,
    private readonly hunter: Hex,
    private readonly onPhase: (phase: DigPhase) => void,
  ) {}

  snapshot(): DailySnapshot {
    return {
      day: this.day,
      digs: [...this.digs],
      digsLeft: Math.max(0, DIGS - this.digs.length),
      finished: this.finished,
      foundOn: this.foundOn,
      hunters: this.hunters,
      finders: this.finders,
      sealed: this.sealed,
      guessedTile: this.guessedTile,
      guessRight: this.guessRight,
    };
  }

  async load(): Promise<DailySnapshot> {
    const [state, trail, info, guess] = await Promise.all([
      publicClient.readContract({
        address: DAILY_ADDRESS,
        abi: DAILY_ABI,
        functionName: "playerState",
        args: [BigInt(this.day), this.hunter],
      }),
      publicClient.readContract({
        address: DAILY_ADDRESS,
        abi: DAILY_ABI,
        functionName: "playerTrail",
        args: [BigInt(this.day), this.hunter],
      }),
      publicClient.readContract({
        address: DAILY_ADDRESS,
        abi: DAILY_ABI,
        functionName: "huntInfo",
        args: [BigInt(this.day)],
      }),
      publicClient.readContract({
        address: DAILY_ADDRESS,
        abi: DAILY_ABI,
        functionName: "guessOf",
        args: [BigInt(this.day), this.hunter],
      }),
    ]);

    this.finished = state[2];
    this.foundOn = state[3];
    this.hunters = Number(info[1]);
    this.finders = Number(info[2]);
    this.sealed = guess[0];

    // Where a hunter dug is plaintext and always readable. Only the answers need
    // the covalidator, so the board is rebuilt first and the temperatures are
    // filled in after. A slow covalidator must never make a spent dig look
    // unspent.
    const [xs, ys, handles] = trail as readonly [readonly number[], readonly number[], readonly Hex[]];
    this.digs = xs.map((x, index) => ({ tile: { x, y: ys[index] }, temperature: null }));

    if (handles.length > 0) {
      const lightning = await getLightning();
      const results = await withRetry(() => lightning.attestedDecrypt(this.wallet, [...handles]));
      if (results) {
        this.digs = this.digs.map((entry, index) => ({
          ...entry,
          temperature: toTemperature(results[index].plaintext.value),
        }));
      }
      // Still refused after several tries: leave them unread. The board shows
      // the digs that were spent either way, and holds until they arrive.
    }

    // A sealed guess is two ciphertexts to its owner and nothing to anybody
    // else: the tile they named and whether it landed. Both are read back here
    // so a returning hunter sees their own last word rather than a blank.
    if (this.sealed) {
      const lightning = await getLightning();
      const read = await withRetry(() =>
        lightning.attestedDecrypt(this.wallet, [guess[1] as Hex, guess[2] as Hex]),
      );
      if (read) {
        this.guessedTile = tileFromIndex(Number(read[0].plaintext.value));
        this.guessRight = Boolean(read[1].plaintext.value);
      }
      // sealed and unread is a real state; the panel says so rather than
      // pretending no guess was made.
    }

    return this.snapshot();
  }

  async dig(tile: Tile): Promise<DailySnapshot> {
    this.onPhase("signing");
    const hash = await this.wallet.writeContract({
      address: DAILY_ADDRESS,
      abi: DAILY_ABI,
      functionName: "dig",
      args: [tile.x, tile.y],
      chain: this.wallet.chain,
      account: this.wallet.account,
    });

    this.onPhase("confirming");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const events = parseEventLogs({ abi: DAILY_ABI, eventName: "Dug", logs: receipt.logs });
    const args = events[0].args as unknown as DugArgs;

    // The dig is on chain now and has already cost one of the six. Record it
    // before asking for the answer, so a covalidator that never replies leaves
    // an unread tile on the board rather than erasing a move that happened.
    this.digs.push({ tile, temperature: null });

    this.onPhase("reading");
    const temperature = await this.readTemperature(args.temperature);
    this.digs[this.digs.length - 1] = { tile, temperature };

    this.onPhase("idle");
    return this.snapshot();
  }

  // The dig is already on chain by this point and has cost the player one of
  // their six. If the covalidator is slow we keep asking rather than reporting
  // a failure, because telling someone their move did not happen when it did is
  // worse than making them wait.
  private async readTemperature(handle: Hex): Promise<Temperature> {
    const lightning = await getLightning();
    let last: unknown = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const [attestation] = await lightning.attestedDecrypt(this.wallet, [handle]);
        return toTemperature(attestation.plaintext.value);
      } catch (error) {
        last = error;
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    }
    throw new Error(
      `DIG_LANDED_UNREAD: your dig was recorded on Base, but its result has not arrived yet. ${String(last).slice(0, 80)}`,
    );
  }

  // The one move a hunter encrypts themselves. Every dig above it was public
  // the moment it landed; this tile goes to the chain as ciphertext, is compared
  // against a coordinate the contract cannot read either, and comes back as a
  // yes or no that only this wallet can open.
  async sealGuess(tile: Tile): Promise<DailySnapshot> {
    this.onPhase("signing");
    const lightning = await getLightning();
    const { handleTypes } = await import("@inco/lightning-js");
    const ciphertext = await lightning.encrypt(BigInt(tileIndex(tile)), {
      accountAddress: this.hunter,
      dappAddress: DAILY_ADDRESS,
      handleType: handleTypes.euint256,
    });

    const hash = await this.wallet.writeContract({
      address: DAILY_ADDRESS,
      abi: DAILY_ABI,
      functionName: "sealGuess",
      args: [ciphertext],
      chain: this.wallet.chain,
      account: this.wallet.account,
    });

    this.onPhase("confirming");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const events = parseEventLogs({ abi: DAILY_ABI, eventName: "GuessSealed", logs: receipt.logs });
    const verdict = (events[0].args as unknown as { verdict: Hex }).verdict;

    this.onPhase("reading");
    this.sealed = true;
    this.guessedTile = tile;
    this.guessRight = await this.readVerdict(verdict);

    this.onPhase("idle");
    return this.snapshot();
  }

  private async readVerdict(handle: Hex): Promise<boolean | null> {
    const lightning = await getLightning();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const [attestation] = await lightning.attestedDecrypt(this.wallet, [handle]);
        return Boolean(attestation.plaintext.value);
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    }
    // The guess is on chain and counted either way. Unread is not undone.
    return null;
  }

  // Scores register after midnight, because a public finder during the day
  // would point at the treasure: it is simply their last dug tile.
  async claim(day: number): Promise<void> {
    const state = await publicClient.readContract({
      address: DAILY_ADDRESS,
      abi: DAILY_ABI,
      functionName: "playerState",
      args: [BigInt(day), this.hunter],
    });

    const lightning = await getLightning();
    const [proof] = await lightning.attestedDecrypt(this.wallet, [state[4] as Hex]);
    const signatures = proof.covalidatorSignatures.map((signature) => toHex(signature));

    const hash = await this.wallet.writeContract({
      address: DAILY_ADDRESS,
      abi: DAILY_ABI,
      functionName: "claimTreasure",
      args: [BigInt(day), signatures],
      chain: this.wallet.chain,
      account: this.wallet.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }
}

export async function currentDay(): Promise<number> {
  const day = await publicClient.readContract({
    address: DAILY_ADDRESS,
    abi: DAILY_ABI,
    functionName: "today",
  });
  return Number(day);
}

export async function huntSummary(day: number): Promise<{ hunters: number; finders: number; opened: boolean }> {
  const info = await publicClient.readContract({
    address: DAILY_ADDRESS,
    abi: DAILY_ABI,
    functionName: "huntInfo",
    args: [BigInt(day)],
  });
  return { hunters: Number(info[1]), finders: Number(info[2]), opened: info[3] };
}
