import { Download } from "lucide-react";
import { Button } from "@noogym/ui";
import { FileUpload } from "../forms/FileUpload";
import { FormSelect } from "@noogym/ui";
import { Modal } from "@noogym/ui";
import { useRef, type ChangeEvent } from "react";

interface ImportModalProps {
  open: boolean;
  title: string;
  fields: string[];
  examples: string[];
  tips: string[];
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  onDownloadTemplate?: () => void;
  onFileSelected?: (file: File) => void;
  selectedFileName?: string;
  previewRows?: string[][];
}

export function ImportModal({ open, title, fields, examples, tips, confirmLabel, onClose, onConfirm, onDownloadTemplate, onFileSelected, selectedFileName, previewRows }: ImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFileSelected?.(file);
  };

  return (
    <Modal
      open={open}
      title={title}
      description="Importe vários registos de uma vez usando um arquivo CSV ou Excel."
      size="lg"
      onClose={onClose}
      footer={<><Button onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={onConfirm}>{confirmLabel}</Button></>}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-noogym-lime">1. Selecionar arquivo</h3>
          <FileUpload label={selectedFileName ? `Arquivo selecionado: ${selectedFileName}` : undefined} formatsText="Formato aceito: CSV. Tamanho máximo: 10MB" onPick={() => inputRef.current?.click()} />
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <h3 className="font-semibold">Dicas para importação</h3>
          <div className="mt-3 space-y-2 text-sm text-zinc-300">
            {tips.map((tip) => <p key={tip}>• {tip}</p>)}
          </div>
          <Button className="mt-4" icon={<Download className="h-4 w-4" />} onClick={onDownloadTemplate}>Modelo CSV</Button>
        </div>
      </div>
      <h3 className="mb-3 mt-5 text-sm font-semibold text-noogym-lime">2. Mapeamento das colunas</h3>
      <div className="rounded-lg border border-white/10">
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 border-b border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-400">
          <span>Coluna do arquivo</span><span>Campo no sistema</span><span>Exemplo</span>
        </div>
        {fields.map((field, index) => (
          <div key={field} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-3 border-b border-white/[0.06] p-3 text-sm last:border-0">
            <span>{field}{index < 3 ? <span className="text-red-400"> *</span> : null}</span>
            <FormSelect label="" options={[field, "Ignorar coluna"]} />
            <span className="text-zinc-400">{examples[index] ?? "-"}</span>
          </div>
        ))}
      </div>
      <h3 className="mb-2 mt-5 text-sm font-semibold text-noogym-lime">3. Pré-visualização</h3>
      {previewRows?.length ? (
        <div className="overflow-auto rounded-lg border border-white/10">
          {previewRows.slice(0, 4).map((row, index) => (
            <div key={`${row.join("-")}-${index}`} className="grid min-w-[640px] grid-cols-6 gap-3 border-b border-white/[0.06] p-3 text-sm last:border-0">
              {row.slice(0, 6).map((cell, cellIndex) => <span key={`${cell}-${cellIndex}`} className="truncate text-zinc-300">{cell || "-"}</span>)}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-400">Após selecionar o arquivo, a pré-visualização dos dados será exibida aqui.</p>
      )}
    </Modal>
  );
}
