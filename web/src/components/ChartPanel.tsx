import { ChartField } from "@/components/ChartField";

const OUTCOME_LEGEND = [
  { swatch: "bg-warmer", label: "Warmer", note: "public" },
  { swatch: "bg-colder", label: "Colder", note: "public" },
];

export function ChartPanel() {
  return (
    <figure className="rounded-panel border-2 border-ink bg-paper-deep shadow-hard-lg">
      <div className="flex items-center justify-end border-b-2 border-ink px-4 py-2.5">
        <span className="num text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          64 × 64 · 4,096 cells
        </span>
      </div>

      <div className="p-3 sm:p-5">
        <ChartField className="w-full" />
      </div>

      <figcaption className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t-2 border-ink px-4 py-3">
        {OUTCOME_LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-2">
            <span className={`size-3 rounded-[3px] border-2 border-ink ${item.swatch}`} />
            <span className="text-xs font-medium">{item.label}</span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              {item.note}
            </span>
          </span>
        ))}

        <span className="flex items-center gap-2">
          <svg viewBox="0 0 22 8" className="h-2 w-6" aria-hidden="true">
            <line
              x1="0"
              y1="4"
              x2="15"
              y2="4"
              stroke="var(--color-amber-deep)"
              strokeWidth="2.4"
              strokeDasharray="4 2.6"
              strokeLinecap="round"
            />
            <path d="M 15 1 L 21 4 L 15 7 Z" fill="var(--color-amber-deep)" />
          </svg>
          <span className="text-xs font-medium">Bearing</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            your wallet only
          </span>
        </span>
      </figcaption>
    </figure>
  );
}
