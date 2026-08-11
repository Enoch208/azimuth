"use client";

import { useRef, useState } from "react";
import { BEARING_VECTORS, type BearingRecord, type ProbeRecord } from "@/lib/hunt-client";
import {
  FIELD_SIZE,
  SECTOR_COLUMNS,
  SECTOR_ROWS,
  SECTOR_SIZE,
  sectorLabel,
  type Coordinate,
} from "@/lib/types";

const SECTOR_LINES = Array.from(
  { length: FIELD_SIZE / SECTOR_SIZE + 1 },
  (_, index) => index * SECTOR_SIZE,
);

const MARK_SIZE = 2.2;
const CONE_SPREAD = 22.5;
const CONE_REACH = 96;
const GUTTER = 4;

const OUTCOME_FILL = {
  warmer: "var(--color-warmer)",
  colder: "var(--color-colder)",
  found: "var(--color-teal-bright)",
} as const;

const clampCell = (value: number) => Math.min(FIELD_SIZE - 1, Math.max(0, value));

function conePoints(origin: Coordinate, bearing: keyof typeof BEARING_VECTORS) {
  const vector = BEARING_VECTORS[bearing];
  const centre = (Math.atan2(vector.x, -vector.y) * 180) / Math.PI;
  const project = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    return `${origin.x + 0.5 + CONE_REACH * Math.sin(radians)},${origin.y + 0.5 - CONE_REACH * Math.cos(radians)}`;
  };
  return `${origin.x + 0.5},${origin.y + 0.5} ${project(centre - CONE_SPREAD)} ${project(centre + CONE_SPREAD)}`;
}

interface HuntBoardProps {
  possible: Coordinate[] | null;
  probes: ProbeRecord[];
  bearings: BearingRecord[];
  revealed: Coordinate | null;
  pending: Coordinate | null;
  mode: "probe" | "bearing";
  busy: boolean;
  disabled: boolean;
  onSelect: (cell: Coordinate) => void;
}

