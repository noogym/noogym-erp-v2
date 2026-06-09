import { Download } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "../../store/appStore";
import { toastSuccess } from "../../store/toastStore";
import { uid } from "../../lib/storage";
import { FormCheckbox, FormInput, FormSelect, Button, Modal } from "@noogym/ui";
import type { FinanceLocalData } from "../../lib/localFinance";
import { financeTabs } from "./FinanceTabs";

const persistExport = (tab: string, format: string) => {
  if (typeof window === "undefined") return;
  const key = "noogym:finance-exports";
  const current = JSON.parse(window.localStorage.getItem(key) ?? "[]") as Array<{ id: string; tab: string; format: string; createdAt: string }>;
  window.localStorage.setItem(key, JSON.stringify([{ id: uid("FEXP"), tab, format, createdAt: new Date().toISOString() }, ...current].slice(0, 30)));
};

export function ExportFinanceModal({ open, activeTab, data, onClose }: { open: boolean; activeTab: string; data: FinanceLocalData; onClose: () => void }) {
  const [format, setFormat] = useState("PDF");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTables, setIncludeTables] = useState(true);
  const addPendingSync = useAppStore((state) => state.addPendingSync);

  const confirm = () => {
    const exported = exportFinance(activeTab, format, data, includeCharts, includeTables);
    persistExport(activeTab, format);
    addPendingSync();
    toastSuccess("Exportacao preparada", `${activeTab} exportado em ${exported}.`);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Exportar financas"
      description="Prepare um ficheiro financeiro com os dados atuais do sistema."
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={<Download className="h-4 w-4" />} onClick={confirm}>
            Exportar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <FormSelect label="Tab" options={[...financeTabs]} defaultValue={activeTab} />
        <FormSelect label="Formato" options={["PDF", "Excel", "CSV", "JSON"]} value={format} onChange={(event) => setFormat(event.target.value)} />
        <FormInput label="Periodo" defaultValue={data.period} />
        <FormSelect label="Unidade" options={["Unidade Central", "Todas as unidades"]} />
        <FormCheckbox label="Incluir graficos" checked={includeCharts} onChange={(event) => setIncludeCharts(event.target.checked)} />
        <FormCheckbox label="Incluir tabelas detalhadas" checked={includeTables} onChange={(event) => setIncludeTables(event.target.checked)} />
      </div>
    </Modal>
  );
}

function exportFinance(activeTab: string, format: string, data: FinanceLocalData, includeCharts: boolean, includeTables: boolean) {
  const payload = {
    tab: activeTab,
    period: data.period,
    exportedAt: new Date().toISOString(),
    totals: data.totals,
    kpis: kpisForTab(activeTab, data),
    charts: includeCharts ? chartsForTab(activeTab, data) : [],
    tables: includeTables ? tablesForTab(activeTab, data) : []
  };

  if (format === "JSON") {
    download(`${fileBase(activeTab)}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    return "JSON";
  }

  if (format === "PDF") {
    download(`${fileBase(activeTab)}.html`, html(payload), "text/html;charset=utf-8");
    return "HTML imprimivel";
  }

  download(`${fileBase(activeTab)}.csv`, csv(payload), "text/csv;charset=utf-8");
  return format === "Excel" ? "CSV compativel com Excel" : "CSV";
}

function kpisForTab(tab: string, data: FinanceLocalData) {
  const normalized = normalize(tab);
  if (normalized.includes("receita")) return data.revenues.kpis;
  if (normalized.includes("despesa")) return data.expenses.kpis;
  if (normalized.includes("pagamento")) return data.payments.kpis;
  if (normalized.includes("inadimpl")) return data.overdue.kpis;
  if (normalized.includes("fluxo")) return data.cashFlow.kpis;
  return data.overview.kpis;
}

function chartsForTab(tab: string, data: FinanceLocalData) {
  const normalized = normalize(tab);
  if (normalized.includes("receita")) return [data.revenues.evolution, data.revenues.byCategory];
  if (normalized.includes("despesa")) return [data.expenses.evolution, data.expenses.byCategory];
  if (normalized.includes("pagamento")) return [data.payments.evolution, data.payments.distribution];
  if (normalized.includes("inadimpl")) return [data.overdue.evolution, data.overdue.origin];
  if (normalized.includes("fluxo")) return [data.cashFlow.evolution, data.cashFlow.origins, data.cashFlow.exits];
  if (normalized.includes("conta")) return [data.accounts.distribution, data.accounts.cashByAccount];
  return [data.overview.evolution, data.overview.categorySlices];
}

function tablesForTab(tab: string, data: FinanceLocalData) {
  const normalized = normalize(tab);
  if (normalized.includes("receita")) return [{ title: "Receitas", rows: data.revenues.detailRows }];
  if (normalized.includes("despesa")) return [{ title: "Despesas", rows: data.expenses.detailRows }];
  if (normalized.includes("pagamento")) return [{ title: "Metodos", rows: data.payments.performanceRows }];
  if (normalized.includes("inadimpl")) return [{ title: "Inadimplentes", rows: data.overdue.clients }];
  if (normalized.includes("fluxo")) return [{ title: "Fluxo diario", rows: data.cashFlow.dailyRows }];
  if (normalized.includes("conta")) return [{ title: "Contas", rows: data.accounts.table }, { title: "Transacoes", rows: data.accounts.transactions }];
  return [{ title: "Transacoes", rows: data.recentRows }];
}

function csv(payload: ReturnType<typeof payloadShape>) {
  const rows: string[][] = [["Tab", payload.tab], ["Periodo", payload.period], ["Exportado em", payload.exportedAt], [], ["Indicador", "Valor", "Detalhe"]];
  payload.kpis.forEach((kpi) => rows.push([kpi.title, kpi.value, kpi.change ?? ""]));
  payload.tables.forEach((table) => {
    rows.push([], [table.title]);
    table.rows.forEach((row) => rows.push(row));
  });
  return rows.map((row) => row.map(escapeCsv).join(";")).join("\n");
}

function html(payload: ReturnType<typeof payloadShape>) {
  const kpis = payload.kpis.map((kpi) => `<tr><td>${escapeHtml(kpi.title)}</td><td>${escapeHtml(kpi.value)}</td><td>${escapeHtml(kpi.change ?? "")}</td></tr>`).join("");
  const tables = payload.tables.map((table) => `<h2>${escapeHtml(table.title)}</h2><table>${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</table>`).join("");
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8" /><title>${escapeHtml(payload.tab)}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #ddd;padding:8px}h2{margin-top:28px}</style></head><body><h1>${escapeHtml(payload.tab)}</h1><p>${escapeHtml(payload.period)} | ${escapeHtml(payload.exportedAt)}</p><h2>Indicadores</h2><table>${kpis}</table>${tables}</body></html>`;
}

function payloadShape() {
  return {
    tab: "",
    period: "",
    exportedAt: "",
    totals: {} as FinanceLocalData["totals"],
    kpis: [] as FinanceLocalData["overview"]["kpis"],
    charts: [] as unknown[],
    tables: [] as Array<{ title: string; rows: string[][] }>
  };
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
  return `noogym-financas-${normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${new Date().toISOString().slice(0, 10)}`;
}

function normalize(value: string) {
  return value
    .replace("Ã©", "e")
    .replace("Ãª", "e")
    .replace("Ã£", "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeCsv(value: string) {
  const text = String(value ?? "");
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeHtml(value: string) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
