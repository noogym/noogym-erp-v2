import { ToastViewport as SharedToastViewport } from "@noogym/ui";
import { useToastStore } from "../../store/toastStore";

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return <SharedToastViewport toasts={toasts} onDismiss={removeToast} />;
}
