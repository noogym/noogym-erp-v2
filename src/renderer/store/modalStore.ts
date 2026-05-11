import { create } from "zustand";

export type ModalName = string | null;

export const useModalStore = create<{ activeModal: ModalName; openModal: (name: string) => void; closeModal: () => void }>((set) => ({
  activeModal: null,
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null })
}));
