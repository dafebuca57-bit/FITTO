const PATHS = {
  sun: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  hanger: 'M10 5a2 2 0 1 1 2 2v1l9 7a1.5 1.5 0 0 1-1 2.6H4a1.5 1.5 0 0 1-1-2.6l9-7',
  user: 'M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  image: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  check: 'M5 12l5 5 9-10',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  clock: 'M12 7v5l3 2',
  snow: 'M12 2v20M3.5 7l17 10M20.5 7l-17 10',
};

export default function Icon({ name, size = 22, stroke = 2, label, style }) {
  const extra =
    name === 'sun' ? <circle cx="12" cy="12" r="4" /> :
    name === 'user' ? <circle cx="12" cy="8" r="4" /> :
    name === 'camera' ? <circle cx="12" cy="13" r="3.5" /> :
    name === 'clock' ? <circle cx="12" cy="12" r="9" /> :
    name === 'mirror' ? <><rect x="6" y="2" width="12" height="20" rx="6" /><path d="M10 8l3 3" /></> : null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" style={style}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {extra}
      {PATHS[name] && <path d={PATHS[name]} />}
    </svg>
  );
}

export function Flame({ size = 18, color = 'var(--lime)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z" fill={color} />
    </svg>
  );
}
