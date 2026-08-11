"use client";

import { HuntDemo, useHuntLoop } from "@/components/HuntDemo";
import { KeeperReaction } from "@/components/KeeperReaction";
import { AzimuthMark } from "@/components/marks/AzimuthMark";
import { SketchUnderline } from "@/components/marks/SketchUnderline";
import { FRAMES } from "@/lib/hunt-script";

const TONE = {
  warmer: "text-warmer",
  colder: "text-colder",
  found: "text-teal",
} as const;

export function Hero() {
  const { frame, cycle, tick } = useHuntLoop();
  const progress = ((tick % FRAMES.length) + 1) / FRAMES.length;

  return (
    <section id="top" className="grid-field relative overflow-hidden border-b-2 border-ink">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-14 lg:py-20">
        <div className="animate-rise">
          <div className="flex items-center gap-3">
            <AzimuthMark className="size-7 text-ink" />
            <span className="font-display text-sm font-medium tracking-[0.34em]">AZIMUTH</span>
          </div>

          <h1 className="mt-8 font-display text-[clamp(2.6rem,7.6vw,5.6rem)] font-medium leading-[0.94] tracking-[-0.045em]">
            Find what
            <br />
            nobody
            <span className="relative inline-block">
              can see.
              <SketchUnderline className="absolute -bottom-3 left-0 h-3.5 w-full text-amber sm:-bottom-4 sm:h-5" />
            </span>
          </h1>

          <p className="mt-7 max-w-lg text-lg leading-relaxed text-ink-soft">
            Coordinates generated encrypted on Base that nobody can read while the hunt runs. You
            find them by asking the contract questions it answers without revealing the answer —
            then settlement makes them public.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="/app"
              className="press rounded-chip border-2 border-ink bg-amber px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] shadow-hard"
            >
              Open vaults
            </a>
            <a
              href="#how"
              className="press rounded-chip border-2 border-ink bg-paper-raised px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] shadow-hard-xs"
            >
              How a hunt works
            </a>
          </div>
        </div>

        <figure className="animate-rise overflow-hidden rounded-panel border-2 border-ink bg-paper-deep shadow-hard-lg [animation-delay:120ms]">
          <div className="flex items-center justify-between gap-4 border-b-2 border-ink px-4 py-2.5">
            <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
              <span className="size-2 rounded-full bg-warmer" />
              Hunt replay
            </span>
            <span className="num text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              64 × 64 · 4,096 cells
            </span>
          </div>

          <div className="h-[3px] bg-paper-sunk">
            <div
              className="h-full bg-amber transition-[width] duration-500 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <HuntDemo frame={frame} cycle={cycle} tick={tick} className="w-full" />

          <figcaption className="flex items-center gap-4 border-t-2 border-ink bg-paper-raised px-4 py-3">
            <KeeperReaction mood={frame.mood} className="w-[4.5rem] sm:w-[5.5rem]" />
            <div className="min-w-0">
              <div
                className={`font-display text-xl font-medium leading-none tracking-tight sm:text-2xl ${
                  frame.outcome ? TONE[frame.outcome] : "text-ink"
                }`}
              >
                {frame.title}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{frame.note}</p>
            </div>
          </figcaption>
        </figure>
      </div>

      <p className="relative z-10 mx-auto max-w-7xl px-5 pb-10 text-xs text-ink-faint sm:px-8">
        A recorded hunt, looping. Real hunts run on Base with coordinates encrypted by Inco
        Lightning.
      </p>
    </section>
  );
}
