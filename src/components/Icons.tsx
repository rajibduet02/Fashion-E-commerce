type IconProps = { size?: number };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconSearch({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...base}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16.2 16.2 20.5 20.5" />
    </svg>
  );
}

export function IconHeart({ size = 18, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden stroke="currentColor" strokeWidth="1.5" fill={filled ? "currentColor" : "none"}>
      <path d="M12 19.4 4.8 12.4a4.2 4.2 0 0 1 6-5.9L12 7.6l1.2-1.1a4.2 4.2 0 0 1 6 5.9L12 19.4Z" />
    </svg>
  );
}

export function IconUser({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...base}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.2 19.2c1.4-2.6 3.8-3.9 6.8-3.9s5.4 1.3 6.8 3.9" />
    </svg>
  );
}

export function IconBag({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...base}>
      <path d="M6.2 8.5h11.6l-.8 11H7Z" />
      <path d="M9 8.5V7.2A3 3 0 0 1 12 4.2 3 3 0 0 1 15 7.2v1.3" />
    </svg>
  );
}

export function IconMenu({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...base}>
      <path d="M4 7.5h16M4 12h16M4 16.5h12" />
    </svg>
  );
}

export function IconClose({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...base}>
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}
