import { allTimeTable, type AllTimeRow, type DayStandings } from "@/lib/all-time";
import { loadRecap } from "@/lib/chain/recap";
import { standingsFor } from "@/lib/standings";

// How far back the table reaches. Each day costs a recap load, so this is
// bounded deliberately rather than trawling every day since launch.
export const LEADERBOARD_DAYS = 14;

export interface Leaderboard {
  rows: AllTimeRow[];
  // Days that actually contributed. A day the network would not decrypt is
  // skipped rather than counted as nobody having played it.
  daysCounted: number;
  daysMissing: number;
}

export async function loadLeaderboard(today: number): Promise<Leaderboard> {
  const days = Array.from({ length: LEADERBOARD_DAYS }, (_, i) => today - 1 - i).filter((d) => d >= 0);

  const loaded = await Promise.all(
    days.map((day) =>
      loadRecap(day)
        .then((recap): DayStandings | null =>
          recap.readable && recap.treasure
            ? { day, standings: standingsFor(recap.treasure, recap.trails) }
            : null,
        )
        .catch(() => null),
    ),
  );

  const usable = loaded.filter((entry): entry is DayStandings => entry !== null && entry.standings.length > 0);

  return {
    rows: allTimeTable(usable),
    daysCounted: usable.length,
    daysMissing: days.length - usable.length,
  };
}
