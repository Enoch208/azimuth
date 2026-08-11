interface IconProps {
  className?: string;
  strokeWidth?: number;
}

function Frame({
  className,
  strokeWidth = 1.9,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function CrosshairIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="12" r="7.2" />
      <path d="M12 1.6v3.6M12 18.8v3.6M1.6 12h3.6M18.8 12h3.6" />
      <circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" />
    </Frame>
  );
}

export function BearingIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="12" r="9.4" />
      <path d="M7.4 16.6 16.4 7.6" />
      <path d="M11.2 7.6h5.2v5.2" />
      <circle cx="7.4" cy="16.6" r="1.7" fill="currentColor" stroke="none" />
    </Frame>
  );
}

export function SealIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="2.8" y="8.4" width="18.4" height="12.8" rx="3" />
      <path d="M7.6 8.4V6.2a4.4 4.4 0 0 1 8.3-2" />
      <circle cx="12" cy="14.8" r="2.6" />
      <path d="M12 17.4v2.2" />
    </Frame>
  );
}

export function HuntersIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="9" cy="8.4" r="3.4" />
      <path d="M2.9 19.6a6.4 6.4 0 0 1 12.2 0" />
      <path d="M16.2 5.6a3.4 3.4 0 0 1 0 6.6" />
      <path d="M17.6 14.2a6.4 6.4 0 0 1 3.6 5.4" />
    </Frame>
  );
}

export function TimerIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="13.4" r="8.2" />
      <path d="M12 9.2v4.2l2.8 2" />
      <path d="M9.4 1.8h5.2" />
      <path d="M12 1.8v3.4" />
    </Frame>
  );
}

export function BountyIcon(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 5.6 13.7 10.3 18.4 12 13.7 13.7 12 18.4 10.3 13.7 5.6 12 10.3 10.3Z" />
    </Frame>
  );
}
