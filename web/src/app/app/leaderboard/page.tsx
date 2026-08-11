import { Leaderboard } from "@/components/Leaderboard";
import { loadLeaderboard } from "@/lib/chain/leaderboard";

export const revalidate = 15;

export default async function LeaderboardPage() {
  const standings = await loadLeaderboard().catch(() => []);
  return <Leaderboard standings={standings} />;
}
