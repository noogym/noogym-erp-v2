import type { InputHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
  helperText?: string;
  rightElement?: ReactNode;
}

export function AuthInput({ label, icon: Icon, error, helperText, rightElement, className = "", ...props }: AuthInputProps) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-white 2xl:mb-3 2xl:text-base">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-200 2xl:left-5 2xl:h-6 2xl:w-6" />
        <input
          className={`h-12 w-full rounded-lg border bg-black/20 pl-12 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-noogym-lime/80 sm:h-14 sm:text-base 2xl:h-[68px] 2xl:pl-16 ${
            rightElement ? "pr-16" : "pr-5"
          } ${error ? "border-red-400/70" : "border-zinc-500/70"}`}
          {...props}
        />
        {rightElement ? <span className="absolute right-4 top-1/2 -translate-y-1/2">{rightElement}</span> : null}
      </span>
      {helperText ? <span className="mt-2 block text-xs text-zinc-400 2xl:mt-3 2xl:text-sm">{helperText}</span> : null}
      {error ? <span className="mt-2 block text-sm text-red-400">{error}</span> : null}
    </label>
  );
}
