import { VaultRow } from "@/components/VaultRow";
import type { Vault } from "@/lib/types";

interface VaultListProps {
  vaults: Vault[];
  referenceNow: number;
}

export function VaultList({ vaults, referenceNow }: VaultListProps) {
  const totalBounty = vaults.reduce((sum, vault) => sum + vault.bounty, 0);

  return (
    <section id="vaults" className="border-b-2 border-ink">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Open vaults
            </h2>
            <p className="mt-3 max-w-md text-sm text-ink-soft">
              Vaults run on their own clock. Nobody waits in a lobby — pick one and start
              probing.
            </p>
          </div>
          <dl className="flex shrink-0 rotate-[0.5deg] divide-x-2 divide-ink rounded-card border-2 border-ink bg-paper-raised shadow-hard-xs">
            <div className="px-5 py-3">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Active</dt>
              <dd className="num font-display text-2xl font-medium">{vaults.length}</dd>
            </div>
            <div className="px-5 py-3">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                Bounty pool
              </dt>
              <dd className="num font-display text-2xl font-medium">
                {totalBounty.toLocaleString("en-US")} AZ
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-10 flex flex-col gap-4">
          {vaults.map((vault) => (
            <VaultRow key={vault.id} vault={vault} referenceNow={referenceNow} />
          ))}
        </div>
      </div>
    </section>
  );
}
