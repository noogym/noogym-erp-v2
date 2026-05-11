import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { useAppStore } from "../../store/appStore";
import { toastSuccess } from "../../store/toastStore";
import { uid } from "../../lib/storage";
import { Button } from "@noogym/ui";
import { Modal } from "@noogym/ui";

export interface FinanceActionContent {
  title: string;
  description?: string;
  confirmLabel?: string;
  rows?: string[][];
  children?: ReactNode;
}

const persistFinanceAction = (title: string) => {
  if (typeof window === "undefined") return;
  const key = "noogym:finance-actions";
  const current = JSON.parse(window.localStorage.getItem(key) ?? "[]") as Array<{ id: string; title: string; createdAt: string }>;
  window.localStorage.setItem(key, JSON.stringify([{ id: uid("FACT"), title, createdAt: new Date().toISOString() }, ...current].slice(0, 50)));
};

export function FinanceActionModal({ action, onClose }: { action: FinanceActionContent | null; onClose: () => void }) {
  const addPendingSync = useAppStore((state) => state.addPendingSync);
  if (!action) return null;

  const confirm = () => {
    persistFinanceAction(action.title);
    addPendingSync();
    toastSuccess("Ação registada", "Alteração guardada localmente e pronta para sincronização.");
    onClose();
  };

  return (
    <Modal
      open={Boolean(action)}
      title={action.title}
      description={action.description ?? "Fluxo simulado local-first."}
      size="md"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={<CheckCircle2 className="h-4 w-4" />} onClick={confirm}>
            {action.confirmLabel ?? "Confirmar"}
          </Button>
        </>
      }
    >
      {action.children ?? (
        <div className="space-y-3">
          {(action.rows ?? [["Período", "01/05/2024 - 15/05/2024"], ["Estado", "Pendente de sincronização"]]).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm">
              <span className="text-zinc-400">{label}</span>
              <span className="font-medium text-zinc-100">{value}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
