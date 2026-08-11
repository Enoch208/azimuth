import { AZIMUTH_ADDRESS, explorerAddress } from "@/lib/chain/config";

interface ChainOfflineProps {
  reason: string;
}

export function ChainOffline({ reason }: ChainOfflineProps) {
  return (
    <section id="vaults" className="border-b-2 border-ink">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl rounded-card border-2 border-ink bg-paper-raised p-7 shadow-hard-sm">
          <h2 className="font-display text-2xl font-medium tracking-tight">
            Base Sepolia is not answering
          </h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            The vault list is read live from the contract, so there is nothing to show until the
            network responds. Nothing is cached and nothing is invented — reload to try again.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-chip border-2 border-paper-sunk bg-paper p-4 font-mono text-xs text-ink-soft">
            {reason}
          </pre>
          <a
            href={explorerAddress(AZIMUTH_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="press mt-6 inline-flex rounded-chip border-2 border-ink bg-paper px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] shadow-hard-xs"
          >
            View contract on Basescan
          </a>
        </div>
      </div>
    </section>
  );
}
