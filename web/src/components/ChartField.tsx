import { FIELD_SIZE, SECTOR_SIZE } from "@/lib/types";
import { DEMO_BEARING_ORIGIN, DEMO_TRAIL } from "@/lib/hunt-script";

const SECTOR_LINES = Array.from(
  { length: FIELD_SIZE / SECTOR_SIZE + 1 },
  (_, index) => index * SECTOR_SIZE,
);

const COLUMN_LABELS = Array.from({ length: FIELD_SIZE / SECTOR_SIZE }, (_, index) =>
  String.fromCharCode(65 + index),
);

const ROW_LABELS = Array.from({ length: FIELD_SIZE / SECTOR_SIZE }, (_, index) => index + 1);

const MARK_SIZE = 2.1;
const BEARING_LENGTH = 17;
const BEARING_DEGREES = 45;
const BEARING_SPREAD = 22.5;

const OUTCOME_FILL = {
  warmer: "var(--color-warmer)",
  colder: "var(--color-colder)",
  found: "var(--color-teal-bright)",
} as const;

const latest = DEMO_TRAIL[DEMO_TRAIL.length - 1];
const origin = { x: DEMO_BEARING_ORIGIN.x + 0.5, y: DEMO_BEARING_ORIGIN.y + 0.5 };

function projectFromNorth(degrees: number, distance: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: origin.x + distance * Math.sin(radians),
    y: origin.y - distance * Math.cos(radians),
  };
}

const bearingEnd = projectFromNorth(BEARING_DEGREES, BEARING_LENGTH);
const coneLeft = projectFromNorth(BEARING_DEGREES - BEARING_SPREAD, 96);
const coneRight = projectFromNorth(BEARING_DEGREES + BEARING_SPREAD, 96);
const conePoints = `${origin.x},${origin.y} ${coneLeft.x},${coneLeft.y} ${coneRight.x},${coneRight.y}`;

interface ChartFieldProps {
  className?: string;
}

export function ChartField({ className }: ChartFieldProps) {
  return (
    <svg
      viewBox="-5.5 -5.5 74 74"
      className={className}
      role="img"
      aria-label="A 64 by 64 hunt field showing five probe marks and one private bearing narrowing the search to a north-east wedge"
    >
      <defs>
        <pattern id="cells" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M 1 0 L 0 0 0 1" fill="none" stroke="var(--color-ink)" strokeWidth="0.09" opacity="0.34" />
        </pattern>
        <clipPath id="field-clip">
          <rect x="0" y="0" width={FIELD_SIZE} height={FIELD_SIZE} />
        </clipPath>
        <marker id="bearing-head" markerWidth="4.2" markerHeight="4.2" refX="2.4" refY="2.1" orient="auto">
          <path d="M 0 0.2 L 4 2.1 L 0 4 Z" fill="var(--color-amber-deep)" />
        </marker>
      </defs>

      <rect x="0" y="0" width={FIELD_SIZE} height={FIELD_SIZE} fill="var(--color-paper-raised)" />

      <g clipPath="url(#field-clip)">
        <polygon points={conePoints} fill="var(--color-gold)" opacity="0.28" />
        <polygon
          points={conePoints}
          fill="none"
          stroke="var(--color-amber-deep)"
          strokeWidth="0.16"
          strokeDasharray="1.4 1.2"
          opacity="0.5"
        />
      </g>

      <rect x="0" y="0" width={FIELD_SIZE} height={FIELD_SIZE} fill="url(#cells)" />

      {SECTOR_LINES.map((position) => (
        <g key={position}>
          <line x1={position} y1="0" x2={position} y2={FIELD_SIZE} stroke="var(--color-ink)" strokeWidth="0.22" opacity="0.75" />
          <line x1="0" y1={position} x2={FIELD_SIZE} y2={position} stroke="var(--color-ink)" strokeWidth="0.22" opacity="0.75" />
        </g>
      ))}

      {COLUMN_LABELS.map((label, index) => (
        <text
          key={label}
          x={index * SECTOR_SIZE + SECTOR_SIZE / 2}
          y="-1.8"
          textAnchor="middle"
          fontSize="2.6"
          fill="var(--color-ink-faint)"
          fontFamily="var(--font-sans)"
          letterSpacing="0.3"
        >
          {label}
        </text>
      ))}

      {ROW_LABELS.map((label, index) => (
        <text
          key={label}
          x="-2.2"
          y={index * SECTOR_SIZE + SECTOR_SIZE / 2 + 0.9}
          textAnchor="middle"
          fontSize="2.6"
          fill="var(--color-ink-faint)"
          fontFamily="var(--font-sans)"
        >
          {label}
        </text>
      ))}

      <polyline
        points={DEMO_TRAIL.map((mark) => `${mark.at.x + 0.5},${mark.at.y + 0.5}`).join(" ")}
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="0.22"
        strokeDasharray="1 1.1"
        opacity="0.45"
      />

      <line
        x1={origin.x}
        y1={origin.y}
        x2={bearingEnd.x}
        y2={bearingEnd.y}
        stroke="var(--color-amber-deep)"
        strokeWidth="0.62"
        strokeDasharray="2 1.2"
        strokeLinecap="round"
        markerEnd="url(#bearing-head)"
      />

      <text
        x={origin.x + BEARING_LENGTH * 0.94}
        y={origin.y - BEARING_LENGTH - 2.6}
        fontSize="3"
        fontWeight="600"
        fill="var(--color-amber-deep)"
        fontFamily="var(--font-sans)"
        letterSpacing="0.3"
      >
        NE
      </text>

      {DEMO_TRAIL.map((mark) => (
        <rect
          key={`${mark.at.x}-${mark.at.y}`}
          x={mark.at.x + 0.5 - MARK_SIZE / 2}
          y={mark.at.y + 0.5 - MARK_SIZE / 2}
          width={MARK_SIZE}
          height={MARK_SIZE}
          rx="0.35"
          fill={OUTCOME_FILL[mark.outcome]}
          stroke="var(--color-ink)"
          strokeWidth="0.28"
        />
      ))}

      <circle
        cx={latest.at.x + 0.5}
        cy={latest.at.y + 0.5}
        r="1.6"
        fill="none"
        stroke="var(--color-warmer)"
        strokeWidth="0.4"
        className="animate-ping-slow"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      />

      <rect x="0" y="0" width={FIELD_SIZE} height={FIELD_SIZE} fill="none" stroke="var(--color-ink)" strokeWidth="0.6" />
    </svg>
  );
}
