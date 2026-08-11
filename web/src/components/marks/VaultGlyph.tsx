interface VaultGlyphProps {
  className?: string;
}

export function VaultGlyph({ className }: VaultGlyphProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
      <line x1="16" y1="2.5" x2="16" y2="7.5" stroke="currentColor" strokeWidth="1.8" />
      <line x1="16" y1="24.5" x2="16" y2="29.5" stroke="currentColor" strokeWidth="1.8" />
      <line x1="2.5" y1="16" x2="7.5" y2="16" stroke="currentColor" strokeWidth="1.8" />
      <line x1="24.5" y1="16" x2="29.5" y2="16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
