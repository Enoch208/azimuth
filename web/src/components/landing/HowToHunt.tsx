import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { TemperatureGlyph } from "@/components/marks/TemperatureGlyph";
import { CrosshairIcon, SealIcon, TimerIcon } from "@/components/marks/Icons";
import { DIGS, FIELD, TEMPERATURES, type Temperature } from "@/lib/daily";

// Coldest to warmest, the order a hunter learns them in.
const LADDER: Temperature[] = [5, 4, 3, 2, 1, 0];

const STEPS = [
  {
    index: "01",
    title: "Dig",
    chip: `${DIGS} a day`,
    Icon: CrosshairIcon,
    body: `Pick any tile on the ${FIELD}×${FIELD} map. The contract measures how far it is from coordinates it cannot read, and answers with one word.`,
    outcome: "Everyone can see where you dug. That part was never a secret.",
    tokens: [
      { label: "Burning", className: "bg-warmer text-paper" },
      { label: "Freezing", className: "bg-paper-sunk text-ink-soft" },
    ],
    tilt: "lg:-rotate-[0.9deg]",
    lift: "",
    shadow: "shadow-hard-sm",
  },
  {
    index: "02",
    title: "Follow the heat",
    chip: "Yours alone",
    Icon: SealIcon,
    body: "Your answer is decrypted to your wallet and nobody else's. Six digs, each one narrowing the map, with nothing to copy from the hunter beside you.",
    outcome: "Rivals see that you dug. They never see what it told you.",
    tokens: [{ label: "Encrypted to your wallet", className: "bg-amber text-ink" }],
    tilt: "",
    lift: "lg:-translate-y-10",
    shadow: "shadow-hard-lg",
  },
  {
    index: "03",
    title: "Come back tomorrow",
    chip: "Midnight",
    Icon: TimerIcon,
    body: "At midnight UTC the map opens. The treasure, every hunter's trail and the day's standings become readable at once — including yours.",
    outcome: "Fewer digs is a stronger result. Miss it and how close you got still counts.",
    tokens: [{ label: "Treasure found", className: "bg-teal text-paper" }],
    tilt: "lg:rotate-[0.9deg]",
    lift: "",
    shadow: "shadow-hard-sm",
  },
];

export function HowToHunt() {
  return (
    <section id="how" className="border-b-2 border-ink bg-teal text-paper">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:pb-28">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-center sm:justify-between sm:gap-12">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              How a hunt works
            </h2>
            <p className="mt-4 text-base leading-relaxed text-paper">
              Six digs on one map that everybody shares. Every dig tells you how close you are, and
              tells nobody else. That gap is the game.
            </p>
          </div>
          <KeeperMascot state="idle" size="lg" className="self-center" />
        </div>

        {/* The ladder, in the board's own glyphs and fills, so the rule is
            learned on the real thing rather than an illustration of it. */}
        <div className="mt-12 overflow-hidden rounded-card border-2 border-ink bg-paper-raised text-ink shadow-hard">
          <div className="flex items-center justify-between gap-4 border-b-2 border-ink px-5 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
              What a dig tells you
            </span>
            <span className="num text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              Colder → warmer
            </span>
          </div>
          <ol className="flex items-stretch gap-2 p-4 sm:gap-3 sm:p-5">
            {LADDER.map((temperature) => (
              <li key={temperature} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span
                  className="flex aspect-square w-full max-w-[4.5rem] items-center justify-center rounded-[10px] border-2 border-ink shadow-hard-xs"
                  style={{ background: TEMPERATURES[temperature].fill }}
                >
                  <TemperatureGlyph temperature={temperature} className="size-[55%]" />
                </span>
                <span className="text-center text-[9px] font-semibold uppercase tracking-[0.06em] sm:text-[11px] sm:tracking-[0.12em]">
                  {TEMPERATURES[temperature].label}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <ol className="mt-12 grid gap-7 lg:grid-cols-3 lg:gap-6">
          {STEPS.map((step) => (
            <li
              key={step.index}
              className={`flex flex-col rounded-card border-2 border-ink bg-paper-raised p-6 text-ink ${step.shadow} ${step.tilt} ${step.lift} sm:p-7`}
            >
              <div className="flex items-start justify-between gap-4">
                <step.Icon className="size-14 text-ink" strokeWidth={1.5} />
                <span className="num -rotate-2 rounded-chip border-2 border-ink bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                  {step.chip}
                </span>
              </div>

              <div className="mt-7 flex items-baseline gap-3">
                <span className="num text-xs font-semibold tracking-[0.2em] text-ink-faint">
                  {step.index}
                </span>
                <h3 className="font-display text-2xl font-medium tracking-tight">{step.title}</h3>
              </div>

              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">{step.body}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {step.tokens.map((token) => (
                  <span
                    key={token.label}
                    className={`rounded-chip border-2 border-ink px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${token.className}`}
                  >
                    {token.label}
                  </span>
                ))}
              </div>

              <p className="mt-5 border-t-2 border-dashed border-paper-sunk pt-4 text-xs leading-relaxed text-ink-faint">
                {step.outcome}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
