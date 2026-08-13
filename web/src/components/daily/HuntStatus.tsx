"use client";

import { RevealCountdown } from "@/components/daily/RevealCountdown";
import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { keeperStateFor } from "@/components/mascot/keeper-state";
import { LockIcon } from "@/components/marks/Icons";
import { DIGS, huntNumber, type Dig } from "@/lib/daily";
import { HUNT_STATE_LABEL, digsRemaining, huntStateFor, isSealed } from "@/lib/hunt-state";
import { usePlayerRecord } from "@/lib/use-player-record";
import { useHunter } from "@/lib/use-hunter";

// The player's status, beside the board rather than in the app chrome. It reads
// the same digs the board is playing with, so it can never drift from it.
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="num font-medium">{value}</span>
    </div>
  );
}

interface HuntStatusProps {
  day: number;
  digs: Dig[];
  pending: boolean;
  hunters: number | null;
}

export function HuntStatus({ day, digs, pending, hunters }: HuntStatusProps) {
  const { address, callsign } = useHunter();
  const record = usePlayerRecord(address, day);

  const state = huntStateFor(digs);
  const sealed = isSealed(state);
  const keeper = keeperStateFor({ digs, pending, sealed });

  const hasRecord =
    record && (record.streak > 0 || record.treasures > 0 || record.bestFind !== null);

  return (
    <section className="rounded-card border-2 border-ink bg-paper-raised p-5 shadow-hard-sm">
      <div className="flex items-center gap-3">
        <KeeperMascot state={keeper} size="sm" className="-my-2 w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            Azimuth #{huntNumber(day)}
          </h2>
          <p className="num truncate text-sm font-semibold">
            {address ? HUNT_STATE_LABEL[state] : "Not started"}
          </p>
          {address ? (
            <p className="num truncate text-[11px] text-ink-faint">
              {callsign ?? `${address.slice(0, 6)}…${address.slice(-4)}`}
            </p>
          ) : null}
        </div>
      </div>

      {/* On mobile this card sits under the board, where the chips above the
          fold have already said all three. Shown from lg, where the chips are
          hidden and this is the only place they appear. */}
      <div className="mt-4 hidden flex-col gap-2 border-t-2 border-paper-sunk pt-4 lg:flex">
        <Row label="Digs left" value={`${digsRemaining(digs)} / ${DIGS}`} />
        <Row label="Hunters" value={hunters ?? "—"} />
        <Row label="Opens in" value={<RevealCountdown className="num" />} />
      </div>

      {/* Unknown history is omitted rather than shown as a zero. */}
      {hasRecord ? (
        <div className="mt-4 flex flex-col gap-2 border-t-2 border-paper-sunk pt-4">
          {record.streak > 0 ? (
            <Row label="Streak" value={`${record.streak} day${record.streak === 1 ? "" : "s"}`} />
          ) : null}
          {record.treasures > 0 ? <Row label="Treasures" value={record.treasures} /> : null}
          {record.bestFind !== null ? (
            <Row label="Best find" value={`${record.bestFind} digs`} />
          ) : null}
          {record.bestRank !== null ? <Row label="Best rank" value={`#${record.bestRank}`} /> : null}
        </div>
      ) : null}

      {sealed ? (
        <p className="mt-4 flex items-center gap-2 rounded-chip border-2 border-ink bg-gold px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
          <LockIcon className="size-3.5 shrink-0" strokeWidth={2.4} />
          Result sealed until reveal
        </p>
      ) : null}
    </section>
  );
}
