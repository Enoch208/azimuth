import type { PublicEntry } from "@/lib/chain/activity";
import { annotateAsymmetry, intelHolders } from "@/lib/chain/asymmetry";
import { BEARING_ARROW, BEARING_WORD, cellLabel } from "@/lib/types";

const TONE = {
  warmer: "text-warmer",
  colder: "text-colder",
  found: "text-teal",
} as const;

const LABEL = {
  warmer: "WARMER",
  colder: "COLDER",
  found: "VAULT FOUND",
} as const;

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

interface ActivityRailProps {
  entries: PublicEntry[];
  you?: string;
  loading: boolean;
}

export function ActivityRail({ entries, you, loading }: ActivityRailProps) {
  const annotated = annotateAsymmetry(entries);
  const rivals = intelHolders(entries, you);
  const name = (entry: PublicEntry) =>
    you && entry.hunter.toLowerCase() === you.toLowerCase()
      ? "you"
      : (entry.callsign ?? shorten(entry.hunter));

  return (
    <section className="rounded-card border-2 border-ink bg-paper-raised p-5 shadow-hard-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Activity
        </h2>
        <span className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">every hunter</span>
      </div>

      {rivals.length > 0 ? (
        <div className="mt-4 rounded-chip border-2 border-ink bg-gold px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">
            {rivals.length === 1 ? "A rival holds intel you do not" : "Rivals hold intel you do not"}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {rivals.map((rival) => (
              <li key={rival.hunter} className="text-xs leading-snug">
                <span className="num font-semibold">
                  {rival.callsign ?? shorten(rival.hunter)}
                </span>{" "}
                bought {rival.pins} {rival.pins === 1 ? "bearing" : "bearings"}
                {rival.lastDrift ? (
                  <>
                    {" "}
                    and has probed{" "}
                    <span className="font-semibold">
                      {BEARING_WORD[rival.lastDrift].toLowerCase()}{" "}
                      {BEARING_ARROW[rival.lastDrift]}
                    </span>{" "}
                    of it {rival.movesSinceIntel}×
                  </>
                ) : (
                  <> and has not moved on it yet</>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-ink-soft">Reading the vault&apos;s event log…</p>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Nothing yet. Everything here is derived from contract events — nothing is simulated to
          make the field look busy.
        </p>
      ) : (
        <ol className="mt-4 flex max-h-80 flex-col gap-2.5 overflow-y-auto pr-1">
          {annotated.map((entry, index) => (
            <li key={`${entry.kind}-${entry.block}-${index}`} className="text-sm leading-snug">
              {entry.kind === "bearing" ? (
                <div className="rounded-chip border-2 border-ink bg-ink px-3 py-2 text-paper">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="num text-xs font-semibold">{name(entry)}</span>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-paper/50">
                      Pin {String(entry.intelPin ?? 0).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-paper/75">
                    acquired private intel at{" "}
                    <span className="num text-paper">{cellLabel({ x: entry.x, y: entry.y })}</span>
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-gold">
                    {name(entry) === "you"
                      ? "Sealed to your wallet — read it in Private intel"
                      : "Direction sealed to their wallet"}
                  </p>
                </div>
              ) : entry.kind === "probe" ? (
                <div>
                  <span className="num text-ink-soft">{name(entry)}</span> probed{" "}
                  <span className="num font-medium">{cellLabel({ x: entry.x, y: entry.y })}</span>{" "}
                  {entry.resolved && entry.outcome ? (
                    <span className={`font-semibold ${TONE[entry.outcome]}`}>
                      {LABEL[entry.outcome]}
                    </span>
                  ) : (
                    <span className="text-ink-faint">
                      {entry.resolved ? "result unavailable" : "decrypting result…"}
                    </span>
                  )}
                  {entry.driftFromIntel ? (
                    <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      {BEARING_ARROW[entry.driftFromIntel]}{" "}
                      {BEARING_WORD[entry.driftFromIntel]} of{" "}
                      {name(entry) === "you" ? "your" : "their"} pin{" "}
                      {String(entry.intelPin ?? 0).padStart(2, "0")}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div>
                  <span className="num text-ink-soft">{name(entry)}</span>{" "}
                  <span className="font-semibold text-teal">FOUND THE VAULT</span>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
