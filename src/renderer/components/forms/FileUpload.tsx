import { UploadCloud } from "lucide-react";
import { Button } from "../ui/Button";

export function FileUpload({ label = "Arraste e solte seu arquivo aqui", onPick }: { label?: string; onPick?: () => void }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-noogym-lime/35 bg-noogym-lime/[0.03] p-5 text-center">
      <UploadCloud className="mb-3 h-10 w-10 text-noogym-lime" />
      <p className="text-sm">{label}</p>
      <p className="mt-2 text-xs text-zinc-400">Formatos aceitos: CSV, XLSX. Tamanho máximo: 10MB</p>
      <Button className="mt-4" onClick={onPick}>Selecionar arquivo</Button>
    </div>
  );
}
