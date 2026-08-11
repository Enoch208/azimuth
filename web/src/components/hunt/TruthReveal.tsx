"use client";

import { useEffect, useState } from "react";
import { HuntBoard } from "@/components/hunt/HuntBoard";
import { buildTruthReveal, formatClock } from "@/lib/chain/truth-reveal";
import type { PublicEntry } from "@/lib/chain/activity";
import type { BearingRecord, ProbeRecord } from "@/lib/hunt-client";
import { BEARING_ARROW, BEARING_WORD, cellLabel, type Coordinate } from "@/lib/types";

const STEP_MS = 850;

const TONE_CLASS: Record<string, string> = {
  warmer: "text-warmer",
  colder: "text-colder",
  found: "text-teal",
  sealed: "text-amber-deep",
  neutral: "text-ink-faint",
};

interface TruthRevealProps {
  entries: PublicEntry[];
  revealed: Coordinate;
  you?: string;
}

export function TruthReveal({ entries, revealed, you }: TruthRevealProps) {
  const timeline = buildTruthReveal(entries, revealed, you);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [intelOpen, setIntelOpen] = useState(false);

  useEffect(() => {
    if (!playing || step >= timeline.length - 1) return;
    const timer = setTimeout(() => setStep((current) => current + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, step, timeline.length]);

  const visible = timeline.slice(0, step + 1);
  const finished = step >= timeline.length - 1;
  const sealed = timeline.filter((entry) => entry.kind === "intel");

  const shownProbes: ProbeRecord[] = visible
    .filter((entry) => entry.kind === "probe" && entry.cell !== null)
    .map((entry, index) => ({
      cell: entry.cell as Coordinate,
      outcome: entry.tone === "found" ? "found" : entry.tone === "warmer" ? "warmer" : "colder",
      at: index,
    }));

  const shownBearings: BearingRecord[] = visible
    .filter((entry) => entry.kind === "intel" && entry.origin)
    .map((entry, index) => ({
      origin: entry.origin as Coordinate,
      bearing: intelOpen && entry.reconstructed ? entry.reconstructed : "AT_TARGET",
      at: index,
    }));

  return (
    <section className="overflow-hidden rounded-panel border-2 border-ink bg-paper-deep shadow-hard-lg">
      <div className="border-b-2 border-ink bg-ink px-5 py-6 text-paper">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
          Hunt closed
        </p>
        <h2 className="animate-strike mt-2 font-display text-[clamp(2rem,5vw,3.4rem)] font-medium leading-[0.95] tracking-[-0.03em]">
          The secret is out
        </h2>
        <p className="num mt-3 text-sm text-paper/70">
          The vault sat at{" "}
          <span className="font-semibold text-gold">{cellLabel(revealed)}</span> the entire time.
          Nobody could read it until someone stood on it.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-paper-raised px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (finished ? (setStep(0), setPlaying(true)) : setPlaying(!playing))}
            className="press min-h-11 rounded-chip border-2 border-ink bg-paper px-4 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-hard-xs"
          >
            {finished ? "Replay" : playing ? "Pause" : "Play"}
          </button>
          <span className="num text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            {Math.min(step + 1, timeline.length)} / {timeline.length}
          </span>
        </div>

        {sealed.length > 0 ? (
          <button
            type="button"
            onClick={() => setIntelOpen((open) => !open)}
            className={`press min-h-11 rounded-chip border-2 border-ink px-4 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-hard-xs ${
              intelOpen ? "bg-gold" : "bg-ink text-paper"
            }`}
          >
            {intelOpen ? "Hide hidden intel" : `Reveal hidden intel · ${sealed.length}`}
          </button>
        ) : null}
      </div>

      {intelOpen ? (
        <div className="border-b-2 border-ink bg-gold px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">
            What each sealed bearing actually said
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {sealed.map((entry, index) => (
              <li key={`${entry.actor}-${index}`} className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="num font-semibold">{entry.actor}</span>
                <span className="text-ink-soft">from {cellLabel(entry.origin as Coordinate)}</span>
                <span className="font-display text-lg font-medium leading-none">
                  {BEARING_ARROW[entry.reconstructed ?? "AT_TARGET"]}{" "}
                  {BEARING_WORD[entry.reconstructed ?? "AT_TARGET"]}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            Recomputed from the now-public coordinates and each scan&apos;s public origin — the same
            octant rule the contract ran. No wallet was decrypted to build this.
          </p>
        </div>
      ) : null}

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="mx-auto aspect-square w-full border-b-2 border-ink lg:max-w-[calc(100dvh-22rem)] lg:border-b-0 lg:border-r-2">
          <HuntBoard
            possible={null}
            probes={shownProbes}
            bearings={shownBearings}
            revealed={finished ? revealed : null}
            pending={null}
            mode="probe"
            busy={false}
            disabled
            onSelect={() => {}}
          />
        </div>

        <ol className="flex max-h-[34rem] flex-col overflow-y-auto bg-paper-raised">
          {visible.map((entry, index) => (
            <li
              key={`${entry.kind}-${index}`}
              className={`border-b border-paper-sunk px-4 py-3 ${
                index === visible.length - 1 ? "bg-gold/30" : ""
              }`}
            >
              <div className="flex items-baseline gap-3">
                <span className="num shrink-0 text-[11px] tabular-nums text-ink-faint">
                  {formatClock(entry.elapsedSeconds)}
                </span>
                <span
                  className={`text-sm leading-snug ${entry.isYou ? "font-semibold" : "font-medium"}`}
                >
                  {entry.headline}
                </span>
              </div>
              <div
                className={`mt-1 pl-[3.4rem] text-[10px] font-semibold uppercase tracking-[0.1em] ${
                  TONE_CLASS[entry.tone] ?? "text-ink-faint"
                }`}
              >
                {entry.detail}
                {intelOpen && entry.reconstructed ? (
                  <span className="ml-2 text-ink">
                    → {BEARING_ARROW[entry.reconstructed]} {BEARING_WORD[entry.reconstructed]}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="border-t-2 border-ink bg-paper-raised px-4 py-3 text-xs leading-relaxed text-ink-soft">
        Every line is a contract event from this round, in block order. Elapsed time is block
        distance at Base&apos;s two-second cadence.
      </p>
    </section>
  );
}

