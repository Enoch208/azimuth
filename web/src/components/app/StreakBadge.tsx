"use client";

import { TemperatureGlyph } from "@/components/marks/TemperatureGlyph";
import { useHunter } from "@/lib/use-hunter";
import { usePlayerRecord } from "@/lib/use-player-record";

// The streak was only ever visible in the arrival card and the status rail, so
// a hunter who dismissed the card lost sight of the thing they are defending.
// This keeps it in front of them wherever they are in the app.
//
// It wears the board's own Burning glyph rather than a borrowed flame: this
// game already has a word for hot, and a streak is the same idea applied to
// turning up.
export function StreakBadge({ today, className = "" }: { today: number; className?: string }) {
  const { address } = useHunter();
  const record = usePlayerRecord(address, today);
  const streak = record?.streak ?? 0;

  // Nothing to defend yet. A zero is not worth a chip, and a wallet that has
  // never played should not be told it is on nothing.
  if (streak <= 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-chip border-2 border-ink bg-gold px-2.5 py-1 shadow-hard-xs ${className}`}
      title={`${streak} day streak — dig today to keep it`}
    >
      <TemperatureGlyph temperature={1} className="size-3.5 shrink-0" />
      <span className="num text-xs font-semibold leading-none">{streak}</span>
      <span className="sr-only">day streak</span>
    </span>
  );
}
