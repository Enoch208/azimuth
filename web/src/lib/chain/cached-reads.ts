import { cache } from "react";
import { currentDay, huntSummary } from "@/lib/chain/daily-client";
import { loadPlacings } from "@/lib/chain/daily-stats";
import { loadRecapOrLatest } from "@/lib/chain/recap";
import { loadLeaderboard } from "@/lib/chain/leaderboard";

export const getToday = cache(currentDay);
export const getRecap = cache(loadRecapOrLatest);

export const getHuntBoard = cache(async (day: number) => {
  const [summary, yesterday] = await Promise.all([
    huntSummary(day),
    loadPlacings(day - 1).catch(() => []),
  ]);
  return { hunters: summary.hunters, yesterday };
});

// Revealed days never change, so the table only needs rebuilding as new ones
// open. Deduped per request like the rest; the route's revalidate carries the
// caching across requests.
export const getLeaderboard = cache(loadLeaderboard);
