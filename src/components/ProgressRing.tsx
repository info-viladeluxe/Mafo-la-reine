interface ProgressRingProps {
  label: string;
  value: number;
  max: number;
  unit?: string;
  color?: string;
  track?: string;
  size?: number;
  display?: string;
}

export function ProgressRing({
  label,
  value,
  max,
  unit = '',
  color = '#5C2A4D',
  track = '#EAD9E3',
  size = 96,
  display,
}: ProgressRingProps) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const offset = c * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum text-base font-bold text-aubergine-700 dark:text-sable-100">
            {display ?? value}
            {unit && <span className="text-xs font-medium text-neutral">{unit}</span>}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-neutral">{label}</span>
    </div>
  );
}
