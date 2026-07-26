import { create } from "zustand";

export type PosCartKind = "product" | "plan" | "service" | "class";

export type PosCartItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  detail: string;
  emoji: string;
  kind: PosCartKind;
  stock?: number;
  sku?: string;
  qty: number;
};

type PosCartInput = Omit<PosCartItem, "qty">;

interface PosCartState {
  items: PosCartItem[];
  addItem: (item: PosCartInput) => void;
  clear: () => void;
  removeAt: (index: number) => void;
  setItems: (
    next:
      | PosCartItem[]
      | ((items: PosCartItem[]) => PosCartItem[]),
  ) => void;
  setItemQtyAt: (index: number, qty: number) => void;
}

export const usePosCartStore = create<PosCartState>((set) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find(
        (entry) => entry.id === item.id && entry.kind === item.kind,
      );

      if (!existing) return { items: [...state.items, { ...item, qty: 1 }] };

      return {
        items: state.items.map((entry) =>
          entry.id === item.id && entry.kind === item.kind
            ? { ...entry, qty: entry.qty + 1 }
            : entry,
        ),
      };
    }),
  clear: () => set({ items: [] }),
  removeAt: (index) =>
    set((state) => ({
      items: state.items.filter((_, itemIndex) => itemIndex !== index),
    })),
  setItems: (next) =>
    set((state) => ({
      items: typeof next === "function" ? next(state.items) : next,
    })),
  setItemQtyAt: (index, qty) =>
    set((state) => ({
      items: state.items.map((entry, itemIndex) =>
        itemIndex === index ? { ...entry, qty: Math.max(1, qty) } : entry,
      ),
    })),
}));

export const selectPosCartItemsCount = (state: PosCartState) =>
  state.items.reduce((sum, item) => sum + item.qty, 0);
