import type { Address, Hex } from "viem";
import { DAILY_ABI } from "@/lib/chain/daily-abi";
import { DAILY_ADDRESS, publicClient } from "@/lib/chain/config";
import type { DayRecord } from "@/lib/streak";

// How far back a streak is worth chasing. Log scanning cannot help here — Base
// Sepolia caps a getLogs range at 2000 blocks, which is roughly an hour, so a
// month of history would be hundreds of sequential calls. Reading playerState
// per day is one multicall instead.
export const RECORD_DEPTH = 45;

export async function loadDayRecords(
  hunter: string,
  today: number,
  depth: number = RECORD_DEPTH,
): Promise<DayRecord[]> {
  const days = Array.from({ length: depth }, (_, index) => today - index).filter((day) => day >= 0);
  if (days.length === 0) return [];

  const results = await publicClient.multicall({
    contracts: days.map((day) => ({
      address: DAILY_ADDRESS,
      abi: DAILY_ABI,
      functionName: "playerState",
      args: [BigInt(day), hunter as Address],
    })),
    allowFailure: true,
  });

  const records: DayRecord[] = [];
  results.forEach((result, index) => {
    // A day that failed to read is not a day the player missed. Dropping it
    // keeps a flaky RPC from silently breaking someone's streak.
    if (result.status !== "success") return;
    const [digs, , finished, foundOn] = result.result as unknown as [
      number,
      boolean,
      boolean,
      number,
      Hex,
    ];
    records.push({
      day: days[index],
      digs: Number(digs),
      found: finished,
      foundOn: Number(foundOn),
    });
  });

  return records;
}
