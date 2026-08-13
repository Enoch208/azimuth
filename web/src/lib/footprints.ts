import type { Tile } from "@/lib/daily";

// Where everybody else has dug today. This is public the instant it lands and
// always was — the chain records the tile, not the answer. Showing it is the
// whole thesis made visible: you can watch every rival's every move and still
// learn nothing about the treasure, because what the tile told them is theirs
// alone until midnight.
export interface Footprint {
  tile: Tile;
  // How many other hunters have opened this tile.
  hunters: number;
}

export interface RawDig {
  hunter: string;
  x: number;
  y: number;
}

const key = (x: number, y: number) => `${x},${y}`;

// One entry per tile, counting distinct rivals rather than digs, so a hunter
// cannot inflate a tile by digging it — which the contract forbids anyway.
export function footprintsFrom(rows: RawDig[], me: string | null): Footprint[] {
  const mine = me?.toLowerCase() ?? null;
  const byTile = new Map<string, Set<string>>();

  for (const row of rows) {
    const hunter = row.hunter.toLowerCase();
    if (hunter === mine) continue;
    const at = byTile.get(key(row.x, row.y)) ?? new Set<string>();
    at.add(hunter);
    byTile.set(key(row.x, row.y), at);
  }

  return [...byTile.entries()].map(([tile, hunters]) => {
    const [x, y] = tile.split(",").map(Number);
    return { tile: { x, y }, hunters: hunters.size };
  });
}

export function footprintAt(footprints: Footprint[], tile: Tile): Footprint | null {
  return footprints.find((mark) => mark.tile.x === tile.x && mark.tile.y === tile.y) ?? null;
}
