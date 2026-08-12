import type { Temperature } from "@/lib/daily";

// The glyph geometry lives here because it is drawn twice: as SVG on screen and
// as Path2D on the share card's canvas. One source, so the exported image can
// never drift from the board.
export interface GlyphPath {
  d: string;
  filled?: boolean;
}

export const GLYPH_BOX = 24;
export const GLYPH_STROKE = 2.4;

export const FREEZING_PATHS: GlyphPath[] = [
  { d: "M12 2.6v18.8M4 7.3l16 9.4M4 16.7l16-9.4" },
  { d: "M9.4 4.4 12 6.6l2.6-2.2M9.4 19.6 12 17.4l2.6 2.2" },
];

export const COLD_PATHS: GlyphPath[] = [
  { d: "M14.4 13.5V5.6a2.4 2.4 0 0 0-4.8 0v7.9a4.6 4.6 0 1 0 4.8 0Z" },
  { d: "M12 17.6a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z", filled: true },
];

export const WARM_PATHS: GlyphPath[] = [
  { d: "M12 7.7a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 0 0 0-8.6Z" },
  {
    d: "M12 2.4v2.3M12 19.3v2.3M2.4 12h2.3M19.3 12h2.3M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7",
  },
];

// Rising heat, not a flame. A symmetric teardrop reads as a water drop at board
// size, which is the opposite of what this rung means.
export const HOT_PATHS: GlyphPath[] = [
  { d: "M6.9 20.2q-1.8-1.8 0-3.6t0-3.6t0-3.6" },
  { d: "M12 21q-1.8-1.8 0-3.6t0-3.6t0-3.6t0-3.6" },
  { d: "M17.1 20.2q-1.8-1.8 0-3.6t0-3.6t0-3.6" },
];

export const BURNING_PATHS: GlyphPath[] = [
  {
    d: "M13.1 2.2c.7 2.8-.6 4.6-2.1 6.2-1.5 1.7-3 3.3-3 5.7a6 6 0 0 0 12 0c0-2.7-1.4-4.8-3-6.7-.4 1.2-1.1 2-2.1 2.6.7-2.9-.6-5.7-1.8-7.8Z",
  },
  {
    d: "M12 12.9c1.5 1.6 2.3 2.8 2.3 4.1a2.3 2.3 0 0 1-4.6 0c0-1.3.8-2.5 2.3-4.1Z",
    filled: true,
  },
];

export const FOUND_PATHS: GlyphPath[] = [
  { d: "M3.4 9.3 7.1 3.6h9.8l3.7 5.7-8.6 11.1Z" },
  { d: "M3.4 9.3h17.2M8.4 9.3 12 20.4l3.6-11.1M7.1 3.6l1.3 5.7M16.9 3.6l-1.3 5.7" },
];

export const TEMPERATURE_PATHS: Record<Temperature, GlyphPath[]> = {
  0: FOUND_PATHS,
  1: BURNING_PATHS,
  2: HOT_PATHS,
  3: WARM_PATHS,
  4: COLD_PATHS,
  5: FREEZING_PATHS,
};

// An answer that never arrived. Deliberately not one of the six.
export const UNREAD_PATHS: GlyphPath[] = [
  { d: "M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2Z" },
  { d: "M12 14.1a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2Z", filled: true },
];
