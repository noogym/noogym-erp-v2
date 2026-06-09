import type { ReactNode } from "react";

export function Table({ columns, children, containerClassName = "" }: { columns: string[]; children: ReactNode; containerClassName?: string }) {
  return (
    <div className={`overflow-auto rounded-lg border border-white/10 ${containerClassName}`}>
      <table className="min-w-[760px] border-collapse text-left text-sm lg:min-w-full">
        <thead className="bg-white/[0.025] text-xs font-medium text-zinc-300">
          <tr>
            {columns.map((column) => (
              <th key={column} className="sticky top-0 z-10 bg-noogym-panel px-4 py-3">
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
