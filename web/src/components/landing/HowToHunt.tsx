import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { TemperatureGlyph } from "@/components/marks/TemperatureGlyph";
import { DIGS, FIELD, TEMPERATURES, type Temperature } from "@/lib/daily";

// Coldest to warmest, which is the order a hunter learns them in.
const LADDER: Temperature[] = [5, 4, 3, 2, 1, 0];

const BEATS = [
  { n: "01", title: "Six digs", line: `Pick any tile on the ${FIELD}×${FIELD} map.` },
  { n: "02", title: "Follow the heat", line: "Every dig tells you how close you are — and only you." },
  { n: "03", title: "Find the treasure", line: "Fewer digs is a stronger result." },
  { n: "04", title: "Come back tomorrow", line: "The map opens and every hidden trail turns public." },
];

export function HowToHunt() {
  return (
    <section id="how" className="border-b-2 border-ink bg-paper-deep">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-faint">
              How to hunt
            </p>
            <h2 className="mt-2 max-w-2xl font-display text-[clamp(1.9rem,4.6vw,3.2rem)] font-medium leading-[0.98] tracking-[-0.035em]">
              Six digs. Every one tells you how close.
            </h2>
          </div>
          <KeeperMascot state="idle" size="md" className="hidden sm:block" />
        </div>

        {/* The ladder does the teaching. It is the same glyph set and the same
            fills the board uses, so the rules are learned on the real thing. */}
        <div className="mt-9 overflow-hidden rounded-panel border-2 border-ink bg-paper-raised shadow-hard">
          <div className="flex items-center justify-between gap-4 border-b-2 border-ink px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
              What a dig tells you
            </span>
            <span className="num text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              Colder → warmer
            </span>
          </div>

          <ol className="flex items-stretch gap-2 overflow-x-auto p-3 sm:gap-3 sm:p-5">
            {LADDER.map((temperature) => (
              <li key={temperature} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span
                  className="flex aspect-square w-full max-w-[4.5rem] items-center justify-center rounded-[10px] border-2 border-ink text-ink shadow-hard-xs"
                  style={{ background: TEMPERATURES[temperature].fill }}
                >
                  <TemperatureGlyph temperature={temperature} className="size-[55%]" />
                </span>
                <span className="text-center text-[9px] font-semibold uppercase tracking-[0.08em] sm:text-[11px] sm:tracking-[0.12em]">
                  {TEMPERATURES[temperature].label}
                </span>
              </li>
            ))}
          </ol>

          <p className="border-t-2 border-ink bg-paper-deep px-4 py-3 text-xs leading-relaxed text-ink-soft sm:px-5">
            Freezing is the far side of the map. Found is the treasure itself. Nobody else can read
            your answers while the hunt is live.
          </p>
        </div>

        {/* Beats, not cards: a number, a label, a line, separated by rules. */}
        <ol className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {BEATS.map((beat) => (
            <li key={beat.n} className="border-t-2 border-ink pt-4">
              <span className="num text-[11px] font-semibold tracking-[0.14em] text-amber-deep">
                {beat.n}
              </span>
              <h3 className="mt-1.5 font-display text-xl font-medium tracking-tight">
                {beat.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{beat.line}</p>
            </li>
          ))}
        </ol>

        <p className="num mt-8 text-xs text-ink-faint">
          Everyone hunts the same treasure each day. {DIGS} digs, one map, fewest digs wins.
        </p>
      </div>
    </section>
  );
}
