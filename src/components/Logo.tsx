export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="relative grid h-9 w-9 place-items-center">
        <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
          <defs>
            <linearGradient id="mafoLogo" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5C2A4D" />
              <stop offset="100%" stopColor="#7D4669" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="18" fill="url(#mafoLogo)" />
          <circle cx="20" cy="20" r="18" fill="none" stroke="#D69A2D" strokeWidth="1.5" opacity="0.55" />
          <path
            d="M20 9c4.5 4 6.5 7.5 6.5 11a6.5 6.5 0 0 1-13 0c0-3.5 2-7 6.5-11z"
            fill="#D69A2D"
            opacity="0.92"
          />
          <circle cx="20" cy="20" r="2.6" fill="#FBF6EE" />
        </svg>
      </span>
      <span className="text-xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">
        Mafo
      </span>
    </div>
  );
}
