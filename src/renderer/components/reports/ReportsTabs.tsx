import { Tabs } from "../ui/Tabs";

export const reportsTabs = ["Visão geral", "Financeiro", "Clientes", "Check-ins", "Planos", "Aulas", "Treinos", "Vendas (POS)", "Produtos", "Funcionários"] as const;

export type ReportsTabLabel = (typeof reportsTabs)[number];

export function ReportsTabs({ active, onChange }: { active: ReportsTabLabel; onChange: (tab: ReportsTabLabel) => void }) {
  return <Tabs tabs={[...reportsTabs]} active={active} onChange={(tab) => onChange(tab as ReportsTabLabel)} />;
}
