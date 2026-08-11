"use client";

import { useCallback, useMemo, useState } from "react";
import { DailyMap } from "@/components/daily/DailyMap";
import {
  DIGS,
  FIELD,
  TEMPERATURES,
  alreadyDug,
  digsLeft,
  isFound,
  isOver,
  temperatureAt,
  type Dig,
  type Tile,
} from "@/lib/daily";

const THINKING_MS = 620;

function randomTile(): Tile {
  return {
    x: Math.floor(Math.random() * FIELD),
    y: Math.floor(Math.random() * FIELD),
  };
}

export function PracticeHunt() {
  const [treasure, setTreasure] = useState<Tile>(() => randomTile());
  const [digs, setDigs] = useState<Dig[]>([]);
  const [pending, setPending] = useState<Tile | null>(null);

  const over = isOver(digs);
  const won = isFound(digs);
  const latest = digs[digs.length - 1];

  const headline = useMemo(() => {
    if (pending) return { text: "Searching beneath the chain", tone: "text-ink-soft" };
    if (won) return { text: "Treasure", tone: "text-teal" };
    if (over) return { text: "Out of digs", tone: "text-ink-soft" };
    if (latest) {
      const style = TEMPERATURES[latest.temperature];
      return { text: style.label, tone: style.tone };
    }
    return { text: "Pick a tile", tone: "text-ink" };
  }, [pending, won, over, latest]);

  const note = useMemo(() => {
    if (pending) return "The map is encrypted. Only the contract can compare your guess to it.";
    if (won) return `Found it in ${digs.length} ${digs.length === 1 ? "dig" : "digs"}.`;
    if (over) return "The treasure was where the gem is. Try another map.";
    if (latest) {
      return latest.temperature <= 2
        ? "You are close. Search the tiles around this one."
        : "Too far. Try somewhere else on the map.";
    }
    return "A treasure is hidden somewhere on this map. You have six digs.";
  }, [pending, won, over, latest, digs.length]);

  const handleDig = useCallback(
    (tile: Tile) => {
      if (pending || isOver(digs) || alreadyDug(digs, tile)) return;
      setPending(tile);
      window.setTimeout(() => {
        setDigs((current) => [...current, { tile, temperature: temperatureAt(tile, treasure) }]);
        setPending(null);
      }, THINKING_MS);
    },
    [pending, digs, treasure],
  );

  const reset = useCallback(() => {
    setTreasure(randomTile());
    setDigs([]);
    setPending(null);
  }, []);

  return (
    <figure className="animate-rise overflow-hidden rounded-panel border-2 border-ink bg-paper-deep shadow-hard-lg">
      <div className="flex items-center justify-between gap-4 border-b-2 border-ink px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Try a map</span>
        <span className="num text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          {digsLeft(digs)} of {DIGS} digs left
        </span>
      </div>

      <div className="bg-paper-raised p-2 sm:p-4">
        <DailyMap
          digs={digs}
          pending={pending}
          treasure={over && !won ? treasure : null}
          disabled={over || pending !== null}
          onDig={handleDig}
        />
      </div>

      <figcaption className="flex items-center justify-between gap-4 border-t-2 border-ink bg-paper-raised px-4 py-3">
        <div className="min-w-0">
          <div
            className={`font-display text-2xl font-medium leading-none tracking-tight sm:text-3xl ${headline.tone} ${
              latest && !pending ? "animate-land" : ""
            }`}
          >
            {latest && !pending && !over ? `${TEMPERATURES[latest.temperature].emoji} ` : ""}
            {headline.text}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">{note}</p>
        </div>

        {over ? (
          <button
            type="button"
            onClick={reset}
            className="press shrink-0 rounded-chip border-2 border-ink bg-amber px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] shadow-hard-xs"
          >
            New map
          </button>
        ) : null}
      </figcaption>
    </figure>
  );
}
