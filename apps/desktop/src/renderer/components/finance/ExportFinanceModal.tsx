import { Download } from "lucide-react";
import { useState } from "react";
import { financePeriod } from "../../data/financeMock";
import { useAppStore } from "../../store/appStore";
import { toastSuccess } from "../../store/toastStore";
import { uid } from "../../lib/storage";
import { FormCheckbox } from "@noogym/ui";
import { FormInput } from "@noogym/ui";
import { FormSelect } from "@noogym/ui";
import { Button } from "@noogym/ui";
import { Modal } from "@noogym/ui";

const persistExport = (tab: string, format: string) => {
  if (typeof window === "undefined") return;
  const key = "noogym:finance-exports";
  const current = JSON.parse(window.localStorage.getItem(key) ?? "[]") as Array<{ id: string; tab: string; format: string; createdAt: string }>;
  window.localStorage.setItem(key, JSON.stringify([{ id: uid("FEXP"), tab, format, createdAt: new Date().toISOString() }, ...current].slice(0, 30)));
};

export function ExportFinanceModal({ open, activeTab, onClose }: { open: boolean; activeTab: string; onClose: () => void }) {
  const [format, setFormat] = useState("PDF");
  const addPendingSync = useAppStore((state) => state.addPendingSync);

  const confirm = () => {
    persistExport(activeTab, format);
    addPendingSync();
    toastSuccess("Exportação preparada", `${activeTab} em ${format} foi guardado localmente.`);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Exportar finanças"
      description="Prepare um ficheiro financeiro com dados mockados locais."
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
        <FormSelect label="Tab" options={["Visão geral", "Receitas", "Despesas", "Contas", "Métodos de pagamento", "Inadimplência", "Fluxo de caixa"]} defaultValue={activeTab} />
        <FormSelect label="Formato" options={["PDF", "Excel", "CSV", "JSON"]} value={format} onChange={(event) => setFormat(event.target.value)} />
        <FormInput label="Período" defaultValue={financePeriod} />
        <FormSelect label="Unidade" options={["Unidade Central"]} />
        <FormCheckbox label="Incluir gráficos" defaultChecked />
        <FormCheckbox label="Incluir tabelas detalhadas" defaultChecked />
      </div>
    </Modal>
  );
}
