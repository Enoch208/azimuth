import { getAbiItem, type AbiEvent, type Hex } from "viem";
import { DAILY_ABI } from "@/lib/chain/daily-abi";
import { DAILY_ADDRESS, publicClient } from "@/lib/chain/config";
import { getLightning } from "@/lib/chain/inco";
import { loadCallsigns } from "@/lib/chain/callsigns";
import { tileFromIndex, type Dig, type Temperature, type Tile } from "@/lib/daily";

const MAX_RANGE = BigInt(1900);

export interface RecapTrail {
  hunter: string;
  callsign: string | null;
  digs: Dig[];
  found: boolean;
  // The sealed guess, once the map has opened it. Null if none was sealed, and
  // null while the network still will not serve the plaintext.
  guess: { tile: Tile; right: boolean } | null;
}

export interface Recap {
  // The day actually being shown. When the network will not decrypt yesterday,
  // this falls back to the most recent day it will, so the page always has a
  // real hunt on it rather than an empty state.
  day: number;
  // The day that was asked for. Differs from day only during a fallback.
  requestedDay: number;
  // The contract has opened the map: revealDay ran and the treasure is public.
  revealed: boolean;
  // The plaintext actually came back. These differ when the map is open on
  // chain but the covalidator will not yet serve the decryption — a real state
  // that used to be reported as "still sealed", which told the player the
  // opposite of the truth.
  readable: boolean;
  treasure: Tile | null;
  trails: RecapTrail[];
}

function toTemperature(value: unknown): Temperature {
  const n = typeof value === "bigint" ? Number(value) : Number(value ?? 5);
  return Math.min(5, Math.max(0, n)) as Temperature;
}

const DAY_SECONDS = 86_400;
// Base Sepolia targets two second blocks. Only used to guess which slice of
// chain a day lives in; the margin below absorbs the drift.
const BLOCK_SECONDS = 2;
const MARGIN_BLOCKS = BigInt(2_400);
// The public RPC will throttle a wide fan-out, so slices go out in waves.
const WAVE = 6;

// Which blocks could possibly hold this day's digs. Scanning a fixed 48 hour
// lookback meant ~46 sequential requests; a single UTC day is roughly half
// that, and it can be bracketed instead of walked from the far end.
async function dayWindow(day: number): Promise<{ from: bigint; to: bigint }> {
  const head = await publicClient.getBlock();
  const now = Number(head.timestamp);
  const latest = head.number;

  const behind = (seconds: number) => BigInt(Math.max(0, Math.ceil(seconds / BLOCK_SECONDS)));
  const clamp = (block: bigint) => (block < BigInt(0) ? BigInt(0) : block > latest ? latest : block);

  const from = clamp(latest - behind(now - day * DAY_SECONDS) - MARGIN_BLOCKS);
  const endedSecondsAgo = now - (day + 1) * DAY_SECONDS;
  const to = endedSecondsAgo <= 0 ? latest : clamp(latest - behind(endedSecondsAgo) + MARGIN_BLOCKS);

  return { from, to: to < from ? from : to };
}

export async function dugOn(day: number) {
  const event = getAbiItem({ abi: DAILY_ABI, name: "Dug" }) as AbiEvent;
  const { from, to } = await dayWindow(day);

  const slices: { fromBlock: bigint; toBlock: bigint }[] = [];
  for (let start = from; start <= to; start += MAX_RANGE + BigInt(1)) {
    const end = start + MAX_RANGE > to ? to : start + MAX_RANGE;
    slices.push({ fromBlock: start, toBlock: end });
  }

  const rows: { hunter: string; x: number; y: number; handle: Hex }[] = [];
  for (let i = 0; i < slices.length; i += WAVE) {
    const wave = await Promise.all(
      slices.slice(i, i + WAVE).map((slice) =>
        publicClient.getLogs({ address: DAILY_ADDRESS, event, args: { day: BigInt(day) }, ...slice }),
      ),
    );
    for (const logs of wave) {
      for (const log of logs) {
        const args = log.args as unknown as { hunter: string; x: number; y: number; temperature: Hex };
        rows.push({ hunter: args.hunter, x: args.x, y: args.y, handle: args.temperature });
      }
    }
  }
  return rows;
}

// Every sealed guess on an opened day, read in one batch. A day nobody sealed
// on costs one contract read per hunter and no decryption at all.
async function guessesOn(day: number, hunters: string[]) {
  const found = new Map<string, { tile: Tile; right: boolean }>();
  if (hunters.length === 0) return { found, complete: true };

  const records = await Promise.all(
    hunters.map((hunter) =>
      publicClient
        .readContract({
          address: DAILY_ADDRESS,
          abi: DAILY_ABI,
          functionName: "guessOf",
          args: [BigInt(day), hunter as Hex],
        })
        .then((record) => ({ hunter, record }))
        .catch(() => null),
    ),
  );

  const sealed = records.filter((entry): entry is NonNullable<typeof entry> => entry !== null && entry.record[0]);
  if (sealed.length === 0) return { found, complete: records.every((entry) => entry !== null) };

  // Read one guess at a time. Batching meant a single hunter whose guess had
  // not propagated yet threw away every other hunter's, and the day then cached
  // with the flagship mechanic missing from it.
  const lightning = await getLightning();
  const results = await Promise.all(
    sealed.map((entry) =>
      lightning
        .attestedReveal([entry.record[1] as Hex, entry.record[2] as Hex])
        .then((revealed) => ({ entry, revealed }))
        .catch(() => null),
    ),
  );

  for (const result of results) {
    if (!result) continue;
    found.set(result.entry.hunter.toLowerCase(), {
      tile: tileFromIndex(Number(result.revealed[0].plaintext.value)),
      right: Boolean(result.revealed[1].plaintext.value),
    });
  }

  return { found, complete: results.every((result) => result !== null) };
}

