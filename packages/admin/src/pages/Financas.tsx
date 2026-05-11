import { CalendarDays, ChevronDown, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { ExportFinanceModal } from "../components/finance/ExportFinanceModal";
import { FinanceActionModal, type FinanceActionContent } from "../components/finance/FinanceActionModal";
import { FinanceTabs, type FinanceTab } from "../components/finance/FinanceTabs";
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
  const [action, setAction] = useState<FinanceActionContent | null>(null);
  const records = useFinanceStore((state) => state.records);

  const tabView = useMemo(() => {
    const tabProps = { openAction: setAction };
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
        <div className="panel p-6">
          <PageHeader
            title="Finanças"
            subtitle={tabView.subtitle}
            actions={
              <>
                <Button icon={<CalendarDays className="h-4 w-4" />}>
                  {financePeriod}
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="primary" icon={<Download className="h-4 w-4" />} onClick={() => setExportOpen(true)}>
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
      <FinanceActionModal action={action} onClose={() => setAction(null)} />
    </>
  );
}
