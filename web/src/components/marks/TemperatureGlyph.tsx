import {
  BURNING_PATHS,
  COLD_PATHS,
  FOUND_PATHS,
  FREEZING_PATHS,
  GLYPH_BOX,
  GLYPH_STROKE,
  HOT_PATHS,
  TEMPERATURE_PATHS,
  UNREAD_PATHS,
  WARM_PATHS,
  type GlyphPath,
} from "@/components/marks/temperature-paths";
import type { Temperature } from "@/lib/daily";

// Drawn to the same rules as the board: thick strokes, round joins, no
// gradients. They read as one ladder — frost thins out, flame grows, then the
// gem lands. Geometry comes from temperature-paths so the share card's canvas
// draws exactly the same shapes.
interface GlyphProps {
  className?: string;
}

function Glyph({ paths, className }: GlyphProps & { paths: GlyphPath[] }) {
  return (
    <svg
      viewBox={`0 0 ${GLYPH_BOX} ${GLYPH_BOX}`}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={GLYPH_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((path, index) => (
        <path key={index} d={path.d} fill={path.filled ? "currentColor" : "none"} />
      ))}
    </svg>
  );
}

export const FreezingGlyph = (props: GlyphProps) => <Glyph {...props} paths={FREEZING_PATHS} />;
export const ColdGlyph = (props: GlyphProps) => <Glyph {...props} paths={COLD_PATHS} />;
export const WarmGlyph = (props: GlyphProps) => <Glyph {...props} paths={WARM_PATHS} />;
export const HotGlyph = (props: GlyphProps) => <Glyph {...props} paths={HOT_PATHS} />;
export const BurningGlyph = (props: GlyphProps) => <Glyph {...props} paths={BURNING_PATHS} />;
export const FoundGlyph = (props: GlyphProps) => <Glyph {...props} paths={FOUND_PATHS} />;
export const UnreadGlyph = (props: GlyphProps) => <Glyph {...props} paths={UNREAD_PATHS} />;

interface TemperatureGlyphProps {
  temperature: Temperature;
  className?: string;
}

export function TemperatureGlyph({ temperature, className }: TemperatureGlyphProps) {
  return <Glyph paths={TEMPERATURE_PATHS[temperature]} className={className} />;
}
