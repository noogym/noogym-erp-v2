import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { ReactNode } from "react";

export type ToastTone = "success" | "info" | "warning" | "error";

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
}

const icons: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  warning: <Info className="h-5 w-5" />,
  error: <XCircle className="h-5 w-5" />
};

const tones: Record<ToastTone, string> = {
  success: "border-noogym-lime/50 text-noogym-lime",
  info: "border-sky-400/50 text-sky-300",
  warning: "border-amber-400/50 text-amber-300",
  error: "border-red-400/50 text-red-300"
};

export function ToastViewport({
  toasts,
  onDismiss
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed right-5 top-20 z-[120] flex w-[360px] flex-col gap-3">
      {toasts.map((toast) => (
        <div key={toast.id} className={`pointer-events-auto rounded-lg border bg-[#071014]/95 p-4 shadow-soft backdrop-blur ${tones[toast.tone]}`}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5">{icons[toast.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">{toast.title}</p>
              {toast.message ? <p className="mt-1 text-sm text-zinc-300">{toast.message}</p> : null}
            </div>
            <button type="button" className="text-zinc-400 hover:text-white" onClick={() => onDismiss(toast.id)} aria-label="Fechar notificacao">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
