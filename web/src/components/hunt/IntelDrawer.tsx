import type { BearingRecord } from "@/lib/hunt-client";
import { BEARING_ARROW, BEARING_WORD, cellLabel } from "@/lib/types";

interface IntelDrawerProps {
  bearings: BearingRecord[];
  bearingsLeft: number;
}

export function IntelDrawer({ bearings, bearingsLeft }: IntelDrawerProps) {
  return (
    <section className="rounded-card border-2 border-ink bg-ink p-5 text-paper shadow-hard-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-paper/70">
          Private intel
        </h2>
        <span className="num text-[10px] uppercase tracking-[0.14em] text-paper/50">
          {bearingsLeft} left
        </span>
      </div>

      {bearings.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-paper/60">
          Nothing yet. A bearing is encrypted to your wallet — rivals see that you bought one, never
          which way it pointed.
        </p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3">
          {bearings.map((record, index) => (
            <li
              key={`${record.origin.x}-${record.origin.y}-${index}`}
              className="rounded-chip border border-paper/25 bg-paper/5 px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-baseline gap-2 text-gold">
                  <span className="font-display text-2xl font-medium leading-none">
                    {BEARING_ARROW[record.bearing]}
                  </span>
                  <span className="font-display text-lg font-medium leading-none">
                    {BEARING_WORD[record.bearing]}
                  </span>
                </span>
                <span className="num text-[10px] uppercase tracking-[0.14em] text-paper/50">
                  Pin {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-2 text-xs leading-relaxed text-paper/70">
                {record.bearing === "AT_TARGET" ? (
                  <>The vault is the cell you scanned from — {cellLabel(record.origin)}.</>
                ) : (
                  <>
                    The vault is {BEARING_WORD[record.bearing].toLowerCase()} of{" "}
                    <span className="num text-paper">{cellLabel(record.origin)}</span> — pin{" "}
                    {index + 1} on the board.
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
