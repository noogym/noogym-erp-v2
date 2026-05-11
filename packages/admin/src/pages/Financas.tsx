import { CalendarDays, ChevronDown, Download, Plus, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { ExportFinanceModal } from "../components/finance/ExportFinanceModal";
import { FinanceActionModal, type FinanceActionContent } from "../components/finance/FinanceActionModal";
import { FinanceTabs, type FinanceTab } from "../components/finance/FinanceTabs";
import { FinanceCategoryModal, FinanceEntryModal } from "../components/modals/OperationalModals";
import { AccountsTab } from "../components/finance/tabs/AccountsTab";
import { CashFlowTab } from "../components/finance/tabs/CashFlowTab";
import { ExpensesTab } from "../components/finance/tabs/ExpensesTab";
import { OverdueTab } from "../components/finance/tabs/OverdueTab";
import { OverviewTab } from "../components/finance/tabs/OverviewTab";
import { PaymentMethodsTab } from "../components/finance/tabs/PaymentMethodsTab";
import { RevenuesTab } from "../components/finance/tabs/RevenuesTab";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "@noogym/ui";
import { financePeriod } from "../data/financeMock";
import { useFinanceStore } from "../store/financeStore";

export default function Financas() {
  const [activeTab, setActiveTab] = useState<FinanceTab>("Visão geral");
  const [exportOpen, setExportOpen] = useState(false);
  const [entryKind, setEntryKind] = useState<"Receita" | "Despesa" | null>(null);
  const [categoryKind, setCategoryKind] = useState<"Receita" | "Despesa" | null>(null);
  const [action, setAction] = useState<FinanceActionContent | null>(null);
  const records = useFinanceStore((state) => state.records);

  const tabView = useMemo(() => {
    const tabProps = { openAction: setAction, records };
    if (activeTab === "Receitas") return RevenuesTab(tabProps);
    if (activeTab === "Despesas") return ExpensesTab(tabProps);
    if (activeTab === "Contas") return AccountsTab(tabProps);
    if (activeTab === "Métodos de pagamento") return PaymentMethodsTab(tabProps);
    if (activeTab === "Inadimplência") return OverdueTab(tabProps);
    if (activeTab === "Fluxo de caixa") return CashFlowTab(tabProps);
    return OverviewTab({ records, openAction: setAction });
  }, [activeTab, records]);

  return (
    <>
      <div className="page-grid">
        <div className="panel min-w-0 p-4 sm:p-6">
          <PageHeader
            title="Finanças"
            subtitle={tabView.subtitle}
            actions={
              <>
                <Button className="min-w-0 flex-1 px-3 sm:flex-none sm:px-4" icon={<CalendarDays className="h-4 w-4 shrink-0" />}>
                  <span className="min-w-0 truncate">{financePeriod}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button className="shrink-0 px-3 sm:px-4" icon={<Tag className="h-4 w-4" />} onClick={() => setCategoryKind("Despesa")}>
                  Categoria de despesa
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

      <ExportFinanceModal open={exportOpen} activeTab={activeTab} onClose={() => setExportOpen(false)} />
      {entryKind ? <FinanceEntryModal open={Boolean(entryKind)} kind={entryKind} onClose={() => setEntryKind(null)} /> : null}
      {categoryKind ? <FinanceCategoryModal open={Boolean(categoryKind)} kind={categoryKind} onClose={() => setCategoryKind(null)} /> : null}
      <FinanceActionModal action={action} onClose={() => setAction(null)} />
    </>
  );
}
