import type { ReactNode } from "react";

interface AuthFeatureItemProps {
  icon: ReactNode;
  title: string;
  description?: string;
  compact?: boolean;
}

export function AuthFeatureItem({ icon, title, description, compact = false }: AuthFeatureItemProps) {
  return (
    <div className={`flex items-center gap-4 2xl:gap-5 ${compact ? "py-2 2xl:py-3" : ""}`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-noogym-lime/55 bg-black/35 text-noogym-lime shadow-glow sm:h-14 sm:w-14 2xl:h-[68px] 2xl:w-[68px]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-white">{title}</p>
        {description ? <p className="mt-1 text-sm leading-6 text-zinc-300 2xl:mt-2">{description}</p> : null}
      </div>
    </div>
  );
}
