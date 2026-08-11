interface SketchUnderlineProps {
  className?: string;
}

export function SketchUnderline({ className }: SketchUnderlineProps) {
  return (
    <svg
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    >
      <path
        d="M3.5 8.4 C 34 4.9, 61 10.6, 95 7.1 C 129 3.7, 158 9.8, 196.5 5.6"
        strokeWidth="6"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M14 12.1 C 52 9.4, 96 13.2, 141 10.1 C 163 8.6, 178 11.2, 189 9.7"
        strokeWidth="3"
        opacity="0.55"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
