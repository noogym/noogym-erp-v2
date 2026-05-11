import type { ReactNode } from "react";

export function FinanceTable({ columns, children }: { columns: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="min-w-[640px] border-collapse text-left text-sm lg:min-w-full">
        <thead className="bg-white/[0.025] text-xs font-medium text-zinc-400">
          <tr>
            {columns.map((column) => (
              <th key={column} className="whitespace-nowrap px-3 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function FinanceCell({ children, tone }: { children: ReactNode; tone?: "lime" | "red" | "yellow" | "muted" }) {
  const toneClass = tone === "lime" ? "text-noogym-lime" : tone === "red" ? "text-red-400" : tone === "yellow" ? "text-yellow-400" : tone === "muted" ? "text-zinc-400" : "text-zinc-100";
  return <td className={`whitespace-nowrap px-3 py-3 ${toneClass}`}>{children}</td>;
}