// An opened day never changes again: the treasure is public, the trails are
// public, and no further digs can land on it. Re-decrypting all of that on
// every request was most of the minute the page used to take.
const opened = new Map<number, Recap>();
const unreadUntil = new Map<number, number>();
const UNREAD_MS = 45_000;

export async function loadRecap(day: number): Promise<Recap> {
  const cached = opened.get(day);
  if (cached) return cached;
  // Backoff is only ever entered after an opened day failed to decrypt, so the
  // map is known to be open here — it just cannot be read yet.
  if ((unreadUntil.get(day) ?? 0) > Date.now()) {
    return { day, requestedDay: day, revealed: true, readable: false, treasure: null, trails: [] };
  }

  const info = await publicClient.readContract({
    address: DAILY_ADDRESS,
    abi: DAILY_ABI,
    functionName: "huntInfo",
    args: [BigInt(day)],
  });

  if (!info[3] || !info[4]) {
    return { day, requestedDay: day, revealed: false, readable: false, treasure: null, trails: [] };
  }

  const [handles, rows] = await Promise.all([
    publicClient.readContract({
      address: DAILY_ADDRESS,
      abi: DAILY_ABI,
      functionName: "treasureHandles",
      args: [BigInt(day)],
    }),
    dugOn(day),
  ]);

  const lightning = await getLightning();
  let treasure: Tile;
  try {
    const [x, y] = await lightning.attestedReveal([handles[0], handles[1]]);
    treasure = { x: Number(x.plaintext.value), y: Number(y.plaintext.value) };
  } catch {
    // The map is open on chain; the covalidator will not serve the plaintext
    // yet. Reporting "sealed" here would tell the player the day never opened.
    unreadUntil.set(day, Date.now() + UNREAD_MS);
    return { day, requestedDay: day, revealed: true, readable: false, treasure: null, trails: [] };
  }

  // Once the day is open every trail is public, so one batch covers the board.
  const temperatures = new Map<string, Temperature>();
  if (rows.length > 0) {
    try {
      const revealed = await lightning.attestedReveal(rows.map((row) => row.handle));
      rows.forEach((row, index) => {
        temperatures.set(row.handle, toTemperature(revealed[index].plaintext.value));
      });
    } catch {
      // a trail that has not been revealed yet simply stays unread
    }
  }

  const byHunter = new Map<string, Dig[]>();
  for (const row of rows) {
    const list = byHunter.get(row.hunter) ?? [];
    list.push({ tile: { x: row.x, y: row.y }, temperature: temperatures.get(row.handle) ?? null });
    byHunter.set(row.hunter, list);
  }

  const hunters = [...byHunter.keys()];
  const [names, sealed] = await Promise.all([
    loadCallsigns(hunters).catch(() => new Map<string, string>()),
    guessesOn(day, hunters).catch(() => ({
      found: new Map<string, { tile: Tile; right: boolean }>(),
      complete: false,
    })),
  ]);

  const trails: RecapTrail[] = [...byHunter.entries()].map(([hunter, digs]) => ({
    hunter,
    callsign: names.get(hunter.toLowerCase()) ?? null,
    digs,
    found: digs.some((dig) => dig.temperature === 0),
    guess: sealed.found.get(hunter.toLowerCase()) ?? null,
  }));

  trails.sort((a, b) => {
    if (a.found !== b.found) return a.found ? -1 : 1;
    return a.digs.length - b.digs.length;
  });

  const recap: Recap = { day, requestedDay: day, revealed: true, readable: true, treasure, trails };
  // Only a fully-read day is worth keeping, and "fully read" has to include the
  // sealed guesses. Caching on dig temperatures alone froze a day in which a
  // right guess had not propagated yet, and that hunter then read as a miss for
  // as long as the instance lived.
  const digsRead = trails.every((trail) => trail.digs.every((dig) => dig.temperature !== null));
  if (digsRead && sealed.complete) {
    opened.set(day, recap);
  }
  return recap;
}

const FALLBACK_DAYS = 3;

// Readable is the only bar that matters here. A day can be open on chain and
// still refuse to decrypt — that state used to be returned as the recap, which
// showed the player an apology while a genuinely revealed hunt sat one day
// back. Falling back on `revealed` alone never reached it.
//
// The loader is a parameter so the choice can be tested without a chain.
export async function loadRecapOrLatest(
  day: number,
  load: (day: number) => Promise<Recap> = loadRecap,
): Promise<Recap> {
  const asked = await load(day);
  if (asked.readable) return asked;

  for (let back = 1; back <= FALLBACK_DAYS; back += 1) {
    const older = await load(day - back).catch(() => null);
    if (older?.readable) return { ...older, requestedDay: day };
  }
  return asked;
}
