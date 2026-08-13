"use client";

import { LockIcon } from "@/components/marks/Icons";
import { sectorName, type Tile } from "@/lib/daily";

type SealState = "choosing" | "sealing" | "sealed";

interface SealedGuessProps {
  state: SealState;
  selected: Tile | null;
  // What the wallet read back from its own verdict. Null means sealed but not
  // yet readable — the guess still counted.
  right: boolean | null;
  guessed: Tile | null;
  onSeal: () => void;
}

export function SealedGuess({ state, selected, right, guessed, onSeal }: SealedGuessProps) {
  if (state === "sealed") {
    return (
      <section className="rounded-card border-2 border-ink bg-paper-raised p-5 shadow-hard-sm">
        <h2 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
          <LockIcon className="size-3.5" />
          Your last word
        </h2>
        {right === null ? (
          <p className="mt-3 text-sm text-ink-soft">
            Sealed{guessed ? ` on ${sectorName(guessed)}` : ""}. The answer is still being signed —
            it counted either way, and only you will be able to read it.
          </p>
        ) : right ? (
          <p className="mt-3 text-sm">
            <span className="font-display text-lg font-medium text-teal">
              {guessed ? sectorName(guessed) : "Your guess"} was right.
            </span>{" "}
            <span className="text-ink-soft">
              Nobody else can see that yet. It settles when the map opens after midnight.
            </span>
          </p>
        ) : (
          <p className="mt-3 text-sm">
            <span className="font-display text-lg font-medium">
              {guessed ? sectorName(guessed) : "Your guess"} was wrong.
            </span>{" "}
            <span className="text-ink-soft">
              The treasure was somewhere else. You will see where when the map opens.
            </span>
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-card border-2 border-ink bg-gold p-5 shadow-hard-sm">
      <h2 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
        <LockIcon className="size-3.5" />
        One sealed guess left
      </h2>
      <p className="mt-3 text-sm text-ink-soft">
        Your six digs are spent and every one of them is public. This last tile is not: you
        encrypt it yourself, and the chain compares it to a coordinate it cannot read either.
      </p>

      <p className="mt-4 text-sm">
        {selected ? (
          <>
            Naming <span className="font-display text-lg font-medium">{sectorName(selected)}</span>.
            Pick another tile to change it.
          </>
        ) : (
          <span className="text-ink-soft">Choose a tile on the map to name it.</span>
        )}
      </p>

      <button
        type="button"
        disabled={!selected || state === "sealing"}
        onClick={onSeal}
        className="mt-4 w-full rounded-chip border-2 border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-paper shadow-hard-xs disabled:opacity-40"
      >
        {state === "sealing" ? "Sealing…" : selected ? `Seal ${sectorName(selected)}` : "Seal your guess"}
      </button>
    </section>
  );
}
