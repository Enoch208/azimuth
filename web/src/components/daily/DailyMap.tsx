"use client";

import { FIELD, TEMPERATURES, alreadyDug, type Dig, type Tile } from "@/lib/daily";

interface DailyMapProps {
  digs: Dig[];
  pending: Tile | null;
  treasure: Tile | null;
  disabled: boolean;
  onDig: (tile: Tile) => void;
}

const TILES: Tile[] = [];
for (let y = 0; y < FIELD; y += 1) {
  for (let x = 0; x < FIELD; x += 1) TILES.push({ x, y });
}

export function DailyMap({ digs, pending, treasure, disabled, onDig }: DailyMapProps) {
  const dugAt = new Map(digs.map((dig) => [`${dig.tile.x},${dig.tile.y}`, dig]));

  return (
    <div
      className="grid w-full gap-[3px] sm:gap-1.5"
      style={{ gridTemplateColumns: `repeat(${FIELD}, minmax(0, 1fr))` }}
      role="group"
      aria-label={`Treasure map, ${FIELD} by ${FIELD} tiles`}
    >
      {TILES.map((tile) => {
        const key = `${tile.x},${tile.y}`;
        const dug = dugAt.get(key);
        const isPending = pending?.x === tile.x && pending?.y === tile.y;
        const isTreasure = treasure?.x === tile.x && treasure?.y === tile.y;
        const spent = alreadyDug(digs, tile);
        const locked = disabled || spent || isPending;

        const style = dug && dug.temperature !== null ? TEMPERATURES[dug.temperature] : null;

        return (
          <button
            key={key}
            type="button"
            disabled={locked}
            onClick={() => onDig(tile)}
            aria-label={
              dug
                ? `Tile ${tile.x + 1}, ${tile.y + 1}: ${style?.label}`
                : `Dig tile ${tile.x + 1}, ${tile.y + 1}`
            }
            className={`relative aspect-square rounded-[6px] border-2 border-ink text-[clamp(0.85rem,2.6vw,1.5rem)] leading-none transition-transform duration-150 sm:rounded-lg ${
              locked ? "cursor-default" : "cursor-pointer hover:-translate-y-[3px] active:translate-y-0"
            } ${isPending ? "animate-dig-pulse" : ""} ${
              !dug && !isPending ? "bg-paper-raised shadow-hard-xs" : ""
            }`}
            style={
              dug
                ? { background: style?.fill ?? "var(--color-paper-sunk)", boxShadow: "none" }
                : isPending
                  ? { background: "var(--color-ink)" }
                  : undefined
            }
          >
            {dug ? (
              <span className="animate-land absolute inset-0 flex items-center justify-center drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]">
                {style?.emoji ?? "…"}
              </span>
            ) : null}
            {isTreasure && !dug ? (
              <span className="absolute inset-0 flex items-center justify-center opacity-90">💎</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
