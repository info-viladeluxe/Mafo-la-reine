export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo.png"
        alt="Mafo"
        className="h-9 w-9 shrink-0 object-contain"
        width={36}
        height={36}
      />
      <span className="text-xl font-bold tracking-tight text-aubergine-700 dark:text-sable-100">
        Mafo
      </span>
    </div>
  );
}
