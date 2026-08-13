import { getAbiItem, type AbiEvent } from "viem";
import { DAILY_ABI } from "@/lib/chain/daily-abi";
import { DAILY_ADDRESS, publicClient } from "@/lib/chain/config";
import { loadCallsigns } from "@/lib/chain/callsigns";

const MAX_RANGE = BigInt(1900);

export interface Placing {
  hunter: string;
  callsign: string | null;
  digs: number;
}

async function scan(day: number, eventName: "TreasureFound") {
  const latest = await publicClient.getBlockNumber();
  const event = getAbiItem({ abi: DAILY_ABI, name: eventName }) as AbiEvent;

  const logs: { args: Record<string, unknown> }[] = [];
  // Base Sepolia rejects a range wider than 2000 blocks, so walk it in slices.
  const lookback = BigInt(43_200);
  let from = latest > lookback ? latest - lookback : BigInt(0);
  while (from <= latest) {
    const to = from + MAX_RANGE > latest ? latest : from + MAX_RANGE;
    const slice = await publicClient.getLogs({
      address: DAILY_ADDRESS,
      event,
      args: { day: BigInt(day) },
      fromBlock: from,
      toBlock: to,
    });
    logs.push(...(slice as unknown as { args: Record<string, unknown> }[]));
    from = to + BigInt(1);
  }
  return logs;
}

export async function loadPlacings(day: number): Promise<Placing[]> {
  const logs = await scan(day, "TreasureFound");
  const rows = logs.map((log) => {
    const args = log.args as { hunter: string; digs: number };
    return { hunter: args.hunter, digs: Number(args.digs) };
  });

  const names = await loadCallsigns(rows.map((row) => row.hunter)).catch(() => new Map<string, string>());
  return rows
    .map((row) => ({ ...row, callsign: names.get(row.hunter.toLowerCase()) ?? null }))
    .sort((a, b) => a.digs - b.digs);
}
