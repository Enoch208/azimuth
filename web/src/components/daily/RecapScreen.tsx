"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DailyMap } from "@/components/daily/DailyMap";
import { ClaimYesterday } from "@/components/daily/ClaimYesterday";
import { TrailChips } from "@/components/daily/TrailChips";
import { ShareResult } from "@/components/daily/ShareResult";
import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { shortenAddress } from "@/lib/chain/callsigns";
import { DIGS, huntNumber, sectorName, type Dig } from "@/lib/daily";
import { missLine, standingsFor, type Standing } from "@/lib/standings";
import { revealedCard, revealedHeadline } from "@/lib/result-card";
import { usePlayerRecord } from "@/lib/use-player-record";
import { useHunter } from "@/lib/use-hunter";
import type { Recap } from "@/lib/chain/recap";

const STEP_MS = 520;

interface RecapScreenProps {
  recap: Recap;
  today: number;
}

function resultLine(row: Standing): string {
  if (row.found) return `Found · ${row.digsUsed} ${row.digsUsed === 1 ? "dig" : "digs"}`;
  if (row.closest === null) return "No digs";
  return missLine(row.closest);
}

export function RecapScreen({ recap, today }: RecapScreenProps) {
  const { address, callsign } = useHunter();
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

  // The card, the rail and this panel all read the same standing and the same
  // record. Nothing re-derives a rank or a streak of its own.
  const record = usePlayerRecord(address, today);
  const myTrail = mine
    ? (byHunter.get(mine.hunter.toLowerCase())?.digs ?? []).map((entry) => entry.temperature)
    : [];

  const makeCard = () =>
    revealedCard({
      day: recap.day,
      address: address ?? "",
      callsign,
      found: mine?.found ?? false,
      digsUsed: mine?.digsUsed ?? 0,
      trail: myTrail,
      rank: mine?.rank ?? 0,
      score: mine?.score ?? 0,
      closest: mine?.closest ?? null,
      streak: record?.streak ?? 0,
    });

  useEffect(() => {
    if (!trail || step >= trail.digs.length) return;
    const timer = window.setTimeout(() => setStep((current) => current + 1), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [trail, step]);

  // Open on chain but not yet readable. Distinct from sealed, and worth saying
  // plainly — the day did roll over, the reading just has not landed.
  if (recap.revealed && !recap.readable) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
        <KeeperMascot state="searching" size="lg" className="mx-auto" />
        <h1 className="mt-6 font-display text-4xl font-medium tracking-tight">
          The map is open. The reading is not.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Yesterday&apos;s map was unsealed on chain, but the network has not handed back the
          decrypted coordinates yet. Nothing is lost — the day is public and this page will fill in
          as soon as the reading arrives.
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

  if (!recap.revealed || !recap.treasure) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
        <KeeperMascot state="sealed" size="lg" className="mx-auto" />
        <h1 className="mt-6 font-display text-4xl font-medium tracking-tight">
          The map is still sealed
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Yesterday&apos;s treasure and every hunter&apos;s trail open after midnight UTC. Until
          then nobody can read them, which is the point. If they should already be open, the
          reading is still arriving — try again in a moment.
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
          {/* Showing an older day is only acceptable if it says so. */}
          {recap.day !== recap.requestedDay ? (
            <p className="mt-2 inline-flex items-center rounded-chip border-2 border-paper/25 bg-paper/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-paper/80">
              Azimuth #{huntNumber(recap.requestedDay)} is unsealed but not readable yet — showing
              the last map that opened
            </p>
          ) : null}
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
              {revealedHeadline(mine.found, mine.closest)}
            </h2>
            <p className="num mt-1.5 text-sm text-ink-soft">
              {callsign ?? shortenAddress(mine.hunter)}
              {" · "}
              {resultLine(mine)}
            </p>
            <div className="num mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
              <span className="rounded-chip border-2 border-ink bg-gold px-2.5 py-1.5">
                Rank #{mine.rank}
              </span>
              <span className="rounded-chip border-2 border-ink bg-paper-raised px-2.5 py-1.5">
                {mine.score} pts
              </span>
              {record && record.streak > 0 ? (
                <span className="rounded-chip border-2 border-ink bg-paper-raised px-2.5 py-1.5">
                  {record.streak} day streak
                </span>
              ) : null}
            </div>
            <TrailChips trail={myTrail} size="sm" className="mt-3" />
            {/* Yesterday is public, so this card may carry rank, score and how
                close the hunt came. Same standings and record the rail reads. */}
            <ShareResult makeCard={makeCard} className="mt-4" />
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
                    className={`press flex min-h-11 w-full items-center gap-3 rounded-chip border-2 px-3 py-2 text-left ${
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
