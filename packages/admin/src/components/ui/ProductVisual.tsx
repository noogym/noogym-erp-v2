export function ProductVisual({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <div
      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-zinc-950 via-zinc-800 to-black text-center text-xs font-black text-white shadow-inner ${className}`}
    >
      <span className="text-noogym-lime">{label || "PRD"}</span>
    </div>
  );
}
