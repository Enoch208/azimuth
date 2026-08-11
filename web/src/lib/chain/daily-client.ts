import { parseEventLogs, toHex, type Account, type Chain, type Hex, type Transport, type WalletClient } from "viem";
import { DAILY_ABI } from "@/lib/chain/daily-abi";
import { DAILY_ADDRESS, publicClient } from "@/lib/chain/config";
import { getLightning } from "@/lib/chain/inco";
import { DIGS, type Dig, type Temperature, type Tile } from "@/lib/daily";

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
}

export class DailyClient {
  private digs: Dig[] = [];
  private finished = false;
  private foundOn = 0;
  private hunters = 0;
  private finders = 0;

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
    };
  }

  async load(): Promise<DailySnapshot> {
    const [state, trail, info] = await Promise.all([
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
    ]);

    this.finished = state[2];
    this.foundOn = state[3];
    this.hunters = Number(info[1]);
    this.finders = Number(info[2]);

    const [xs, ys, handles] = trail as readonly [readonly number[], readonly number[], readonly Hex[]];
    if (handles.length > 0) {
      const lightning = await getLightning();
      const results = await lightning.attestedDecrypt(this.wallet, [...handles]);
      this.digs = handles.map((_, index) => ({
        tile: { x: xs[index], y: ys[index] },
        temperature: toTemperature(results[index].plaintext.value),
      }));
    } else {
      this.digs = [];
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

    this.onPhase("reading");
    const lightning = await getLightning();
    const [attestation] = await lightning.attestedDecrypt(this.wallet, [args.temperature]);
    const temperature = toTemperature(attestation.plaintext.value);

    this.digs.push({ tile, temperature });

    this.onPhase("idle");
    return this.snapshot();
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
