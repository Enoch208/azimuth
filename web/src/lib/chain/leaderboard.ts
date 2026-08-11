import { AZIMUTH_ABI } from "@/lib/chain/azimuth-abi";
import { DEPLOY_BLOCK } from "@/lib/chain/config";
import { getEventsChunked } from "@/lib/chain/logs";
import { loadCallsigns } from "@/lib/chain/callsigns";

export interface HunterStanding {
  hunter: string;
  callsign: string | null;
  vaultsFound: number;
  bountyWon: number;
}

export async function loadLeaderboard(): Promise<HunterStanding[]> {
  const logs = await getEventsChunked(AZIMUTH_ABI, "VaultSettled", {}, DEPLOY_BLOCK);

  const byHunter = new Map<string, HunterStanding>();
  for (const log of logs) {
    const args = log.args as unknown as { finder: string; bounty: bigint };
    if (!args.finder) continue;
    const key = args.finder.toLowerCase();
    const current = byHunter.get(key) ?? { hunter: args.finder, callsign: null, vaultsFound: 0, bountyWon: 0 };
    current.vaultsFound += 1;
    current.bountyWon += Number(args.bounty);
    byHunter.set(key, current);
  }

  const standings = [...byHunter.values()].sort(
    (a, b) => b.vaultsFound - a.vaultsFound || b.bountyWon - a.bountyWon,
  );

  const names = await loadCallsigns(standings.map((s) => s.hunter)).catch(() => new Map());
  return standings.map((s) => ({ ...s, callsign: names.get(s.hunter.toLowerCase()) ?? null }));
}
