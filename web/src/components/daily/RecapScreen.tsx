"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DailyMap } from "@/components/daily/DailyMap";
import { ClaimYesterday } from "@/components/daily/ClaimYesterday";
import { DIGS, TEMPERATURES, huntNumber, sectorName, type Dig } from "@/lib/daily";
import type { Recap } from "@/lib/chain/recap";

const STEP_MS = 520;

interface RecapScreenProps {
  recap: Recap;
}

export function RecapScreen({ recap }: RecapScreenProps) {
  const [selected, setSelected] = useState(0);
  const [step, setStep] = useState(0);

  const trail = recap.trails[selected];
  const digs: Dig[] = trail ? trail.digs.slice(0, step) : [];

  useEffect(() => {
    if (!trail || step >= trail.digs.length) return;
    const timer = window.setTimeout(() => setStep((current) => current + 1), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [trail, step]);

  if (!recap.revealed || !recap.treasure) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
        <h1 className="font-display text-4xl font-medium tracking-tight">The map is still sealed</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Yesterday&apos;s treasure and every hunter&apos;s trail open shortly after midnight UTC.
          Until then nobody can read them, which is the point.
        </p>
        <Link
          href="/app"
          className="press mt-6 inline-flex min-h-11 items-center rounded-chip border-2 border-ink bg-amber px-6 text-sm font-semibold uppercase tracking-[0.12em] shadow-hard-xs"
        >
          Play today&apos;s hunt
        </Link>
      </div>
    );
  }

  const finders = recap.trails.filter((row) => row.found);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="overflow-hidden rounded-panel border-2 border-ink bg-ink text-paper shadow-hard-lg">
        <div className="px-5 py-7 sm:px-8 sm:py-9">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
            Azimuth #{huntNumber(recap.day)} · the map is open
          </p>
          <h1 className="animate-strike mt-2 font-display text-[clamp(2.2rem,6vw,4rem)] font-medium leading-[0.95] tracking-[-0.035em]">
            The treasure was {sectorName(recap.treasure)}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper/70">
            {finders.length === 0
              ? "Nobody found it. The map kept its secret for a whole day."
              : `${finders.length} of ${recap.trails.length} hunters found it. Nobody could see anyone else's temperatures while the hunt was live — those are only readable now.`}
          </p>
        </div>
      </div>

      <ClaimYesterday day={recap.day} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="overflow-hidden rounded-panel border-2 border-ink bg-paper-deep shadow-hard-lg">
          <div className="flex items-center justify-between gap-4 border-b-2 border-ink px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
              {trail ? (trail.callsign ?? `${trail.hunter.slice(0, 6)}…${trail.hunter.slice(-4)}`) : "No hunters"}
            </span>
            <span className="num text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              {trail ? `${Math.min(step, trail.digs.length)} of ${trail.digs.length} digs` : ""}
            </span>
          </div>
          <div className="bg-paper-raised p-2 sm:p-4">
            <DailyMap
              digs={digs}
              pending={null}
              treasure={recap.treasure}
              disabled
              onDig={() => {}}
            />
          </div>
          <div className="border-t-2 border-ink bg-paper-raised px-4 py-3">
            <div className="num flex flex-wrap items-center gap-2 text-xl">
              {trail?.digs.slice(0, step).map((dig, index) => (
                <span key={index}>
                  {dig.temperature === null ? "⬛" : TEMPERATURES[dig.temperature].share}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Replayed from the trail this hunter left on chain. Their temperatures were sealed to
              their wallet all day and are readable now only because the map is open.
            </p>
          </div>
        </div>

        <section className="rounded-card border-2 border-ink bg-paper-raised p-5 shadow-hard-sm">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            How everyone did
          </h2>
          <ol className="mt-3 flex flex-col gap-1.5">
            {recap.trails.map((row, index) => (
              <li key={row.hunter}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(index);
                    setStep(0);
                  }}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-chip border-2 px-3 text-sm transition-colors ${
                    index === selected ? "border-ink bg-amber shadow-hard-xs" : "border-transparent hover:border-paper-sunk"
                  }`}
                >
                  <span className="num truncate">
                    {row.found ? ["🥇", "🥈", "🥉"][index] ?? "· " : "· "}{" "}
                    {row.callsign ?? `${row.hunter.slice(0, 6)}…${row.hunter.slice(-4)}`}
                  </span>
                  <span className="num shrink-0 font-semibold">
                    {row.found ? `${row.digs.length}/${DIGS}` : `X/${DIGS}`}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
