import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`relative block ${className}`}>
      <select
        className="h-10 w-full appearance-none rounded-md border border-white/10 bg-black/20 px-4 pr-9 text-sm text-white outline-none transition focus:border-noogym-lime/70"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
    </label>
  );
}
