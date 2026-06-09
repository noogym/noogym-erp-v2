import { useState } from "react";
import { toastSuccess } from "../../store/toastStore";
import { FormCheckbox } from "@noogym/ui";
import { FormInput } from "@noogym/ui";
import { FormSelect } from "@noogym/ui";
import { Modal } from "@noogym/ui";
import { Button } from "@noogym/ui";
import type { ReportConfig, ReportSection } from "../../data/reportsMock";
import type { ReportOverview } from "../../lib/reportApi";
import { reportsTabs } from "./ReportsTabs";

export function ExportReportModal({
  open,
  activeReport,
  period,
  unit,
  overview,
  config,
  onClose
}: {
  open: boolean;
  activeReport: string;
  period: string;
  unit: string;
  overview?: ReportOverview | null;
  config?: ReportConfig | null;
  onClose: () => void;
}) {
  const [format, setFormat] = useState("PDF");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTables, setIncludeTables] = useState(true);

  const handleExport = () => {
    const exported = exportReport({
      activeReport,
      period,
      unit,
      format,
      overview,
      config,
      includeCharts,
      includeTables
    });
    toastSuccess("Relatorio exportado", `${activeReport} preparado em ${exported}.`);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Exportar relatorio"
      description="Configure o arquivo gerado para uso offline ou partilha com a equipa."
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleExport}>
            Exportar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <FormSelect label="Tipo de relatorio" options={[...reportsTabs]} defaultValue={activeReport} />
        <FormSelect label="Formato" options={["PDF", "Excel", "CSV", "JSON"]} value={format} onChange={(event) => setFormat(event.target.value)} />
        <FormInput label="Periodo" defaultValue={period} />
        <FormSelect label="Unidade" options={[unit, "Todas as unidades"]} defaultValue={unit} />
        <FormCheckbox label="Incluir graficos" checked={includeCharts} onChange={(event) => setIncludeCharts(event.target.checked)} />
        <FormCheckbox label="Incluir tabelas detalhadas" checked={includeTables} onChange={(event) => setIncludeTables(event.target.checked)} />
      </div>
    </Modal>
  );
}

function exportReport({
  activeReport,
  period,
  unit,
  format,
  overview,
  config,
  includeCharts,
  includeTables
}: {
  activeReport: string;
  period: string;
  unit: string;
  format: string;
  overview?: ReportOverview | null;
  config?: ReportConfig | null;
  includeCharts: boolean;
  includeTables: boolean;
}) {
  const payload = {
    report: activeReport,
    period,
    unit,
    exportedAt: new Date().toISOString(),
    overview,
    kpis: config?.kpis ?? [],
    sections: filterSections(config?.sections ?? [], includeCharts, includeTables)
  };

  if (format === "JSON") {
    download(`${fileBase(activeReport)}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    return "JSON";
  }

  if (format === "PDF") {
    download(`${fileBase(activeReport)}.html`, htmlReport(payload), "text/html;charset=utf-8");
    return "HTML imprimivel";
  }

  const csv = csvReport(payload);
  download(`${fileBase(activeReport)}.csv`, csv, "text/csv;charset=utf-8");
  return format === "Excel" ? "CSV compativel com Excel" : "CSV";
}

function filterSections(sections: ReportSection[], includeCharts: boolean, includeTables: boolean) {
  return sections.filter((section) => section.type === "table" ? includeTables : includeCharts);
}

function csvReport(payload: {
  report: string;
  period: string;
  unit: string;
  exportedAt: string;
  overview?: ReportOverview | null;
  kpis: ReportConfig["kpis"];
  sections: ReportSection[];
}) {
  const rows: string[][] = [
    ["Relatorio", payload.report],
    ["Periodo", payload.period],
    ["Unidade", payload.unit],
    ["Exportado em", payload.exportedAt],
    [],
    ["Indicador", "Valor", "Detalhe"]
  ];

  payload.kpis.forEach((kpi) => rows.push([kpi.title, kpi.value, kpi.change ?? kpi.detail ?? ""]));

  payload.sections.forEach((section) => {
    rows.push([], [section.title]);
    if (section.type === "table") {
      rows.push(section.table.columns.map((column) => column.label));
      section.table.rows.forEach((row) => rows.push(section.table.columns.map((column) => row[column.key] ?? "")));
      return;
    }
    if ("series" in section) {
      rows.push(["Ponto", ...section.series.labels]);
      rows.push(["Valor", ...section.series.values.map(String)]);
      if (section.series.compare?.length) rows.push(["Comparacao", ...section.series.compare.map(String)]);
      return;
    }
    if (section.type === "donut") {
      rows.push(["Item", "Percentual", "Detalhe"]);
      section.items.forEach((item) => rows.push([item.label, String(item.value), item.detail ?? ""]));
      return;
    }
    if (section.type === "horizontal") {
      rows.push(["Item", "Valor"]);
      section.labels.forEach((label, index) => rows.push([label, String(section.values[index] ?? 0)]));
      return;
    }
    if (section.type === "summary") {
      rows.push(["Item", "Valor", "Tendencia"]);
      section.items.forEach((item) => rows.push([item.label, item.value, item.trend ?? ""]));
      return;
    }
    if (section.type === "heatmap") {
      rows.push(["Horario", ...section.columns]);
      section.rows.forEach((row, index) => rows.push([row, ...(section.values[index] ?? []).map(String)]));
    }
  });

  return rows.map((row) => row.map(escapeCsv).join(";")).join("\n");
}

function htmlReport(payload: {
  report: string;
  period: string;
  unit: string;
  exportedAt: string;
  overview?: ReportOverview | null;
  kpis: ReportConfig["kpis"];
  sections: ReportSection[];
}) {
  const kpis = payload.kpis.map((kpi) => `<tr><td>${escapeHtml(kpi.title)}</td><td>${escapeHtml(kpi.value)}</td><td>${escapeHtml(kpi.change ?? kpi.detail ?? "")}</td></tr>`).join("");
  const sections = payload.sections.map((section) => {
    if (section.type === "table") {
      const head = section.table.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
      const body = section.table.rows.map((row) => `<tr>${section.table.columns.map((column) => `<td>${escapeHtml(row[column.key] ?? "")}</td>`).join("")}</tr>`).join("");
      return `<h2>${escapeHtml(section.title)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    }
    if (section.type === "summary") {
      return `<h2>${escapeHtml(section.title)}</h2><ul>${section.items.map((item) => `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</li>`).join("")}</ul>`;
    }
    return `<h2>${escapeHtml(section.title)}</h2><pre>${escapeHtml(JSON.stringify(section, null, 2))}</pre>`;
  }).join("");

  return `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(payload.report)}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#111;margin:32px}
    h1{margin:0 0 8px}
    h2{margin-top:28px}
    table{border-collapse:collapse;width:100%;margin-top:12px}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}
    th{background:#f4f4f4}
    pre{white-space:pre-wrap;background:#f7f7f7;padding:12px}
  </style>
</head>
<body>
  <h1>${escapeHtml(payload.report)}</h1>
  <p>${escapeHtml(payload.period)} | ${escapeHtml(payload.unit)} | ${escapeHtml(payload.exportedAt)}</p>
  <h2>Indicadores</h2>
  <table><thead><tr><th>Indicador</th><th>Valor</th><th>Detalhe</th></tr></thead><tbody>${kpis}</tbody></table>
  ${sections}
</body>
</html>`;
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fileBase(value: string) {
  return `noogym-${value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${new Date().toISOString().slice(0, 10)}`;
}

function escapeCsv(value: string) {
  const text = String(value ?? "");
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
