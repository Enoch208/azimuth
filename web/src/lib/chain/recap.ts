import { getAbiItem, type AbiEvent, type Hex } from "viem";
import { DAILY_ABI } from "@/lib/chain/daily-abi";
import { DAILY_ADDRESS, publicClient } from "@/lib/chain/config";
import { getLightning } from "@/lib/chain/inco";
import { loadCallsigns } from "@/lib/chain/callsigns";
import type { Dig, Temperature, Tile } from "@/lib/daily";

const MAX_RANGE = BigInt(1900);

export interface RecapTrail {
  hunter: string;
  callsign: string | null;
  digs: Dig[];
  found: boolean;
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

async function dugOn(day: number) {
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

  const names = await loadCallsigns([...byHunter.keys()]).catch(() => new Map<string, string>());
  const trails: RecapTrail[] = [...byHunter.entries()].map(([hunter, digs]) => ({
    hunter,
    callsign: names.get(hunter.toLowerCase()) ?? null,
    digs,
    found: digs.some((dig) => dig.temperature === 0),
  }));

  trails.sort((a, b) => {
    if (a.found !== b.found) return a.found ? -1 : 1;
    return a.digs.length - b.digs.length;
  });

  const recap: Recap = { day, requestedDay: day, revealed: true, readable: true, treasure, trails };
  // Only a fully-read day is worth keeping. A trail whose temperatures have not
  // been revealed yet would otherwise be cached with holes in it forever.
  if (trails.every((trail) => trail.digs.every((dig) => dig.temperature !== null))) {
    opened.set(day, recap);
  }
  return recap;
}

// How many days back to look for something readable. A hunt runs daily, so
// three covers a weekend of covalidator trouble without trawling history.
const FALLBACK_DAYS = 3;

// Yesterday is what a player came for, but an unreadable yesterday should not
// leave the page blank. Walk back until a day decrypts, and let the caller say
// that it did — an unlabelled older day would be worse than an empty one.
export async function loadRecapOrLatest(day: number): Promise<Recap> {
  const asked = await loadRecap(day);
  if (asked.readable) return asked;

  for (let back = 1; back <= FALLBACK_DAYS; back += 1) {
    const older = await loadRecap(day - back).catch(() => null);
    if (older?.readable) return { ...older, requestedDay: day };
  }
  return asked;
}
