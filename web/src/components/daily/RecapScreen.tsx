"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { DailyMap } from "@/components/daily/DailyMap";
import { ClaimYesterday } from "@/components/daily/ClaimYesterday";
import { TrailChips } from "@/components/daily/TrailChips";
import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { shortenAddress } from "@/lib/chain/callsigns";
import { DIGS, huntNumber, sectorName, type Dig } from "@/lib/daily";
import { missLine, standingsFor, type Standing } from "@/lib/standings";
import type { Recap } from "@/lib/chain/recap";

const STEP_MS = 520;

interface RecapScreenProps {
  recap: Recap;
}

function resultLine(row: Standing): string {
  if (row.found) return `Found · ${row.digsUsed} ${row.digsUsed === 1 ? "dig" : "digs"}`;
  if (row.closest === null) return "No digs";
  return missLine(row.closest);
}

export function RecapScreen({ recap }: RecapScreenProps) {
  const { address } = useAccount();
  const [selected, setSelected] = useState(0);
  const [step, setStep] = useState(0);

  const standings = useMemo(
    () => (recap.treasure ? standingsFor(recap.treasure, recap.trails) : []),
    [recap.treasure, recap.trails],
  );

  const byHunter = useMemo(
    () => new Map(recap.trails.map((trail) => [trail.hunter.toLowerCase(), trail])),
    [recap.trails],
  );

  const row = standings[selected];
  const trail = row ? byHunter.get(row.hunter.toLowerCase()) : undefined;
  const digs: Dig[] = trail ? trail.digs.slice(0, step) : [];

  const mine = address
    ? standings.find((entry) => entry.hunter.toLowerCase() === address.toLowerCase())
    : undefined;

  useEffect(() => {
    if (!trail || step >= trail.digs.length) return;
    const timer = window.setTimeout(() => setStep((current) => current + 1), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [trail, step]);

  if (!recap.revealed || !recap.treasure) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
        <KeeperMascot state="sealed" size="lg" className="mx-auto" />
        <h1 className="mt-6 font-display text-4xl font-medium tracking-tight">
          The map is still sealed
        </h1>
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

  const finders = standings.filter((entry) => entry.found);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="overflow-hidden rounded-panel border-2 border-ink bg-ink text-paper shadow-hard-lg">
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
              : `${finders.length} of ${standings.length} ${standings.length === 1 ? "hunter" : "hunters"} found it. Nobody could see anyone else's temperatures while the hunt was live — those are only readable now.`}
          </p>
        </div>
      </header>

      <ClaimYesterday day={recap.day} />

      {mine ? (
        <section className="mt-6 flex flex-wrap items-center gap-5 rounded-panel border-2 border-ink bg-paper-deep p-5 shadow-hard-sm sm:flex-nowrap sm:p-6">
          <KeeperMascot state={mine.found ? "found" : "outOfDigs"} size="md" className="-my-2" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
              Your result
            </p>
            <h2 className="mt-1.5 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              {mine.found
                ? "Treasure found"
                : mine.closest !== null && mine.closest <= 2
                  ? "So close"
                  : "The trail went cold"}
            </h2>
            <p className="num mt-2 text-sm text-ink-soft">
              {resultLine(mine)} · Daily rank #{mine.rank} · {mine.score} pts
            </p>
            <TrailChips
              trail={(byHunter.get(mine.hunter.toLowerCase())?.digs ?? []).map((d) => d.temperature)}
              size="sm"
              className="mt-4"
            />
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="mx-auto w-full max-w-[34rem] overflow-hidden rounded-panel border-2 border-ink bg-paper-deep shadow-hard-lg lg:mx-0">
          <div className="flex items-center justify-between gap-4 border-b-2 border-ink px-4 py-2.5">
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em]">
              {row ? (row.callsign ?? shortenAddress(row.hunter)) : "No hunters"}
            </span>
            <span className="num shrink-0 text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              {trail ? `${Math.min(step, trail.digs.length)} of ${trail.digs.length} digs` : ""}
            </span>
          </div>
          <div className="bg-paper-raised p-2 sm:p-4">
            <DailyMap digs={digs} pending={null} treasure={recap.treasure} disabled onDig={() => {}} />
          </div>
          <div className="border-t-2 border-ink bg-paper-raised px-4 py-3">
            <TrailChips trail={digs.map((dig) => dig.temperature)} size="sm" />
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Replayed from the trail this hunter left on chain. Their temperatures were sealed to
              their wallet all day and are readable now only because the map is open.
            </p>
          </div>
        </div>

        <section className="rounded-card border-2 border-ink bg-paper-raised p-5 shadow-hard-sm">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            Daily standings
          </h2>
          <ol className="mt-3 flex flex-col gap-1.5">
            {standings.map((entry, index) => {
              const isMine = address && entry.hunter.toLowerCase() === address.toLowerCase();
              return (
                <li key={entry.hunter}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(index);
                      setStep(0);
                    }}
                    aria-current={index === selected ? "true" : undefined}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-chip border-2 px-3 py-2 text-left transition-colors ${
                      index === selected
                        ? "border-ink bg-amber shadow-hard-xs"
                        : isMine
                          ? "border-ink bg-gold/40 hover:bg-gold/60"
                          : "border-transparent hover:border-paper-sunk"
                    }`}
                  >
                    <span className="num w-6 shrink-0 text-xs font-semibold text-ink-faint">
                      #{entry.rank}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="num block truncate text-sm font-medium">
                        {entry.callsign ?? shortenAddress(entry.hunter)}
                        {isMine ? " · you" : ""}
                      </span>
                      <span className="block truncate text-[11px] text-ink-soft">
                        {resultLine(entry)}
                      </span>
                    </span>
                    <span className="num shrink-0 text-sm font-semibold">{entry.score}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            Finders rank first, by fewest digs. Everyone else ranks by how close they ever got.
            Out of {DIGS} digs.
          </p>
        </section>
      </div>
    </div>
  );
}
