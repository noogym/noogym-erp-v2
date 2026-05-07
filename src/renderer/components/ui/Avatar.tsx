export function Avatar({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-zinc-200 to-zinc-600 text-xs font-semibold text-black ${className}`}
    >
      {label}
    </span>
  );
}
