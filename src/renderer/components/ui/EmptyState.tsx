import type { ReactNode } from "react";

export function EmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] p-6 text-center">
      {icon ? <span className="mb-3 text-noogym-lime">{icon}</span> : null}
      <p className="font-semibold">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-zinc-400">{description}</p> : null}
    </div>
  );
}