export function HuntBoard({
  possible,
  probes,
  bearings,
  revealed,
  pending,
  mode,
  busy,
  disabled,
  onSelect,
}: HuntBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<Coordinate | null>(null);
  const [keyboardCell, setKeyboardCell] = useState<Coordinate>({ x: 32, y: 32 });
  const [usesKeyboard, setUsesKeyboard] = useState(false);

  const active = usesKeyboard ? keyboardCell : cursor;
  const interactive = !busy && !disabled;
  const spent = new Set(probes.map((record) => `${record.cell.x},${record.cell.y}`));
  const alreadyProbed = (cell: Coordinate) => spent.has(`${cell.x},${cell.y}`);

  const cellFromPointer = (clientX: number, clientY: number): Coordinate | null => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const local = point.matrixTransform(matrix.inverse());
    if (local.x < 0 || local.y < 0 || local.x >= FIELD_SIZE || local.y >= FIELD_SIZE) return null;
    return { x: clampCell(Math.floor(local.x)), y: clampCell(Math.floor(local.y)) };
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    const steps: Record<string, Coordinate> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };
    const step = steps[event.key];
    if (step) {
      event.preventDefault();
      setUsesKeyboard(true);
      const jump = event.shiftKey ? SECTOR_SIZE : 1;
      setKeyboardCell((current) => ({
        x: clampCell(current.x + step.x * jump),
        y: clampCell(current.y + step.y * jump),
      }));
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && interactive) {
      event.preventDefault();
      setUsesKeyboard(true);
      if (!(mode === "probe" && alreadyProbed(keyboardCell))) onSelect(keyboardCell);
    }
  };

  const accent = mode === "bearing" ? "var(--color-amber-deep)" : "var(--color-ink)";
  const readout = active ?? pending;

  return (
    <svg
      ref={svgRef}
      viewBox={`${-GUTTER} ${-GUTTER} ${FIELD_SIZE + GUTTER} ${FIELD_SIZE + GUTTER}`}
      className={`size-full touch-manipulation select-none outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber ${
        interactive ? "cursor-crosshair" : "cursor-progress"
      }`}
      role="application"
      tabIndex={0}
      aria-label={`Hunt field, 64 by 64 cells lettered A to H across and 1 to 8 down. ${
        mode === "bearing" ? "Choose a point to scan from." : "Choose a cell to probe."
      } Arrow keys move, shift plus arrow jumps a sector, Enter commits.`}
      onPointerMove={(event) => {
        setUsesKeyboard(false);
        setCursor(cellFromPointer(event.clientX, event.clientY));
      }}
      onPointerLeave={() => setCursor(null)}
      onPointerDown={(event) => {
        if (!interactive) return;
        const cell = cellFromPointer(event.clientX, event.clientY);
        if (cell && !(mode === "probe" && alreadyProbed(cell))) onSelect(cell);
      }}
      onKeyDown={handleKeyDown}
      onBlur={() => setUsesKeyboard(false)}
    >
      <defs>
        <pattern id="hunt-cells" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M 1 0 L 0 0 0 1" fill="none" stroke="var(--color-ink)" strokeWidth="0.06" opacity="0.24" />
        </pattern>
        <clipPath id="hunt-clip">
          <rect width={FIELD_SIZE} height={FIELD_SIZE} />
        </clipPath>
      </defs>

      {SECTOR_COLUMNS.map((letter, index) => (
        <text
          key={`col-${letter}`}
          x={index * SECTOR_SIZE + SECTOR_SIZE / 2}
          y={-1.3}
          textAnchor="middle"
          fontSize="2.1"
          letterSpacing="0.3"
          fill={readout && Math.floor(readout.x / SECTOR_SIZE) === index ? "var(--color-ink)" : "var(--color-ink-faint)"}
          fontWeight={readout && Math.floor(readout.x / SECTOR_SIZE) === index ? "700" : "500"}
        >
          {letter}
        </text>
      ))}

      {SECTOR_ROWS.map((digit, index) => (
        <text
          key={`row-${digit}`}
          x={-1.7}
          y={index * SECTOR_SIZE + SECTOR_SIZE / 2 + 0.75}
          textAnchor="middle"
          fontSize="2.1"
          fill={readout && Math.floor(readout.y / SECTOR_SIZE) === index ? "var(--color-ink)" : "var(--color-ink-faint)"}
          fontWeight={readout && Math.floor(readout.y / SECTOR_SIZE) === index ? "700" : "500"}
        >
          {digit}
        </text>
      ))}

      <rect width={FIELD_SIZE} height={FIELD_SIZE} fill="var(--color-paper-raised)" />

      <g clipPath="url(#hunt-clip)">
        {bearings.map((record, index) => (
          <polygon
            key={`cone-${index}`}
            points={conePoints(record.origin, record.bearing)}
            fill="var(--color-gold)"
            opacity="0.26"
          />
        ))}
      </g>

      {possible ? (
        <g pointerEvents="none">
          {possible.map((cell) => (
            <rect
              key={`p-${cell.x}-${cell.y}`}
              x={cell.x}
              y={cell.y}
              width="1"
              height="1"
              fill="var(--color-teal-bright)"
              opacity="0.18"
            />
          ))}
        </g>
      ) : null}

      <rect width={FIELD_SIZE} height={FIELD_SIZE} fill="url(#hunt-cells)" />

      {SECTOR_LINES.map((position) => (
        <g key={position}>
          <line x1={position} y1="0" x2={position} y2={FIELD_SIZE} stroke="var(--color-ink)" strokeWidth="0.15" opacity="0.5" />
          <line x1="0" y1={position} x2={FIELD_SIZE} y2={position} stroke="var(--color-ink)" strokeWidth="0.15" opacity="0.5" />
        </g>
      ))}

      {active && interactive ? (
        <g pointerEvents="none">
          <line x1={active.x + 0.5} y1="0" x2={active.x + 0.5} y2={FIELD_SIZE} stroke={accent} strokeWidth="0.12" opacity="0.6" />
          <line x1="0" y1={active.y + 0.5} x2={FIELD_SIZE} y2={active.y + 0.5} stroke={accent} strokeWidth="0.12" opacity="0.6" />
          <rect
            x={active.x}
            y={active.y}
            width="1"
            height="1"
            fill={
              mode === "probe" && alreadyProbed(active)
                ? "var(--color-ink-faint)"
                : mode === "bearing"
                  ? "var(--color-gold)"
                  : "var(--color-amber)"
            }
          />
        </g>
      ) : null}

      {bearings.map((record, index) => (
        <g key={`origin-${index}`} pointerEvents="none">
          <circle
            cx={record.origin.x + 0.5}
            cy={record.origin.y + 0.5}
            r="1.5"
            fill="var(--color-paper-raised)"
            stroke="var(--color-amber-deep)"
            strokeWidth="0.4"
          />
          <text
            x={record.origin.x + 0.5}
            y={record.origin.y + 1.15}
            textAnchor="middle"
            fontSize="1.5"
            fontWeight="700"
            fill="var(--color-amber-deep)"
          >
            {index + 1}
          </text>
        </g>
      ))}

      {probes.map((record, index) => (
        <rect
          key={`${record.cell.x}-${record.cell.y}-${index}`}
          x={record.cell.x + 0.5 - MARK_SIZE / 2}
          y={record.cell.y + 0.5 - MARK_SIZE / 2}
          width={MARK_SIZE}
          height={MARK_SIZE}
          rx="0.35"
          fill={OUTCOME_FILL[record.outcome]}
          stroke="var(--color-ink)"
          strokeWidth="0.28"
          pointerEvents="none"
          className="animate-pop"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      ))}

      {pending ? (
        <g pointerEvents="none">
          <rect
            x={pending.x + 0.5 - MARK_SIZE / 2}
            y={pending.y + 0.5 - MARK_SIZE / 2}
            width={MARK_SIZE}
            height={MARK_SIZE}
            rx="0.35"
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="0.35"
            strokeDasharray="0.9 0.7"
            className="animate-spin-slow"
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        </g>
      ) : null}

      {revealed ? (
        <g pointerEvents="none">
          <circle
            cx={revealed.x + 0.5}
            cy={revealed.y + 0.5}
            r="4"
            fill="none"
            stroke="var(--color-teal-bright)"
            strokeWidth="0.45"
            className="animate-ping-slow"
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        </g>
      ) : null}

      {readout ? (
        <g pointerEvents="none">
          <rect
            x={FIELD_SIZE - 17}
            y={-GUTTER + 0.1}
            width="17"
            height="3.2"
            rx="0.6"
            fill="var(--color-ink)"
          />
          <text
            x={FIELD_SIZE - 8.5}
            y={-GUTTER + 2.4}
            textAnchor="middle"
            fontSize="1.75"
            letterSpacing="0.12"
            fontWeight="600"
            fill="var(--color-paper)"
          >
            {mode === "probe" && alreadyProbed(readout)
              ? "Spent"
              : `${sectorLabel(readout)} · ${readout.x}, ${readout.y}`}
          </text>
        </g>
      ) : null}

      <rect width={FIELD_SIZE} height={FIELD_SIZE} fill="none" stroke="var(--color-ink)" strokeWidth="0.5" />
    </svg>
  );
}
