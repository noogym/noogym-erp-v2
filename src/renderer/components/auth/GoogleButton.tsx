import type { ButtonHTMLAttributes } from "react";

interface GoogleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: string;
}

export function GoogleButton({ children, className = "", ...props }: GoogleButtonProps) {
  return (
    <button
      type="button"
      className={`no-drag flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-zinc-500/70 bg-black/10 text-base font-semibold text-white transition hover:border-noogym-lime/60 hover:bg-white/[0.045] sm:h-14 2xl:h-[64px] 2xl:gap-4 2xl:text-lg ${className}`}
      {...props}
    >
      <span className="text-2xl font-bold">
        <span className="text-[#4285F4]">G</span>
      </span>
      {children}
    </button>
  );
}
