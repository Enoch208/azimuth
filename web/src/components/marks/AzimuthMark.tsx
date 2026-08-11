const ROTATIONS = [0, 90, 180, 270];

const POINT = "M50 4 Q53.6 27 61.5 37 L50 40.5 L38.5 37 Q46.4 27 50 4 Z";

const CORE =
  "M50 41.5 Q51.5 48.5 58.5 50 Q51.5 51.5 50 58.5 Q48.5 51.5 41.5 50 Q48.5 48.5 50 41.5 Z";

interface AzimuthMarkProps {
  className?: string;
  coreClassName?: string;
}

export function AzimuthMark({ className, coreClassName = "fill-warmer" }: AzimuthMarkProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {ROTATIONS.map((angle) => (
        <path key={angle} d={POINT} fill="currentColor" transform={`rotate(${angle} 50 50)`} />
      ))}
      <path d={CORE} className={coreClassName} />
    </svg>
  );
}
