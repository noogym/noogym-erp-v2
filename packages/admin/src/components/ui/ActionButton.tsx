import type { ButtonHTMLAttributes, ReactNode } from "react";

export function ActionButton({ icon, children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode }) {
  return (
    <button type="button" className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-zinc-300 hover:bg-white/[0.06] hover:text-noogym-lime ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
}
