import { LeaderboardScreen } from "@/components/daily/LeaderboardScreen";
import { getLeaderboard, getToday } from "@/lib/chain/cached-reads";
import type { Leaderboard } from "@/lib/chain/leaderboard";

export const revalidate = 300;

export default async function LeaderboardPage() {
  const today = await getToday();
  const board = await getLeaderboard(today).catch(
    (): Leaderboard => ({ rows: [], daysCounted: 0, daysMissing: 0 }),
  );
  return <LeaderboardScreen board={board} />;
}
