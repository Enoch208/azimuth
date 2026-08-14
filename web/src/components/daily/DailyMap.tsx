"use client";

import { play } from "@/lib/sound";
import {
  FoundGlyph,
  TemperatureGlyph,
  UnreadGlyph,
} from "@/components/marks/TemperatureGlyph";
import { FIELD, TEMPERATURES, alreadyDug, type Dig, type Tile } from "@/lib/daily";
import { footprintAt, type Footprint } from "@/lib/footprints";

interface DailyMapProps {
  digs: Dig[];
  pending: Tile | null;
  treasure: Tile | null;
  disabled: boolean;
  onDig: (tile: Tile) => void;
  // The tile a hunter is lining up for their sealed guess. Marked rather than
  // filled, because nothing about it is decided until they seal it.
  selected?: Tile | null;
  // What a click means right now. Sealing re-opens the board after the six
  // digs are gone, so the last word is chosen on the same map as the rest.
  intent?: "dig" | "seal";
  // Where rivals have dug. Their tiles are public; their answers are not, and
  // this map draws exactly that difference.
  footprints?: Footprint[];
}

const TILES: Tile[] = [];
for (let y = 0; y < FIELD; y += 1) {
  for (let x = 0; x < FIELD; x += 1) TILES.push({ x, y });
}

export function DailyMap({
  digs,
  pending,
  treasure,
  disabled,
  onDig,
  selected = null,
  intent = "dig",
  footprints = [],
}: DailyMapProps) {
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
        const isSelected = selected?.x === tile.x && selected?.y === tile.y;
        const rivals = dug ? null : footprintAt(footprints, tile);

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
                : intent === "seal"
                  ? `Name tile ${tile.x + 1}, ${tile.y + 1} as your sealed guess`
                  : rivals
                    ? `Dig tile ${tile.x + 1}, ${tile.y + 1}. ${rivals.hunters} other ${
                        rivals.hunters === 1 ? "hunter has" : "hunters have"
                      } dug here; what it told them is unreadable.`
                    : `Dig tile ${tile.x + 1}, ${tile.y + 1}`
            }
            aria-pressed={intent === "seal" ? isSelected : undefined}
            className={`tile relative aspect-square rounded-[6px] border-2 border-ink leading-none sm:rounded-lg ${
              isPending ? "animate-dig-pulse" : ""
            } ${
              !dug && !isPending ? "bg-paper-raised shadow-hard-xs" : ""
            } ${isSelected ? "ring-4 ring-teal ring-offset-1 ring-offset-paper" : ""}`}
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
            {rivals ? (
              // A rival's move, never a rival's answer: a mark on the tile and,
              // where several have been, how many. No temperature can appear
              // here, because nobody but its owner can read one.
              // Drawn rather than typed: a middle dot in the faintest ink was
              // two low-contrast pixels on a forty-eight pixel tile, so the
              // board looked empty while claiming fourteen hunters had dug on it.
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {rivals.hunters > 1 ? (
                  <span className="num text-[11px] font-semibold text-ink-faint sm:text-xs">
                    {rivals.hunters}
                  </span>
                ) : (
                  <span className="size-2 rounded-full bg-ink-faint sm:size-2.5" />
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
