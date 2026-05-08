import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore, type ToastTone } from "../../store/toastStore";

const icons: Record<ToastTone, React.ReactNode> = {
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

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

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
            <button type="button" className="text-zinc-400 hover:text-white" onClick={() => removeToast(toast.id)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
