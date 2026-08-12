"use client";

import { useCallback, useMemo, useState } from "react";
import { DailyMap } from "@/components/daily/DailyMap";
import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { keeperStateFor } from "@/components/mascot/keeper-state";
import { TemperatureGlyph } from "@/components/marks/TemperatureGlyph";
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

  // Practice never has an unread answer — the temperature is computed locally —
  // but the mapping is shared with the real hunt, so it stays honest either way.
  const answered = latest && latest.temperature !== null ? latest.temperature : null;

  const keeper = keeperStateFor({ digs, pending: pending !== null });

  const headline = useMemo(() => {
    if (pending) return { text: "Listening beneath the map…", tone: "text-ink-soft" };
    if (won) return { text: "Treasure found!", tone: "text-teal" };
    if (over) return { text: "Out of digs", tone: "text-ink-soft" };
    if (answered !== null) {
      const style = TEMPERATURES[answered];
      return { text: style.label, tone: style.tone };
    }
    return { text: "Pick a tile", tone: "text-ink" };
  }, [pending, won, over, answered]);

  const note = useMemo(() => {
    if (pending) return "The Keeper is checking your dig against the buried map.";
    if (won) return `You found it in ${digs.length}/${DIGS} digs. The real hunt seals your score.`;
    if (over) return "The treasure was where the gem is. Try another map.";
    if (answered !== null) {
      return answered <= 2
        ? "You are close. Search the tiles around this one."
        : "Too far. Try somewhere else on the map.";
    }
    return "A treasure is hidden somewhere on this map. You have six digs.";
  }, [pending, won, over, answered, digs.length]);

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

  // The map is square, so the panel's width sets its height. Cap the width against the viewport
  // height left under the site header so the whole panel fits the hero without scrolling.
  return (
    <figure className="animate-rise w-full overflow-hidden rounded-panel border-2 border-ink bg-paper-deep shadow-hard-lg lg:max-w-[min(34rem,max(20rem,calc(100svh-24rem)))] lg:justify-self-center">
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

      {/* The Keeper watches from the lower edge of the card — beside the
          readout, never over the board. */}
      <figcaption className="flex items-center gap-3 border-t-2 border-ink bg-paper-raised px-4 py-3">
        <KeeperMascot state={keeper} size="sm" className="-my-2 sm:size-auto sm:w-24" />

        <div className="min-w-0 flex-1">
          <div
            className={`flex items-center gap-2 font-display text-2xl font-medium leading-none tracking-tight sm:text-3xl ${headline.tone} ${
              latest && !pending ? "animate-land" : ""
            }`}
          >
            {answered !== null && !pending && !over ? (
              <TemperatureGlyph temperature={answered} className="size-6 shrink-0 sm:size-7" />
            ) : null}
            <span className="min-w-0 text-balance">{headline.text}</span>
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
