interface RingData {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  track: string;
}

const rings: RingData[] = [
  { label: 'Cycle', value: 14, max: 28, unit: 'j', color: '#C97A87', track: '#EAD9E3' },
  { label: 'Hydratation', value: 1.6, max: 2, unit: 'L', color: '#12A76B', track: '#C2ECD8' },
  { label: 'Sommeil', value: 7.2, max: 8, unit: 'h', color: '#D69A2D', track: '#FAE9C2' },
];

function ProgressRing({ data, size = 92 }: { data: RingData; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, data.value / data.max);
  const offset = c * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={data.track} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={data.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum text-base font-bold text-aubergine-700 dark:text-sable-100">
            {data.value}
            <span className="text-xs font-medium text-neutral">{data.unit}</span>
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-neutral">{data.label}</span>
    </div>
  );
}

export function HeroMockup() {
  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-ocre-200/40 via-aubergine-200/30 to-emeraude-100/30 blur-2xl dark:from-ocre-400/20 dark:via-aubergine-400/20" />

      <div className="card overflow-hidden rounded-3xl p-5 shadow-soft-lg dark:bg-indigo-300">
        {/* Mock status bar */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral">Bonjour, Aïcha</p>
            <p className="text-sm font-semibold text-aubergine-700 dark:text-sable-100">
              Jour 14 · Fenêtre fertile
            </p>
          </div>
          <span className="chip bg-emeraude-100 text-emeraude-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emeraude-500" />
            Fertile
          </span>
        </div>

        {/* Rings row */}
        <div className="flex items-center justify-around rounded-2xl bg-sable-50 p-4 dark:bg-indigo-200/40">
          {rings.map((r) => (
            <ProgressRing key={r.label} data={r} />
          ))}
        </div>

        {/* Mini trend chart */}
        <div className="mt-4 rounded-2xl bg-sable-50 p-4 dark:bg-indigo-200/40">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral">Température · 7 j</span>
            <span className="tnum text-xs font-semibold text-aubergine-700 dark:text-sable-100">
              36.6 °C
            </span>
          </div>
          <svg viewBox="0 0 240 56" className="w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="heroTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D69A2D" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#D69A2D" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,40 C30,38 45,30 70,28 C95,26 110,34 140,30 C170,26 190,18 215,14 L240,12"
              fill="none"
              stroke="#D69A2D"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M0,40 C30,38 45,30 70,28 C95,26 110,34 140,30 C170,26 190,18 215,14 L240,12 L240,56 L0,56 Z"
              fill="url(#heroTrend)"
            />
          </svg>
        </div>

        {/* Quick cards */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-sable-50 p-3 dark:bg-indigo-200/40">
            <p className="text-xs text-neutral">Règles prévues</p>
            <p className="tnum text-sm font-semibold text-aubergine-700 dark:text-sable-100">dans 14 j</p>
          </div>
          <div className="rounded-xl bg-sable-50 p-3 dark:bg-indigo-200/40">
            <p className="text-xs text-neutral">Pilule</p>
            <p className="text-sm font-semibold text-emeraude-600">prise · 21/28</p>
          </div>
        </div>
      </div>
    </div>
  );
}
