import { useState } from "react";
import { toastSuccess } from "../../store/toastStore";
import { FormCheckbox } from "@noogym/ui";
import { FormInput } from "@noogym/ui";
import { FormSelect } from "@noogym/ui";
import { Modal } from "@noogym/ui";
import { Button } from "@noogym/ui";
import { reportsTabs } from "./ReportsTabs";

export function ExportReportModal({
  open,
  activeReport,
  period,
  unit,
  onClose
}: {
  open: boolean;
  activeReport: string;
  period: string;
  unit: string;
  onClose: () => void;
}) {
  const [format, setFormat] = useState("PDF");

  return (
    <Modal
      open={open}
      title="Exportar relatório"
      description="Configure o arquivo gerado para uso offline ou partilha com a equipa."
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              toastSuccess("Relatório exportado", `${activeReport} em ${format} preparado para ${period}.`);
              onClose();
            }}
          >
            Exportar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <FormSelect label="Tipo de relatório" options={[...reportsTabs]} defaultValue={activeReport} />
        <FormSelect label="Formato" options={["PDF", "Excel", "CSV", "JSON"]} value={format} onChange={(event) => setFormat(event.target.value)} />
        <FormInput label="Período" defaultValue={period} />
        <FormSelect label="Unidade" options={[unit, "Todas as unidades"]} defaultValue={unit} />
        <FormCheckbox label="Incluir gráficos" defaultChecked />
        <FormCheckbox label="Incluir tabelas detalhadas" defaultChecked />
      </div>
    </Modal>
  );
}
