import type { Temperature } from "@/lib/daily";

// Drawn to the same rules as the board: 24-unit box, thick strokes, round
// joins, no gradients. They read as one ladder — frost thins out, flame grows,
// then the gem lands.
interface GlyphProps {
  className?: string;
}

function Frame({ className, children }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function FreezingGlyph(props: GlyphProps) {
  return (
    <Frame {...props}>
      <path d="M12 2.6v18.8M4 7.3l16 9.4M4 16.7l16-9.4" />
      <path d="M9.4 4.4 12 6.6l2.6-2.2M9.4 19.6 12 17.4l2.6 2.2" />
    </Frame>
  );
}

export function ColdGlyph(props: GlyphProps) {
  return (
    <Frame {...props}>
      <path d="M14.4 13.5V5.6a2.4 2.4 0 0 0-4.8 0v7.9a4.6 4.6 0 1 0 4.8 0Z" />
      <circle cx="12" cy="17.6" r="1.9" fill="currentColor" stroke="none" />
    </Frame>
  );
}

export function WarmGlyph(props: GlyphProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="12" r="4.3" />
      <path d="M12 2.4v2.3M12 19.3v2.3M2.4 12h2.3M19.3 12h2.3M5.2 5.2l1.7 1.7M17.1 17.1l1.7 1.7M18.8 5.2l-1.7 1.7M6.9 17.1l-1.7 1.7" />
    </Frame>
  );
}

// Rising heat rather than a flame. A symmetric teardrop reads as a water drop
// at board size — the exact opposite of what this rung means.
export function HotGlyph(props: GlyphProps) {
  return (
    <Frame {...props}>
      <path d="M6.9 20.2q-1.8-1.8 0-3.6t0-3.6t0-3.6" />
      <path d="M12 21q-1.8-1.8 0-3.6t0-3.6t0-3.6t0-3.6" />
      <path d="M17.1 20.2q-1.8-1.8 0-3.6t0-3.6t0-3.6" />
    </Frame>
  );
}

// Asymmetric, with a lick curling off the tip, so it reads as fire and not as
// a bigger version of a droplet.
export function BurningGlyph(props: GlyphProps) {
  return (
    <Frame {...props}>
      <path d="M13.1 2.2c.7 2.8-.6 4.6-2.1 6.2-1.5 1.7-3 3.3-3 5.7a6 6 0 0 0 12 0c0-2.7-1.4-4.8-3-6.7-.4 1.2-1.1 2-2.1 2.6.7-2.9-.6-5.7-1.8-7.8Z" />
      <path
        d="M12 12.9c1.5 1.6 2.3 2.8 2.3 4.1a2.3 2.3 0 0 1-4.6 0c0-1.3.8-2.5 2.3-4.1Z"
        fill="currentColor"
      />
    </Frame>
  );
}

export function FoundGlyph(props: GlyphProps) {
  return (
    <Frame {...props}>
      <path d="M3.4 9.3 7.1 3.6h9.8l3.7 5.7-8.6 11.1Z" />
      <path d="M3.4 9.3h17.2M8.4 9.3 12 20.4l3.6-11.1M7.1 3.6l1.3 5.7M16.9 3.6l-1.3 5.7" />
    </Frame>
  );
}

const GLYPHS: Record<Temperature, (props: GlyphProps) => React.ReactElement> = {
  0: FoundGlyph,
  1: BurningGlyph,
  2: HotGlyph,
  3: WarmGlyph,
  4: ColdGlyph,
  5: FreezingGlyph,
};

interface TemperatureGlyphProps {
  temperature: Temperature;
  className?: string;
}

export function TemperatureGlyph({ temperature, className }: TemperatureGlyphProps) {
  const Glyph = GLYPHS[temperature];
  return <Glyph className={className} />;
}

// An answer that has not arrived. Deliberately not one of the six — an unread
// dig must never wear a temperature it was not given.
export function UnreadGlyph({ className }: GlyphProps) {
  return (
    <Frame className={className}>
      <circle cx="12" cy="12" r="8.6" strokeDasharray="3.4 3.4" />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none" />
    </Frame>
  );
}
