import { CalendarDays, ChevronDown, Download, Plus, RefreshCw, Tag } from "lucide-react";
import { useMemo, useState } from "react";
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
import { buildLocalFinance } from "../lib/localFinance";
import { useClientsStore } from "../store/clientsStore";
import { useFinanceStore } from "../store/financeStore";
import { useSalesStore } from "../store/salesStore";
import { toastInfo, toastSuccess } from "../store/toastStore";

export default function Financas() {
  const [activeTab, setActiveTab] = useState<FinanceTab>(financeTabs[0]);
  const [exportOpen, setExportOpen] = useState(false);
  const [entryKind, setEntryKind] = useState<"Receita" | "Despesa" | null>(null);
  const [categoryKind, setCategoryKind] = useState<"Receita" | "Despesa" | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [action, setAction] = useState<FinanceActionContent | null>(null);
  const records = useFinanceStore((state) => state.records);
  const accounts = useFinanceStore((state) => state.accounts);
  const loadFinance = useFinanceStore((state) => state.loadOnline);
  const sales = useSalesStore((state) => state.sales);
  const loadSales = useSalesStore((state) => state.loadOnline);
  const clients = useClientsStore((state) => state.clients);
  const loadClients = useClientsStore((state) => state.loadOnline);
  const financeData = useMemo(() => buildLocalFinance({ records, sales, clients, accounts }), [accounts, clients, records, sales]);

  const tabView = useMemo(() => {
    const tabProps = { openAction: setAction, records, data: financeData };
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
    const results = await Promise.allSettled([loadFinance(), loadSales(), loadClients()]);
    const failed = results.filter((result) => result.status === "rejected").length;
    if (failed) toastInfo("Financas locais", `${failed} fontes nao sincronizaram agora; os dados locais continuam disponiveis.`);
    else toastSuccess("Financas atualizadas", "Dados sincronizados e indicadores recalculados.");
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
                <Button className="min-w-0 flex-1 px-3 sm:flex-none sm:px-4" icon={<CalendarDays className="h-4 w-4 shrink-0" />}>
                  <span className="min-w-0 truncate">{financeData.period}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button className="shrink-0 px-3 sm:px-4" icon={<RefreshCw className="h-4 w-4" />} onClick={syncFinance}>
                  Sincronizar
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
      <FinanceActionModal action={action} onClose={() => setAction(null)} />
    </>
  );
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
