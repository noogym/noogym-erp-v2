import { CalendarDays, ChevronDown, Download, Filter, Plus, RefreshCw, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { CashSessionModal } from "../components/finance/CashSessionModal";
import { ExportFinanceModal } from "../components/finance/ExportFinanceModal";
import { FinanceActionModal, type FinanceActionContent } from "../components/finance/FinanceActionModal";
import { FinanceTabs, financeTabs, type FinanceTab } from "../components/finance/FinanceTabs";
import { AccountsTab } from "../components/finance/tabs/AccountsTab";
import { CashFlowTab } from "../components/finance/tabs/CashFlowTab";
import { ExpensesTab } from "../components/finance/tabs/ExpensesTab";
import { OverdueTab } from "../components/finance/tabs/OverdueTab";
import { OverviewTab } from "../components/finance/tabs/OverviewTab";
import { PaymentMethodsTab } from "../components/finance/tabs/PaymentMethodsTab";
import { RevenuesTab } from "../components/finance/tabs/RevenuesTab";
import { PageHeader } from "../components/layout/PageHeader";
import { FinanceAccountModal, FinanceCategoryModal, FinanceEntryModal } from "../components/modals/OperationalModals";
import { Button } from "@noogym/ui";
import type { FinanceSummaryFilters } from "../lib/financeApi";
import { buildLocalFinance } from "../lib/localFinance";
import { useClientsStore } from "../store/clientsStore";
import { useFinanceStore } from "../store/financeStore";
import { useSalesStore } from "../store/salesStore";
import { toastInfo, toastSuccess } from "../store/toastStore";

export default function Financas() {
  const defaultEndDate = toDateInputValue(new Date());
  const defaultStartDate = toDateInputValue(monthStart(new Date()));
  const [activeTab, setActiveTab] = useState<FinanceTab>(financeTabs[0]);
  const [filters, setFilters] = useState<FinanceSummaryFilters>({ startDate: defaultStartDate, endDate: defaultEndDate });
  const [exportOpen, setExportOpen] = useState(false);
  const [entryKind, setEntryKind] = useState<"Receita" | "Despesa" | null>(null);
  const [categoryKind, setCategoryKind] = useState<"Receita" | "Despesa" | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cashMode, setCashMode] = useState<"open" | "close" | null>(null);
  const [action, setAction] = useState<FinanceActionContent | null>(null);
  const records = useFinanceStore((state) => state.records);
  const accounts = useFinanceStore((state) => state.accounts);
  const loadFinance = useFinanceStore((state) => state.loadOnline);
  const remoteDashboard = useFinanceStore((state) => state.remoteDashboard);
  const currentCashSession = useFinanceStore((state) => state.currentCashSession);
  const cashSessions = useFinanceStore((state) => state.cashSessions);
  const openCashSession = useFinanceStore((state) => state.openCashSession);
  const closeCashSession = useFinanceStore((state) => state.closeCashSession);
  const sales = useSalesStore((state) => state.sales);
  const loadSales = useSalesStore((state) => state.loadOnline);
  const clients = useClientsStore((state) => state.clients);
  const loadClients = useClientsStore((state) => state.loadOnline);
  const financeData = useMemo(
    () => remoteDashboard ?? buildLocalFinance({ records, sales, clients, accounts }),
    [accounts, clients, records, remoteDashboard, sales]
  );

  const tabView = useMemo(() => {
    const tabProps = { openAction: setAction, onAddAccount: () => setAccountOpen(true), records, data: financeData };
    const normalizedTab = normalizeTab(activeTab);
    if (activeTab === "Receitas") return RevenuesTab(tabProps);
    if (activeTab === "Despesas") return ExpensesTab(tabProps);
    if (activeTab === "Contas") return AccountsTab(tabProps);
    if (normalizedTab.includes("metodos")) return PaymentMethodsTab(tabProps);
    if (normalizedTab.includes("inadimpl")) return OverdueTab(tabProps);
    if (activeTab === "Fluxo de caixa") return CashFlowTab(tabProps);
    return OverviewTab(tabProps);
  }, [activeTab, financeData, records]);

  const syncFinance = async () => {
    const results = await Promise.allSettled([loadFinance(cleanFilters(filters)), loadSales(), loadClients()]);
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed) toastInfo("Financas locais", `${failed} fontes nao sincronizaram agora; os dados locais continuam disponiveis.`);
    else toastSuccess("Financas atualizadas", "Filtros aplicados e indicadores recalculados.");
  };

  const applyPreset = (preset: "today" | "week" | "month") => {
    const today = new Date();
    const start = preset === "today" ? today : preset === "week" ? addDays(today, -6) : monthStart(today);
    setFilters((current) => ({ ...current, startDate: toDateInputValue(start), endDate: toDateInputValue(today) }));
  };

  const openCashHistory = () => {
    setAction({
      title: "Historico de caixa",
      rows: cashSessions.map((session) => [
        session.openedAt ? new Date(session.openedAt).toLocaleString("pt-AO") : "-",
        session.status === "OPEN" ? "Aberto" : "Fechado",
        money(session.openingAmount),
        money(session.expected.total),
        session.actual ? money(session.actual.total) : "-",
        signedMoney(session.difference)
      ])
    });
  };

  const handleOpenCash = async (payload: Parameters<typeof openCashSession>[0]) => {
    try {
      await openCashSession(payload);
      toastSuccess("Caixa aberto", "Sessao de caixa iniciada com sucesso.");
    } catch {
      toastInfo("Nao foi possivel abrir caixa", "Verifique se ja existe um caixa aberto para esta unidade.");
      throw new Error("cash-open-failed");
    }
  };

  const handleCloseCash = async (id: string, payload: Parameters<typeof closeCashSession>[1]) => {
    try {
      await closeCashSession(id, payload);
      toastSuccess("Caixa fechado", "Fecho de caixa registado com sucesso.");
    } catch {
      toastInfo("Nao foi possivel fechar caixa", "Atualize os dados e tente novamente.");
      throw new Error("cash-close-failed");
    }
  };

  return (
    <>
      <div className="page-grid">
        <div className="panel min-w-0 p-4 sm:p-6">
          <PageHeader
            title="Financas"
            subtitle={tabView.subtitle}
            actions={
              <>
                <div className="flex min-w-0 flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-white/[0.025] p-2">
                  <DateField label="Inicio" value={filters.startDate ?? ""} onChange={(value) => setFilters((current) => ({ ...current, startDate: value || undefined }))} />
                  <DateField label="Fim" value={filters.endDate ?? ""} onChange={(value) => setFilters((current) => ({ ...current, endDate: value || undefined }))} />
                  <label className="grid gap-1 text-[11px] text-zinc-400">
                    Metodo
                    <select
                      className="h-9 rounded-md border border-white/10 bg-black/30 px-3 text-xs text-zinc-100 outline-none focus:border-noogym-lime/70"
                      value={filters.method ?? ""}
                      onChange={(event) => setFilters((current) => ({ ...current, method: event.target.value || undefined }))}
                    >
                      <option value="">Todos</option>
                      <option value="CASH">Dinheiro</option>
                      <option value="CARD">Cartao</option>
                      <option value="MULTICAIXA">Multicaixa</option>
                      <option value="BANK_TRANSFER">Transferencia</option>
                      <option value="PIX">PIX</option>
                    </select>
                  </label>
                  <div className="flex gap-1">
                    <PresetButton onClick={() => applyPreset("today")}>Hoje</PresetButton>
                    <PresetButton onClick={() => applyPreset("week")}>7 dias</PresetButton>
                    <PresetButton onClick={() => applyPreset("month")}>Mes</PresetButton>
                  </div>
                  <Button className="h-9 shrink-0 px-3" icon={<Filter className="h-4 w-4" />} onClick={syncFinance}>
                    Aplicar
                  </Button>
                </div>
                <Button className="shrink-0 px-3 sm:px-4" icon={<RefreshCw className="h-4 w-4" />} onClick={syncFinance}>
                  Sincronizar
                </Button>
                <Button className="shrink-0 px-3 sm:px-4" variant={currentCashSession ? undefined : "primary"} onClick={() => setCashMode(currentCashSession ? "close" : "open")}>
                  {currentCashSession ? "Fechar caixa" : "Abrir caixa"}
                </Button>
                <Button className="shrink-0 px-3 sm:px-4" onClick={openCashHistory}>
                  Historico de caixa
                </Button>
                <Button className="shrink-0 px-3 sm:px-4" icon={<Tag className="h-4 w-4" />} onClick={() => setCategoryKind("Receita")}>
                  Categoria de receita
                </Button>
                <Button className="shrink-0 px-3 sm:px-4" icon={<Tag className="h-4 w-4" />} onClick={() => setCategoryKind("Despesa")}>
                  Categoria de despesa
                </Button>
                <Button className="shrink-0 px-3 sm:px-4" icon={<Plus className="h-4 w-4" />} onClick={() => setAccountOpen(true)}>
                  Nova conta
                </Button>
                <Button className="shrink-0 px-3 sm:px-4" icon={<Plus className="h-4 w-4" />} onClick={() => setEntryKind("Receita")}>
                  Nova receita
                </Button>
                <Button className="shrink-0 px-3 sm:px-4" variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEntryKind("Despesa")}>
                  Nova despesa
                </Button>
                <Button className="shrink-0 px-3 sm:px-4" icon={<Download className="h-4 w-4" />} onClick={() => setExportOpen(true)}>
                  Exportar
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </>
            }
          />
          <FinanceTabs active={activeTab} onChange={setActiveTab} />
          {tabView.main}
        </div>
        {tabView.side}
      </div>

      <ExportFinanceModal open={exportOpen} activeTab={activeTab} data={financeData} onClose={() => setExportOpen(false)} />
      {entryKind ? <FinanceEntryModal open={Boolean(entryKind)} kind={entryKind} onClose={() => setEntryKind(null)} /> : null}
      {categoryKind ? <FinanceCategoryModal open={Boolean(categoryKind)} kind={categoryKind} onClose={() => setCategoryKind(null)} /> : null}
      <FinanceAccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
      {cashMode ? (
        <CashSessionModal
          open={Boolean(cashMode)}
          mode={cashMode}
          session={currentCashSession}
          onClose={() => setCashMode(null)}
          onOpenSession={handleOpenCash}
          onCloseSession={handleCloseCash}
        />
      ) : null}
      <FinanceActionModal action={action} onClose={() => setAction(null)} />
    </>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-[11px] text-zinc-400">
      {label}
      <span className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input
          className="h-9 w-36 rounded-md border border-white/10 bg-black/30 pl-9 pr-3 text-xs text-zinc-100 outline-none focus:border-noogym-lime/70"
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function PresetButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button type="button" className="h-9 rounded-md border border-white/10 px-2 text-xs text-zinc-200 hover:border-noogym-lime/70 hover:text-noogym-lime" onClick={onClick}>
      {children}
    </button>
  );
}

function cleanFilters(filters: FinanceSummaryFilters): FinanceSummaryFilters {
  return {
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    method: filters.method || undefined
  };
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("pt-AO")} Kz`;
}

function signedMoney(value: number) {
  return `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`;
}

function normalizeTab(value: string) {
  return value
    .replace("Ã©", "e")
    .replace("Ãª", "e")
    .replace("Ã£", "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
