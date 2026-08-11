interface HudStat {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}

interface HuntHudProps {
  stats: HudStat[];
}

export function HuntHud({ stats }: HuntHudProps) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-card border-2 border-ink px-4 py-3 shadow-hard-xs ${
            stat.emphasis ? "bg-amber" : "bg-paper-raised"
          }`}
        >
          <dt className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{stat.label}</dt>
          <dd className="num mt-1.5 font-display text-xl font-medium leading-none">{stat.value}</dd>
          {stat.hint ? (
            <p className="mt-1.5 text-[10px] leading-tight text-ink-soft">{stat.hint}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
