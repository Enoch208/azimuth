import { AzimuthMark } from "@/components/marks/AzimuthMark";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-14 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-5">
          <AzimuthMark className="size-16 shrink-0 text-paper" />
          <div>
            <div className="font-display text-2xl font-medium tracking-[0.14em]">AZIMUTH</div>
            <p className="mt-2 font-display text-sm font-light tracking-wide text-paper/70">
              The chain knows. You hunt.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-12 gap-y-6 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-paper/50">Field</div>
            <div className="num mt-2">64 × 64 · 4,096 cells</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-paper/50">
              Confidentiality
            </div>
            <div className="mt-2">Inco Lightning</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-paper/50">Network</div>
            <div className="mt-2">Base</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
