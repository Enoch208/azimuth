"use client";

import Link from "next/link";
import { RevealCountdown } from "@/components/daily/RevealCountdown";
import { useHuntStatus } from "@/components/app/hunt-status";
import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { keeperStateFor } from "@/components/mascot/keeper-state";
import { LockIcon } from "@/components/marks/Icons";
import { DIGS, huntNumber } from "@/lib/daily";
import { HUNT_STATE_LABEL, digsRemaining, huntStateFor, isSealed } from "@/lib/hunt-state";
import { usePlayerRecord } from "@/lib/use-player-record";
import { useHunter } from "@/lib/use-hunter";

// A compact scoreboard, not a dashboard: four short blocks a player can read at
// a glance without looking away from the board for long.
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border-2 border-ink bg-paper-raised p-3.5 shadow-hard-xs">
      <h2 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-ink-soft">{label}</span>
      <span className="num font-semibold">{value}</span>
    </div>
  );
}

export function StatusRail() {
  const { status } = useHuntStatus();
  const { address, callsign } = useHunter();
  const record = usePlayerRecord(address, status.day);

  const state = huntStateFor(status.digs);
  const sealed = isSealed(state);
  const keeper = keeperStateFor({ digs: status.digs, pending: status.pending, sealed });

  return (
    <div className="flex flex-col gap-3">
      {/* Identity */}
      <Block title="Hunter">
        {address ? (
          <div className="mt-1.5">
            {callsign ? (
              <p className="num truncate text-sm font-semibold">{callsign}</p>
            ) : null}
            <p
              className={`num truncate ${callsign ? "text-[11px] text-ink-faint" : "text-sm font-semibold"}`}
            >
              {`${address.slice(0, 6)}…${address.slice(-4)}`}
            </p>
            {!callsign ? (
              <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
                Claim a callsign to stand out in the daily standings.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
            Connect a wallet to hunt today&apos;s map.
          </p>
        )}
      </Block>

      {/* Today */}
      <Block title="Today's hunt">
        <div className="mt-2 flex items-center gap-3">
          <KeeperMascot state={keeper} size="sm" className="-my-1 w-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="num text-sm font-semibold">
              {status.day === null ? "—" : `Azimuth #${huntNumber(status.day)}`}
            </p>
            <p className="text-[11px] text-ink-soft">
              {address ? HUNT_STATE_LABEL[state] : "Not started"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          <Row
            label="Digs left"
            value={address ? `${digsRemaining(status.digs)} / ${DIGS}` : `${DIGS} / ${DIGS}`}
          />
          <Row label="Hunters" value={status.hunters ?? "—"} />
          <Row label="Opens in" value={<RevealCountdown className="num" />} />
        </div>

        {sealed ? (
          <p className="mt-3 flex items-center gap-1.5 rounded-chip border-2 border-ink bg-gold px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em]">
            <LockIcon className="size-3 shrink-0" strokeWidth={2.6} />
            Sealed until reveal
          </p>
        ) : null}
      </Block>

      {/* Record. Unknown values are omitted rather than shown as zero. */}
      {record && (record.daysPlayed > 0 || record.streak > 0) ? (
        <Block title="Your record">
          <div className="mt-2 flex flex-col gap-1.5">
            {record.streak > 0 ? (
              <Row label="Streak" value={`${record.streak} day${record.streak === 1 ? "" : "s"}`} />
            ) : null}
            {record.treasures > 0 ? <Row label="Treasures" value={record.treasures} /> : null}
            {record.bestFind !== null ? (
              <Row label="Best find" value={`${record.bestFind} digs`} />
            ) : null}
            {record.bestRank !== null ? <Row label="Best rank" value={`#${record.bestRank}`} /> : null}
            {record.streak === 0 &&
            record.treasures === 0 &&
            record.bestFind === null &&
            record.bestRank === null ? (
              <p className="text-[11px] leading-relaxed text-ink-soft">
                Your record starts with your first dig.
              </p>
            ) : null}
          </div>
        </Block>
      ) : null}

      {/* Yesterday */}
      <Block title="Yesterday">
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
          The map opened at midnight. Every trail is public now.
        </p>
        <Link
          href="/app/recap"
          className="press mt-2.5 inline-flex min-h-11 w-full items-center justify-center rounded-chip border-2 border-ink bg-paper px-3 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-hard-xs"
        >
          View the reveal
        </Link>
      </Block>
    </div>
  );
}
