"use client";

import { play } from "@/lib/sound";
import {
  FoundGlyph,
  TemperatureGlyph,
  UnreadGlyph,
} from "@/components/marks/TemperatureGlyph";
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
            onClick={() => {
              play("press");
              onDig(tile);
            }}
            aria-label={
              dug
                ? `Tile ${tile.x + 1}, ${tile.y + 1}: ${style?.label ?? "still arriving"}`
                : `Dig tile ${tile.x + 1}, ${tile.y + 1}`
            }
            className={`tile relative aspect-square rounded-[6px] border-2 border-ink leading-none sm:rounded-lg ${
              isPending ? "animate-dig-pulse" : ""
            } ${
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
              <span className="animate-land absolute inset-0 flex items-center justify-center text-ink">
                {/* A dug tile whose confidential answer has not arrived shows
                    that it is still arriving. It must never wear one of the
                    six temperatures it was not given. */}
                {dug.temperature === null ? (
                  <UnreadGlyph className="size-[58%] opacity-60" />
                ) : (
                  <TemperatureGlyph temperature={dug.temperature} className="size-[58%]" />
                )}
              </span>
            ) : null}
            {isTreasure && !dug ? (
              <span className="absolute inset-0 flex items-center justify-center text-teal">
                <FoundGlyph className="size-[58%]" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
