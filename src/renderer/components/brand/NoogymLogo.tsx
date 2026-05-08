import type { HTMLAttributes } from "react";

type LogoVariant = "mark" | "wordmark" | "compact";

interface NoogymLogoProps extends HTMLAttributes<HTMLDivElement> {
  variant?: LogoVariant;
  markClassName?: string;
  textClassName?: string;
}

function NoogymMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 96" fill="none" role="img" aria-label="Noogym">
      <path
        d="M28 76V47.5C28 24.4 46.6 12 68.1 12C84.2 12 96.8 18.8 108 32.4L139.6 70.6C153.5 87.4 180.5 86.5 194.2 68.3C207.7 50.3 202.8 24.7 183.8 14.7C166.6 5.7 147.4 10.7 136.7 23.9"
        stroke="currentColor"
        strokeWidth="18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NoogymLogo({ variant = "wordmark", className = "", markClassName = "", textClassName = "", ...props }: NoogymLogoProps) {
  if (variant === "mark") {
    return (
      <div className={`inline-flex items-center text-noogym-lime ${className}`} {...props}>
        <NoogymMark className={`h-full w-full ${markClassName}`} />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-2 text-noogym-lime ${className}`} {...props}>
        <NoogymMark className={`h-8 w-16 ${markClassName}`} />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 ${className}`} {...props}>
      <NoogymMark className={`h-10 w-[92px] text-noogym-lime ${markClassName}`} />
      <span className={`text-2xl font-semibold leading-none tracking-normal text-white ${textClassName}`}>
        <span className="text-noogym-lime">noo</span>gym
      </span>
    </div>
  );
}
