// Progression derived entirely from what the chain already recorded. Nothing
// here is stored, seeded, or estimated: if a value cannot be computed from real
// play it comes back null and the UI omits the row.

export interface DayRecord {
  day: number;
  // Digs the wallet actually spent that day.
  digs: number;
  // Registered a find for that day. Only ever true after the map opened, since
  // claimTreasure reverts before midnight.
  found: boolean;
  // The dig number the treasure landed on, when found.
  foundOn: number;
}

export interface PlayerRecord {
  streak: number;
  daysPlayed: number;
  treasures: number;
  // Fewest digs in any successful hunt.
  bestFind: number | null;
  // Best daily placement, when a revealed day has been ranked.
  bestRank: number | null;
}

const played = (record: DayRecord | undefined) => (record?.digs ?? 0) > 0;

// Consecutive UTC days ending at today on which the wallet dug at least once.
// Finding the treasure is not required — turning up is.
//
// A day that has not been played yet must not break a live streak: at 00:30 UTC
// a player with six days behind them still has six, not zero. So the count
// starts at today when today has a dig, and at yesterday otherwise.
export function huntStreak(today: number, records: DayRecord[]): number {
  const byDay = new Map(records.map((record) => [record.day, record]));
  let cursor = played(byDay.get(today)) ? today : today - 1;

  let streak = 0;
  while (played(byDay.get(cursor))) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}

export function playerRecord(
  today: number,
  records: DayRecord[],
  ranks: Map<number, number> = new Map(),
): PlayerRecord {
  const real = records.filter((record) => record.digs > 0);
  const finds = real.filter((record) => record.found && record.foundOn > 0);

  const placements = [...ranks.values()].filter((rank) => rank > 0);

  return {
    streak: huntStreak(today, records),
    daysPlayed: real.length,
    treasures: finds.length,
    bestFind: finds.length > 0 ? Math.min(...finds.map((record) => record.foundOn)) : null,
    bestRank: placements.length > 0 ? Math.min(...placements) : null,
  };
}

export function streakLine(streak: number): string | null {
  if (streak <= 0) return null;
  return `${streak} day streak`;
}
