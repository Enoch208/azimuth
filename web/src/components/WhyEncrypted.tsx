import { ChartPanel } from "@/components/ChartPanel";

const TRANSPARENT_SOURCE = `struct Vault {
    uint8 x;
    uint8 y;
}`;

const CONFIDENTIAL_SOURCE = `struct Vault {
    euint256 x;
    euint256 y;
}

x = e.randBounded(64);
y = e.randBounded(64);`;

export function WhyEncrypted() {
  return (
    <section id="encrypted" className="border-b-2 border-ink bg-paper-deep">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="max-w-3xl font-display text-3xl font-medium leading-[1.15] tracking-tight sm:text-4xl">
          On a transparent contract, this game is{" "}
          <span className="relative inline-block">
            <span className="absolute inset-x-[-6px] bottom-[3px] top-[38%] -rotate-[0.6deg] bg-gold" />
            <span className="relative">over before it starts.</span>
          </span>
        </h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-card border-2 border-ink bg-paper-raised shadow-hard-sm">
            <div className="border-b-2 border-ink px-5 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                Any ordinary EVM contract
              </span>
            </div>
            <div className="p-5">
              <pre className="overflow-x-auto rounded-chip border-2 border-paper-sunk bg-paper p-4 font-mono text-[13px] leading-relaxed">
                {TRANSPARENT_SOURCE}
              </pre>
              <p className="mt-5 text-sm leading-relaxed text-ink-soft">
                The coordinates sit in public storage. One{" "}
                <span className="font-mono text-[13px]">eth_getStorageAt</span> call reads them.
                There is no hunt, only a lookup.
              </p>
            </div>
          </div>

          <div className="rounded-card border-2 border-ink bg-paper-raised shadow-hard">
            <div className="flex items-center justify-between gap-4 border-b-2 border-ink bg-amber px-5 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                AZIMUTH on Inco Lightning
              </span>
              <span className="size-2.5 rounded-full border-2 border-ink bg-paper-raised" />
            </div>
            <div className="p-5">
              <pre className="overflow-x-auto rounded-chip border-2 border-paper-sunk bg-paper p-4 font-mono text-[13px] leading-relaxed">
                {CONFIDENTIAL_SOURCE}
              </pre>
              <p className="mt-5 text-sm leading-relaxed text-ink-soft">
                The coordinates are generated encrypted, on chain, by the protocol. No deployer
                key holds the plaintext. The contract still computes distance, compares it to
                your best, and issues bearings — all against ciphertext.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center lg:gap-12">
          <div>
            <h3 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
              What one bearing buys you
            </h3>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">
              A probe answers with a single word. A bearing answers with a direction, and a
              direction eliminates geometry — one <span className="font-semibold">NE</span> reading
              from a point on the field cuts 4,096 candidate cells down to the shaded wedge. That is
              why it costs ten probes.
            </p>
            <p className="mt-8 -rotate-[0.4deg] rounded-card border-2 border-ink bg-gold p-6 text-base leading-relaxed shadow-hard">
              Every question leaves a mark. A probe answers you and every rival at once. A bearing
              answers only you — but the purchase is public, so your next move is a tell, and moving
              the wrong way on purpose is a bluff.
            </p>
          </div>

          <ChartPanel />
        </div>
      </div>
    </section>
  );
}
