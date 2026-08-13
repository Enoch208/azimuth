"use client";

import { useState } from "react";
import { RevealCountdown } from "@/components/daily/RevealCountdown";
import { ShareResult } from "@/components/daily/ShareResult";
import { TrailChips } from "@/components/daily/TrailChips";
import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { LockIcon } from "@/components/marks/Icons";
import {
  huntNumber,
  isFound,
  secondsToReveal,
  shareText,
  type Dig,
} from "@/lib/daily";
import { sealedCard } from "@/lib/result-card";
import { useHunter } from "@/lib/use-hunter";
import { defeatLine, huntOutcome, victoryLine } from "@/lib/victory";

interface DigResultProps {
  day: number;
  digs: Dig[];
}

export function DigResult({ day, digs }: DigResultProps) {
  const [copied, setCopied] = useState(false);
  const won = isFound(digs);
  const outcome = huntOutcome(digs);
  const { address, callsign } = useHunter();

  // Today's card is sealed by construction: it cannot carry a coordinate, a
  // rank or a distance, so posting it cannot end the day for anyone else.
  const makeCard = () =>
    sealedCard({
      day,
      address: address ?? "",
      callsign,
      found: won,
      digsUsed: outcome.digsUsed,
      trail: outcome.trail,
      secondsToReveal: secondsToReveal(),
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText(day, digs, callsign));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      className={`animate-strike overflow-hidden rounded-panel border-2 border-ink shadow-hard-lg ${won ? "bg-ink text-paper" : "bg-paper-deep"}`}
    >
      <div className="flex flex-wrap items-start gap-5 px-5 py-6 sm:flex-nowrap sm:px-7 sm:py-8">
        {/* Won, the Keeper guards a sealed result. Lost, it is as worn out as
            the player — either way it is the one delivering the news. */}
        <KeeperMascot state={won ? "sealed" : "outOfDigs"} size="md" className="-my-2 order-1" />

        <div className="min-w-0 flex-1 order-2">
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${won ? "text-gold" : "text-ink-faint"}`}
          >
            Azimuth #{huntNumber(day)}
          </p>
          <h2 className="animate-strike mt-2 font-display text-[clamp(1.9rem,5vw,3.1rem)] font-medium leading-[0.95] tracking-[-0.03em]">
            {won ? "Treasure found!" : "Digs spent"}
          </h2>
          <p className={`mt-3 text-sm leading-relaxed ${won ? "text-paper/75" : "text-ink-soft"}`}>
            {won ? victoryLine(digs) : defeatLine()}
          </p>

          <TrailChips trail={outcome.trail} className="mt-5" />

          <div
            className={`mt-6 rounded-card border-2 px-4 py-3 ${won ? "border-paper/25 bg-paper/10" : "border-ink bg-paper-raised"}`}
          >
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
              <LockIcon className="size-3.5 shrink-0" strokeWidth={2.4} />
              Your result is sealed
            </p>
            <p className={`mt-1.5 text-xs leading-relaxed ${won ? "text-paper/70" : "text-ink-soft"}`}>
              Nobody can see how you did — <RevealCountdown />. That is what stops the first person
              who finds it from ending the day for everyone else.
            </p>
          </div>

          {address ? (
            <ShareResult makeCard={makeCard} onCopyText={copy} copied={copied} className="mt-5" />
          ) : (
            <button
              type="button"
              onClick={copy}
              className={`press mt-5 inline-flex min-h-11 items-center rounded-chip border-2 border-ink px-5 text-xs font-semibold uppercase tracking-[0.12em] shadow-hard-xs ${
                won ? "bg-gold text-ink" : "bg-amber"
              }`}
            >
              {copied ? "Copied" : "Copy result"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
