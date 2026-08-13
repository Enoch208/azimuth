import type { Standing } from "@/lib/standings";

// A day's finished standings, as the leaderboard consumes them.
export interface DayStandings {
  day: number;
  standings: Standing[];
}

export interface AllTimeRow {
  rank: number;
  hunter: string;
  callsign: string | null;
  // Points are the sum of every day played, so turning up is worth something
  // even on a day that went badly.
  points: number;
  daysPlayed: number;
  treasures: number;
  // Fewest digs in any successful hunt.
  bestFind: number | null;
  // Best daily placement across every ranked day.
  bestRank: number | null;
}

// Aggregates revealed days into one table. Only revealed days can appear here:
// a live day has no standings, because its treasure is still secret.
export function allTimeTable(days: DayStandings[]): AllTimeRow[] {
  const byHunter = new Map<string, AllTimeRow>();

  for (const { standings } of days) {
    for (const entry of standings) {
      const key = entry.hunter.toLowerCase();
      const row = byHunter.get(key) ?? {
        rank: 0,
        hunter: entry.hunter,
        callsign: entry.callsign,
        points: 0,
        daysPlayed: 0,
        treasures: 0,
        bestFind: null,
        bestRank: null,
      };

      row.points += entry.score;
      row.daysPlayed += 1;
      if (entry.found) {
        row.treasures += 1;
        row.bestFind = row.bestFind === null ? entry.digsUsed : Math.min(row.bestFind, entry.digsUsed);
      }
      row.bestRank = row.bestRank === null ? entry.rank : Math.min(row.bestRank, entry.rank);
      // A callsign claimed later should win over the days it was missing.
      if (entry.callsign) row.callsign = entry.callsign;

      byHunter.set(key, row);
    }
  }

  return [...byHunter.values()]
    .sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.treasures !== b.treasures) return b.treasures - a.treasures;
      if (a.daysPlayed !== b.daysPlayed) return a.daysPlayed - b.daysPlayed;
      // Deterministic, so the table never reshuffles between renders.
      return a.hunter.toLowerCase() < b.hunter.toLowerCase() ? -1 : 1;
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
