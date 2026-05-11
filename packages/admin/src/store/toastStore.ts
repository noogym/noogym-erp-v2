import { create } from "zustand";
import { uid } from "../lib/storage";

export type ToastTone = "success" | "info" | "warning" | "error";

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (toast) => {
    const id = uid("toast");
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    window.setTimeout(() => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })), 3200);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }))
}));

export const toastSuccess = (title: string, message?: string) => useToastStore.getState().showToast({ title, message, tone: "success" });
export const toastInfo = (title: string, message?: string) => useToastStore.getState().showToast({ title, message, tone: "info" });
