"use client";

import Link from "next/link";
import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { shortenAddress } from "@/lib/chain/callsigns";
import { useHunter } from "@/lib/use-hunter";
import type { Leaderboard } from "@/lib/chain/leaderboard";

interface LeaderboardScreenProps {
  board: Leaderboard;
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        {label}
      </div>
      <div className="num mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

export function LeaderboardScreen({ board }: LeaderboardScreenProps) {
  const { address } = useHunter();

  if (board.rows.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
        <KeeperMascot state="idle" size="lg" className="mx-auto" />
        <h1 className="mt-6 font-display text-4xl font-medium tracking-tight">No standings yet</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          The table fills in as maps open. Every day you hunt counts toward it, whether or not you
          find the treasure.
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="overflow-hidden rounded-panel border-2 border-ink bg-ink text-paper shadow-hard-lg">
        <div className="flex flex-wrap items-center gap-5 px-5 py-7 sm:px-8">
          <KeeperMascot state="sealed" size="md" className="-my-2 hidden sm:block" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
              All-time standings
            </p>
            <h1 className="mt-2 font-display text-[clamp(1.9rem,5vw,3rem)] font-medium leading-[0.98] tracking-[-0.035em]">
              Every map that opened
            </h1>
            <p className="num mt-2 text-xs text-paper/60">
              {board.daysCounted} {board.daysCounted === 1 ? "day" : "days"} counted
              {board.daysMissing > 0 ? ` · ${board.daysMissing} not readable yet` : ""}
            </p>
          </div>
        </div>
      </header>

      <ol className="mt-6 flex flex-col gap-2">
        {board.rows.map((row) => {
          const mine = address && row.hunter.toLowerCase() === address.toLowerCase();
          return (
            <li
              key={row.hunter}
              className={`lift grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-card border-2 border-ink p-4 shadow-hard-xs sm:grid-cols-[3rem_minmax(0,1fr)_auto] ${
                mine ? "bg-gold" : "bg-paper-raised"
              }`}
            >
              <span className="num font-display text-2xl font-medium">#{row.rank}</span>

              <div className="min-w-0">
                <div className="num truncate text-sm font-semibold">
                  {row.callsign ?? shortenAddress(row.hunter)}
                  {mine ? " · you" : ""}
                </div>
                <div className="num text-[11px] text-ink-soft">
                  {row.points} pts · {row.daysPlayed} {row.daysPlayed === 1 ? "day" : "days"}
                </div>
              </div>

              {/* Unknown values are omitted rather than shown as zeroes. */}
              <div className="col-span-2 grid grid-cols-3 gap-4 border-t-2 border-paper-sunk pt-3 sm:col-span-1 sm:border-t-0 sm:pt-0">
                <Cell label="Treasures" value={row.treasures > 0 ? String(row.treasures) : "—"} />
                <Cell
                  label="Best find"
                  value={row.bestFind !== null ? `${row.bestFind} digs` : "—"}
                />
                <Cell label="Best day" value={row.bestRank !== null ? `#${row.bestRank}` : "—"} />
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-xs leading-relaxed text-ink-faint">
        Points come from each finished day: a find pays more the fewer digs it took, and a miss pays
        by how close you got. Only maps that have opened can appear here.
      </p>
    </div>
  );
}
