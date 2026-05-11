import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col items-start justify-between gap-4 lg:flex-row">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-zinc-300">{subtitle}</p>
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">{actions}</div> : null}
    </div>
  );
}
