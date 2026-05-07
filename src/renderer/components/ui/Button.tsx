import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-noogym-lime text-black hover:bg-noogym-lime2 shadow-glow",
  secondary: "border border-white/10 bg-white/[0.045] text-white hover:bg-white/[0.08]",
  ghost: "text-zinc-300 hover:bg-white/[0.06]",
  danger: "border border-red-500/45 bg-red-500/5 text-red-400 hover:bg-red-500/10"
};

export function Button({ className = "", variant = "secondary", icon, children, ...props }: ButtonProps) {
  return (
    <button
      className={`no-drag inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition ${variants[variant]} disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
