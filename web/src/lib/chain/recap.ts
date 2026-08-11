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
  day: number;
  revealed: boolean;
  treasure: Tile | null;
  trails: RecapTrail[];
}

function toTemperature(value: unknown): Temperature {
  const n = typeof value === "bigint" ? Number(value) : Number(value ?? 5);
  return Math.min(5, Math.max(0, n)) as Temperature;
}

async function dugOn(day: number) {
  const event = getAbiItem({ abi: DAILY_ABI, name: "Dug" }) as AbiEvent;
  const latest = await publicClient.getBlockNumber();
  const lookback = BigInt(86_400);
  let from = latest > lookback ? latest - lookback : BigInt(0);

  const rows: { hunter: string; x: number; y: number; handle: Hex }[] = [];
  while (from <= latest) {
    const to = from + MAX_RANGE > latest ? latest : from + MAX_RANGE;
    const logs = await publicClient.getLogs({
      address: DAILY_ADDRESS,
      event,
      args: { day: BigInt(day) },
      fromBlock: from,
      toBlock: to,
    });
    for (const log of logs) {
      const args = log.args as unknown as { hunter: string; x: number; y: number; temperature: Hex };
      rows.push({ hunter: args.hunter, x: args.x, y: args.y, handle: args.temperature });
    }
    from = to + BigInt(1);
  }
  return rows;
}

export async function loadRecap(day: number): Promise<Recap> {
  const info = await publicClient.readContract({
    address: DAILY_ADDRESS,
    abi: DAILY_ABI,
    functionName: "huntInfo",
    args: [BigInt(day)],
  });

  if (!info[3] || !info[4]) {
    return { day, revealed: false, treasure: null, trails: [] };
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
  const [x, y] = await lightning.attestedReveal([handles[0], handles[1]]);
  const treasure = { x: Number(x.plaintext.value), y: Number(y.plaintext.value) };

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

  return { day, revealed: true, treasure, trails };
}
