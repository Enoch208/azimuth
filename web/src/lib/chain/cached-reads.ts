import { cache } from "react";
import { currentDay, huntSummary } from "@/lib/chain/daily-client";
import { loadPlacings } from "@/lib/chain/daily-stats";
import { dugOn, loadRecapOrLatest } from "@/lib/chain/recap";
import { loadLeaderboard } from "@/lib/chain/leaderboard";

export const getToday = cache(currentDay);
export const getRecap = cache(loadRecapOrLatest);

export const getHuntBoard = cache(async (day: number) => {
  const [summary, yesterday, digs] = await Promise.all([
    huntSummary(day),
    loadPlacings(day - 1).catch(() => []),
    // Rival dig locations are public the instant they land. Loaded here so the
    // board arrives already drawn, and cached with everything else on the page.
    dugOn(day).catch(() => []),
  ]);
  return {
    hunters: summary.hunters,
    yesterday,
    digs: digs.map((row) => ({ hunter: row.hunter, x: row.x, y: row.y })),
  };
});

// Revealed days never change, so the table only needs rebuilding as new ones
// open. Deduped per request like the rest; the route's revalidate carries the
// caching across requests.
export const getLeaderboard = cache(loadLeaderboard);
