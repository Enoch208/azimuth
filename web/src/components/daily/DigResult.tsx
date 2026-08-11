"use client";

import { useState } from "react";
import { RevealCountdown } from "@/components/daily/RevealCountdown";
import { DIGS, TEMPERATURES, huntNumber, isFound, shareText, type Dig } from "@/lib/daily";

interface DigResultProps {
  day: number;
  digs: Dig[];
}

export function DigResult({ day, digs }: DigResultProps) {
  const [copied, setCopied] = useState(false);
  const won = isFound(digs);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText(day, digs));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      className={`overflow-hidden rounded-panel border-2 border-ink shadow-hard-lg ${won ? "bg-ink text-paper" : "bg-paper-deep"}`}
    >
      <div className="px-5 py-6 sm:px-7 sm:py-8">
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${won ? "text-gold" : "text-ink-faint"}`}
        >
          Azimuth #{huntNumber(day)}
        </p>
        <h2 className="animate-strike mt-2 font-display text-[clamp(2rem,5.5vw,3.5rem)] font-medium leading-[0.95] tracking-[-0.03em]">
          {won ? "💎 Found" : "Out of digs"}
        </h2>
        <p className={`mt-3 text-sm leading-relaxed ${won ? "text-paper/75" : "text-ink-soft"}`}>
          {won
            ? `You found today's treasure in ${digs.length} ${digs.length === 1 ? "dig" : "digs"}.`
            : `You used all ${DIGS} digs. The treasure is still out there until the map opens.`}
        </p>

        <div className="num mt-5 flex flex-wrap items-center gap-2 text-2xl">
          {digs.map((entry, index) => (
            <span
              key={index}
              title={entry.temperature === null ? "Still arriving" : TEMPERATURES[entry.temperature].label}
            >
              {entry.temperature === null ? "⬛" : TEMPERATURES[entry.temperature].share}
            </span>
          ))}
        </div>

        <div
          className={`mt-6 rounded-card border-2 px-4 py-3 ${won ? "border-paper/25 bg-paper/10" : "border-ink bg-paper-raised"}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">
            🔒 Your result is sealed
          </p>
          <p className={`mt-1.5 text-xs leading-relaxed ${won ? "text-paper/70" : "text-ink-soft"}`}>
            Nobody can see how you did — <RevealCountdown />. That is what stops the first person
            who finds it from ending the day for everyone else.
          </p>
        </div>

        <button
          type="button"
          onClick={copy}
          className={`press mt-5 inline-flex min-h-11 items-center rounded-chip border-2 border-ink px-5 text-xs font-semibold uppercase tracking-[0.12em] shadow-hard-xs ${
            won ? "bg-gold text-ink" : "bg-amber"
          }`}
        >
          {copied ? "Copied" : "Copy result"}
        </button>
      </div>
    </section>
  );
}
