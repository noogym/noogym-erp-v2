import type { ReportTableData } from "../../data/reportsMock";

export function ReportTable({ table, dense = false }: { table: ReportTableData; dense?: boolean }) {
  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="text-xs text-zinc-400">
          <tr className="border-b border-white/10">
            {table.columns.map((column) => (
              <th key={column.key} className={`px-2 py-2 font-medium ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={`${Object.values(row).join("-")}-${index}`} className="table-row">
              {table.columns.map((column) => (
                <td key={column.key} className={`px-2 ${dense ? "py-2" : "py-3"} text-zinc-200 ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""}`}>
                  <Cell value={row[column.key] ?? ""} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ value }: { value: string }) {
  const alert = value === "Crítico";
  const badge = alert || value === "Baixo" || value === "Inscrito" || value === "Vagas" || value === "Excelente" || value === "Muito bom" || value === "Bom";
  if (!badge) return <span>{value}</span>;

  const className = alert
    ? "border-red-500/50 bg-red-500/10 text-red-300"
    : value === "Baixo" || value === "Bom"
      ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-300"
      : "border-noogym-lime/50 bg-noogym-lime/10 text-noogym-lime";

  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs ${className}`}>{value}</span>;
}
