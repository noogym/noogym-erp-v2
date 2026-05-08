import { Button } from "../ui/Button";
import { FormCheckbox } from "../forms/FormCheckbox";
import { FormInput } from "../forms/FormInput";
import { FormSelect } from "../forms/FormSelect";
import { Modal } from "./Modal";

interface ExportModalProps {
  open: boolean;
  title: string;
  dataOptions: string[];
  onClose: () => void;
  onConfirm: () => void;
}

export function ExportModal({ open, title, dataOptions, onClose, onConfirm }: ExportModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      description="Selecione as opções para exportação."
      size="lg"
      onClose={onClose}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={onConfirm}>Exportar</Button></>}
    >
      <h3 className="mb-3 text-sm font-semibold text-noogym-lime">1. Formato do arquivo</h3>
      <div className="grid grid-cols-4 gap-3">
        {["CSV", "Excel XLSX", "PDF", "JSON"].map((format, index) => (
          <button key={format} type="button" className={`rounded-lg border p-4 text-center ${index === 0 ? "border-noogym-lime bg-noogym-lime/10" : "border-white/10 bg-white/[0.03]"}`}>
            <span className="block font-semibold">{format}</span>
            <span className="mt-2 block text-xs text-zinc-400">Arquivo para análise e arquivo local.</span>
          </button>
        ))}
      </div>
      <h3 className="mb-3 mt-5 text-sm font-semibold text-noogym-lime">2. Dados para exportar</h3>
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/10 p-3">
        {dataOptions.map((option) => <FormCheckbox key={option} label={option} defaultChecked />)}
        <FormCheckbox label="Selecionar todas as opções" defaultChecked />
      </div>
      <h3 className="mb-3 mt-5 text-sm font-semibold text-noogym-lime">3. Filtros opcionais</h3>
      <div className="grid grid-cols-3 gap-3">
        <FormSelect label="Plano" options={["Todos os planos", "Premium", "Básico", "Day Pass"]} />
        <FormSelect label="Status" options={["Todos", "Ativos", "Inativos"]} />
        <FormInput label="Período de cadastro" defaultValue="01/01/2024 - 31/05/2024" />
      </div>
    </Modal>
  );
}
