import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`relative block ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <input
        className="h-10 w-full rounded-md border border-white/10 bg-black/20 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-noogym-lime/70"
        {...props}
      />
    </label>
  );
}
