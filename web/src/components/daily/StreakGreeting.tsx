"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { useHunter } from "@/lib/use-hunter";
import { usePlayerRecord } from "@/lib/use-player-record";

// Shown once per wallet per day, when a hunter arrives. A returning player
// should be told what they are defending before they spend a dig; a first-time
// wallet should be told the rules. Either way it is one card and it goes away.
function seenKey(address: string, day: number) {
  return `azimuth:greeted:${address.toLowerCase()}:${day}`;
}

interface StreakGreetingProps {
  today: number;
}

export function StreakGreeting({ today }: StreakGreetingProps) {
  const { address, loaded } = useHunter();
  const record = usePlayerRecord(address, today);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  // Waits for the record so the card never appears saying nothing and then
  // rewrites itself once the history lands.
  useEffect(() => {
    if (!address || !loaded || !record) return;
    if (window.localStorage.getItem(seenKey(address, today))) return;
    const timer = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(timer);
  }, [address, loaded, record, today]);

  const dismiss = useCallback(() => {
    if (address) window.localStorage.setItem(seenKey(address, today), "1");
    setOpen(false);
  }, [address, today]);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("button, a[href]")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open || !record) return null;

  const returning = record.streak > 0 || record.daysPlayed > 0;
  const stats = [
    record.streak > 0
      ? { label: "Streak", value: `${record.streak} day${record.streak === 1 ? "" : "s"}` }
      : null,
    record.treasures > 0 ? { label: "Treasures", value: String(record.treasures) } : null,
    record.bestFind !== null ? { label: "Best find", value: `${record.bestFind} digs` } : null,
    record.bestRank !== null ? { label: "Best day", value: `#${record.bestRank}` } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div
      className="animate-veil fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="greeting-title"
    >
      <div
        ref={panel}
        className="animate-strike my-auto w-full max-w-sm rounded-panel border-2 border-ink bg-paper p-6 text-center shadow-hard-lg sm:p-7"
      >
        <KeeperMascot state={returning ? "warm" : "idle"} size="lg" className="mx-auto" />

        <h2
          id="greeting-title"
          className="mt-4 font-display text-[clamp(1.7rem,6vw,2.3rem)] font-medium leading-[1] tracking-[-0.03em]"
        >
          {returning ? "Welcome back, hunter" : "Welcome, hunter"}
        </h2>

        {returning ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {record.streak > 0
                ? "Hunt today to keep your streak alive. Turning up is all it takes — you do not have to find it."
                : "Your streak restarts with today's first dig."}
            </p>
            {stats.length > 0 ? (
              <dl className="mt-5 grid grid-cols-2 gap-2">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-card border-2 border-ink bg-paper-raised px-3 py-2.5 shadow-hard-xs"
                  >
                    <dt className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                      {stat.label}
                    </dt>
                    <dd className="num mt-1 font-display text-xl font-medium">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            One treasure is buried on today&apos;s map. You get six digs, and each one tells only
            you how close you are. Come back tomorrow to see where it was.
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="press rounded-chip border-2 border-ink bg-gold px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] shadow-hard-xs"
          >
            Start digging
          </button>
          <Link
            href="/app/leaderboard"
            onClick={dismiss}
            className="press inline-flex min-h-11 items-center rounded-chip border-2 border-ink bg-paper-raised px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] shadow-hard-xs"
          >
            Standings
          </Link>
        </div>
      </div>
    </div>
  );
}
