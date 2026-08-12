"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { ShareResult } from "@/components/daily/ShareResult";
import { LockIcon } from "@/components/marks/Icons";
import { TemperatureGlyph, UnreadGlyph } from "@/components/marks/TemperatureGlyph";
import { TEMPERATURES, huntNumber, secondsToReveal, type Dig } from "@/lib/daily";
import { sealedCard } from "@/lib/result-card";
import { useHunter } from "@/lib/use-hunter";
import { huntOutcome, victoryLine } from "@/lib/victory";

// Fixed rather than random so the burst is identical every time and nothing
// depends on render-time entropy.
const SPARKS = [
  { dx: "-150px", dy: "-96px", spin: "-160deg", delay: 0, size: 13, tone: "bg-gold" },
  { dx: "132px", dy: "-118px", spin: "180deg", delay: 60, size: 10, tone: "bg-teal-bright" },
  { dx: "-104px", dy: "42px", spin: "120deg", delay: 120, size: 9, tone: "bg-warmer" },
  { dx: "168px", dy: "26px", spin: "-140deg", delay: 40, size: 12, tone: "bg-gold" },
  { dx: "-60px", dy: "-152px", spin: "200deg", delay: 180, size: 8, tone: "bg-paper" },
  { dx: "74px", dy: "-166px", spin: "-110deg", delay: 100, size: 11, tone: "bg-gold" },
  { dx: "-182px", dy: "-30px", spin: "150deg", delay: 220, size: 9, tone: "bg-teal-bright" },
  { dx: "196px", dy: "-70px", spin: "-190deg", delay: 150, size: 10, tone: "bg-warmer" },
  { dx: "22px", dy: "-186px", spin: "130deg", delay: 260, size: 8, tone: "bg-paper" },
  { dx: "-128px", dy: "-160px", spin: "-170deg", delay: 300, size: 11, tone: "bg-gold" },
];

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const REDUCED = "(prefers-reduced-motion: reduce)";

// Read as an external store rather than in an effect, so the first paint is
// already correct and the server render has a defined answer.
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

interface VictoryOverlayProps {
  day: number;
  digs: Dig[];
  onClose: () => void;
}

export function VictoryOverlay({ day, digs, onClose }: VictoryOverlayProps) {
  const panel = useRef<HTMLDivElement>(null);
  const outcome = huntOutcome(digs);
  const { address, callsign } = useHunter();

  // Shared straight from the climax, and still sealed: no rank, no distance,
  // nothing that would help anyone else find today's treasure.
  const makeCard = () =>
    sealedCard({
      day,
      address: address ?? "",
      callsign,
      found: true,
      digsUsed: outcome.digsUsed,
      trail: outcome.trail,
      secondsToReveal: secondsToReveal(),
    });
  // The Keeper celebrates, then locks itself — the animation says what the
  // sealed copy says, at the moment the copy appears. With motion reduced it
  // arrives already sealed instead of performing the beat.
  const calm = usePrefersReducedMotion();
  const [settled, setSettled] = useState(false);
  const guarding = calm || settled;

  useEffect(() => {
    if (calm) return;
    const timer = window.setTimeout(() => setSettled(true), 2200);
    return () => window.clearTimeout(timer);
  }, [calm]);

  // Own the focus while we are covering the board, and hand it back on exit.
  useEffect(() => {
    const restoreTo = document.activeElement as HTMLElement | null;
    const node = panel.current;
    node?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const targets = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (targets.length === 0) return;
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreTo?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="animate-veil fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
    >
      <div
        ref={panel}
        className="animate-strike relative my-auto w-full max-w-lg rounded-panel border-2 border-ink bg-paper shadow-hard-lg"
      >
        {/* Sparks burst from behind the Keeper, never over the copy. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-visible" aria-hidden="true">
          <div className="absolute left-1/2 top-24">
            {!calm &&
              SPARKS.map((spark, index) => (
                <span
                  key={index}
                  className={`animate-spark absolute block rounded-[2px] border-2 border-ink ${spark.tone}`}
                  style={
                    {
                      width: spark.size,
                      height: spark.size,
                      animationDelay: `${spark.delay}ms`,
                      "--dx": spark.dx,
                      "--dy": spark.dy,
                      "--spin": spark.spin,
                    } as React.CSSProperties
                  }
                />
              ))}
          </div>
        </div>

        <div className="relative px-6 pb-7 pt-8 sm:px-8">
          <div className="flex justify-center">
            <KeeperMascot state={guarding ? "sealed" : "found"} size="lg" />
          </div>

          <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-faint">
            Azimuth #{huntNumber(day)}
          </p>

          <h2
            id="victory-title"
            className="mt-2 text-center font-display text-[clamp(2rem,7vw,3.1rem)] font-medium leading-[0.95] tracking-[-0.035em]"
          >
            Treasure found!
          </h2>

          <p className="num mt-3 text-center text-base font-medium text-ink-soft">
            {victoryLine(digs)}
          </p>

          <ol className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Your dig trail">
            {outcome.trail.map((temperature, index) => (
              <li
                key={index}
                className="flex size-11 items-center justify-center rounded-[8px] border-2 border-ink text-ink shadow-hard-xs"
                style={{
                  background:
                    temperature === null
                      ? "var(--color-paper-sunk)"
                      : TEMPERATURES[temperature].fill,
                }}
                title={temperature === null ? "Still arriving" : TEMPERATURES[temperature].label}
              >
                {temperature === null ? (
                  <UnreadGlyph className="size-5" />
                ) : (
                  <TemperatureGlyph temperature={temperature} className="size-5" />
                )}
                <span className="sr-only">
                  {temperature === null ? "Still arriving" : TEMPERATURES[temperature].label}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-card border-2 border-ink bg-ink px-4 py-3.5 text-paper">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
              <LockIcon className="size-4 shrink-0" strokeWidth={2.2} />
              Your result is sealed
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-paper/70">
              Nobody else knows you found it. Today&apos;s rankings open after the reveal.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {address ? <ShareResult makeCard={makeCard} /> : null}
            <button
              type="button"
              onClick={onClose}
              className="press rounded-chip border-2 border-ink bg-paper-raised px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] shadow-hard-xs"
            >
              View my trail
            </button>
            <Link
              href="/app/recap"
              className="press inline-flex min-h-11 items-center rounded-chip border-2 border-ink bg-paper-raised px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] shadow-hard-xs"
            >
              See yesterday
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
