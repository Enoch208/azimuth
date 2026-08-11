import { ChainOffline } from "@/components/ChainOffline";
import { KeeperPing } from "@/components/KeeperPing";
import { VaultRow } from "@/components/VaultRow";
import { loadActiveVaults } from "@/lib/chain/vault-source";

export const revalidate = 15;

export default async function VaultsDashboard() {
  const load = await loadActiveVaults();

  if (!load.ok) return <ChainOffline reason={load.reason} />;

  const pool = load.vaults.reduce((sum, vault) => sum + vault.bounty, 0);

  return (
    <div className="px-5 py-10 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            Open vaults
          </span>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {load.vaults.length} hunts running
          </h1>
          <p className="mt-3 max-w-md text-sm text-ink-soft">
            Every vault runs on its own clock. Pick one and start probing — no lobby, no waiting.
          </p>
        </div>
        <div className="num shrink-0 rounded-card border-2 border-ink bg-paper-raised px-5 py-3 shadow-hard-xs">
          <div className="font-display text-2xl font-medium leading-none">
            {pool.toLocaleString("en-US")}
          </div>
          <div className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            AZ in open bounties
          </div>
        </div>
      </div>

      <div className="mt-10 border-b border-line/0">
        {load.vaults.map((vault) => (
          <VaultRow key={vault.id} vault={vault} referenceNow={load.chainTime} />
        ))}
      </div>

      <KeeperPing activeVaults={load.vaults.length} />
    </div>
  );
}
