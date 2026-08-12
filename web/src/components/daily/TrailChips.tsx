import { TemperatureGlyph, UnreadGlyph } from "@/components/marks/TemperatureGlyph";
import { TEMPERATURES, type Temperature } from "@/lib/daily";

const SIZE = {
  sm: { box: "size-8", glyph: "size-4" },
  md: { box: "size-10", glyph: "size-5" },
  lg: { box: "size-11", glyph: "size-5" },
} as const;

interface TrailChipsProps {
  trail: (Temperature | null)[];
  size?: keyof typeof SIZE;
  className?: string;
}

// One dig, one chip, in the order they were spent. Shared by every surface that
// shows a trail so the hunt reads the same on the board, the result and the
// recap.
export function TrailChips({ trail, size = "md", className }: TrailChipsProps) {
  const { box, glyph } = SIZE[size];

  return (
    <ol className={`flex flex-wrap items-center gap-2 ${className ?? ""}`} aria-label="Dig trail">
      {trail.map((temperature, index) => (
        <li
          key={index}
          className={`flex ${box} items-center justify-center rounded-[8px] border-2 border-ink text-ink`}
          style={{
            background:
              temperature === null ? "var(--color-paper-sunk)" : TEMPERATURES[temperature].fill,
          }}
          title={temperature === null ? "Still arriving" : TEMPERATURES[temperature].label}
        >
          {temperature === null ? (
            <UnreadGlyph className={`${glyph} opacity-60`} />
          ) : (
            <TemperatureGlyph temperature={temperature} className={glyph} />
          )}
          <span className="sr-only">
            {temperature === null ? "Still arriving" : TEMPERATURES[temperature].label}
          </span>
        </li>
      ))}
    </ol>
  );
}
