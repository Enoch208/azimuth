"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  DEMO_BEARING_ORIGIN,
  DEMO_SECRET,
  DEMO_TRAIL,
  FOUND_FRAME,
  FRAMES,
  type Frame,
} from "@/lib/hunt-script";
import { FIELD_SIZE, SECTOR_SIZE } from "@/lib/types";

const SECTOR_LINES = Array.from(
  { length: FIELD_SIZE / SECTOR_SIZE + 1 },
  (_, index) => index * SECTOR_SIZE,
);

const MARK_SIZE = 2.4;
const BEARING_LENGTH = 17;
const BEARING_DEGREES = 45;
const BEARING_SPREAD = 22.5;

const OUTCOME_FILL = {
  warmer: "var(--color-warmer)",
  colder: "var(--color-colder)",
  found: "var(--color-teal-bright)",
} as const;

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

const subscribeToMotionPreference = (onChange: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function useHuntLoop(): { frame: Frame; cycle: number; tick: number } {
  const reducedMotion = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      const settle = setTimeout(() => setTick(FOUND_FRAME), 0);
      return () => clearTimeout(settle);
    }
    const advance = setTimeout(
      () => setTick((current) => current + 1),
      FRAMES[tick % FRAMES.length].ms,
    );
    return () => clearTimeout(advance);
  }, [tick, reducedMotion]);

  return {
    frame: FRAMES[tick % FRAMES.length],
    cycle: Math.floor(tick / FRAMES.length),
    tick,
  };
}

interface HuntDemoProps {
  frame: Frame;
  cycle: number;
  tick: number;
  className?: string;
}

export function HuntDemo({ frame, cycle, tick, className }: HuntDemoProps) {
  const visible = DEMO_TRAIL.slice(0, frame.marks);
  const newest = visible[visible.length - 1];

  return (
    <svg
      viewBox={`0 0 ${FIELD_SIZE} ${FIELD_SIZE}`}
      className={className}
      role="img"
      aria-label={`Hunt replay. ${frame.title}. ${frame.note}`}
    >
      <defs>
        <pattern id="demo-cells" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M 1 0 L 0 0 0 1" fill="none" stroke="var(--color-ink)" strokeWidth="0.07" opacity="0.26" />
        </pattern>
        <clipPath id="demo-clip">
          <rect width={FIELD_SIZE} height={FIELD_SIZE} />
        </clipPath>
        <marker id="demo-bearing-head" markerWidth="4.2" markerHeight="4.2" refX="2.4" refY="2.1" orient="auto">
          <path d="M 0 0.2 L 4 2.1 L 0 4 Z" fill="var(--color-amber-deep)" />
        </marker>
      </defs>

      <rect width={FIELD_SIZE} height={FIELD_SIZE} fill="var(--color-paper-raised)" />

      <g clipPath="url(#demo-clip)">
        <polygon
          points={conePoints}
          fill="var(--color-gold)"
          className="transition-opacity duration-500"
          opacity={frame.bearing ? 0.3 : 0}
        />
      </g>

      <rect width={FIELD_SIZE} height={FIELD_SIZE} fill="url(#demo-cells)" />

      {SECTOR_LINES.map((position) => (
        <g key={position}>
          <line x1={position} y1="0" x2={position} y2={FIELD_SIZE} stroke="var(--color-ink)" strokeWidth="0.16" opacity="0.55" />
          <line x1="0" y1={position} x2={FIELD_SIZE} y2={position} stroke="var(--color-ink)" strokeWidth="0.16" opacity="0.55" />
        </g>
      ))}

      <g className="transition-opacity duration-500" opacity={frame.bearing ? 1 : 0}>
        <line
          x1={origin.x}
          y1={origin.y}
          x2={bearingEnd.x}
          y2={bearingEnd.y}
          stroke="var(--color-amber-deep)"
          strokeWidth="0.62"
          strokeDasharray="2 1.2"
          strokeLinecap="round"
          markerEnd="url(#demo-bearing-head)"
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
      </g>

      {visible.length > 1 ? (
        <polyline
          points={visible.map((mark) => `${mark.at.x + 0.5},${mark.at.y + 0.5}`).join(" ")}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="0.2"
          strokeDasharray="1 1.1"
          opacity="0.4"
        />
      ) : null}

      {visible.map((mark, index) => (
        <rect
          key={`${cycle}-${index}`}
          x={mark.at.x + 0.5 - MARK_SIZE / 2}
          y={mark.at.y + 0.5 - MARK_SIZE / 2}
          width={MARK_SIZE}
          height={MARK_SIZE}
          rx="0.4"
          fill={OUTCOME_FILL[mark.outcome]}
          stroke="var(--color-ink)"
          strokeWidth="0.3"
          className="animate-pop"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      ))}

      {frame.outcome && newest ? (
        <text
          key={tick}
          x={Math.min(FIELD_SIZE - 9, Math.max(9, newest.at.x + 0.5))}
          y={Math.max(7, newest.at.y - 3.2)}
          textAnchor="middle"
          fontSize="6"
          fontWeight="700"
          fontFamily="var(--font-display)"
          letterSpacing="-0.15"
          fill={OUTCOME_FILL[frame.outcome]}
          stroke="var(--color-ink)"
          strokeWidth="1.4"
          paintOrder="stroke"
          strokeLinejoin="round"
          className="animate-flash"
        >
          {frame.title.toUpperCase()}
        </text>
      ) : null}

      {frame.revealed ? (
        <circle
          cx={DEMO_SECRET.x + 0.5}
          cy={DEMO_SECRET.y + 0.5}
          r="3.6"
          fill="none"
          stroke="var(--color-teal-bright)"
          strokeWidth="0.45"
          className="animate-ping-slow"
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      ) : null}

      <rect width={FIELD_SIZE} height={FIELD_SIZE} fill="none" stroke="var(--color-ink)" strokeWidth="0.6" />
    </svg>
  );
}
