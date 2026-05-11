export const financeTabs = ["Visão geral", "Receitas", "Despesas", "Contas", "Métodos de pagamento", "Inadimplência", "Fluxo de caixa"] as const;

export type FinanceTab = (typeof financeTabs)[number];

export function FinanceTabs({ active, onChange }: { active: FinanceTab; onChange: (tab: FinanceTab) => void }) {
  return (
    <div className="mb-4 flex max-w-full min-w-0 gap-4 overflow-x-auto border-b border-white/10 text-sm sm:gap-7">
      {financeTabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`no-drag -mb-px shrink-0 whitespace-nowrap border-b-2 px-1 pb-3 transition ${
            active === tab ? "border-noogym-lime text-noogym-lime" : "border-transparent text-zinc-100 hover:text-noogym-lime"
          }`}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
