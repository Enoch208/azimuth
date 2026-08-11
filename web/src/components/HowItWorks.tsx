import { Keeper } from "@/components/Keeper";
import { BearingIcon, CrosshairIcon, SealIcon } from "@/components/marks/Icons";

const STEPS = [
  {
    index: "01",
    title: "Probe",
    cost: "2 AZ",
    Icon: CrosshairIcon,
    body: "Click a cell. The contract measures the squared distance to coordinates it cannot read, compares it against your previous best, and publishes one word.",
    outcome: "Everyone sees the result — including the hunters racing you.",
    tokens: [
      { label: "Warmer", className: "bg-warmer text-paper" },
      { label: "Colder", className: "bg-colder text-paper" },
    ],
    tilt: "lg:-rotate-[0.9deg]",
    lift: "",
    shadow: "shadow-hard-sm",
  },
  {
    index: "02",
    title: "Bearing",
    cost: "20 AZ",
    Icon: BearingIcon,
    body: "Buy a private scan from a point on the field. The answer is one of eight compass directions, encrypted so that only your wallet can decrypt it.",
    outcome: "Rivals see that you bought intel. They never see what it said.",
    tokens: [
      { label: "NE", className: "bg-amber text-ink" },
      { label: "Encrypted to your wallet", className: "bg-paper-sunk text-ink-soft" },
    ],
    tilt: "",
    lift: "lg:-translate-y-10",
    shadow: "shadow-hard-lg",
  },
  {
    index: "03",
    title: "Settle",
    cost: "Free",
    Icon: SealIcon,
    body: "Land on the exact cell. The contract verifies the hit against the ciphertext, pays the bounty, and the coordinates become readable for the first time.",
    outcome: "The trail replays from the events the hunt actually emitted.",
    tokens: [{ label: "Vault found", className: "bg-teal text-paper" }],
    tilt: "lg:rotate-[0.9deg]",
    lift: "",
    shadow: "shadow-hard-sm",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-b-2 border-ink bg-teal text-paper">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:pb-28">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-center sm:justify-between sm:gap-12">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              How a hunt works
            </h2>
            <p className="mt-4 text-base leading-relaxed text-paper">
              Three actions. Each one buys you information, and two of them hand information to
              everyone else. That trade is the game.
            </p>
          </div>
          <Keeper className="w-[200px] self-center sm:w-[230px] lg:w-[330px]" />
        </div>

        <ol className="mt-14 grid gap-7 lg:grid-cols-3 lg:gap-6">
          {STEPS.map((step) => (
            <li
              key={step.index}
              className={`flex flex-col rounded-card border-2 border-ink bg-paper-raised p-6 text-ink ${step.shadow} ${step.tilt} ${step.lift} sm:p-7`}
            >
              <div className="flex items-start justify-between gap-4">
                <step.Icon className="size-14 text-ink" strokeWidth={1.5} />
                <span className="num -rotate-2 rounded-chip border-2 border-ink bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                  {step.cost}
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
