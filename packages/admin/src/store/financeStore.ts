import { create } from "zustand";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import type { FinanceRecord } from "@noogym/types";

export type FinanceCategoryKind = "Receita" | "Despesa";

export interface FinanceCategory {
  id: string;
  kind: FinanceCategoryKind;
  name: string;
  description?: string;
}

const initial: FinanceRecord[] = [
  { id: "FIN-001", kind: "Receita", category: "Mensalidades", value: 35000, date: "Hoje", status: "Recebido", note: "Ana Luisa Santos" },
  { id: "FIN-002", kind: "Despesa", category: "Salarios", value: 24000, date: "Hoje", status: "Pago", note: "Folha mensal" }
];

const initialCategories: FinanceCategory[] = [
  { id: "FINCAT-001", kind: "Receita", name: "Mensalidades" },
  { id: "FINCAT-002", kind: "Receita", name: "Vendas POS" },
  { id: "FINCAT-003", kind: "Receita", name: "Aulas avulsas" },
  { id: "FINCAT-004", kind: "Despesa", name: "Salarios" },
  { id: "FINCAT-005", kind: "Despesa", name: "Aluguel" },
  { id: "FINCAT-006", kind: "Despesa", name: "Marketing" },
  { id: "FINCAT-007", kind: "Despesa", name: "Manutencao" },
  { id: "FINCAT-008", kind: "Despesa", name: "Operacional" }
];

const persist = (records: FinanceRecord[]) => writeLocal("noogym:finance", records);
const persistCategories = (categories: FinanceCategory[]) => writeLocal("noogym:finance-categories", categories);
const normalize = (value: string) => value.trim().toLocaleLowerCase("pt-AO");

export const useFinanceStore = create<{
  records: FinanceRecord[];
  categories: FinanceCategory[];
  addRevenue: (record: Partial<FinanceRecord>) => void;
  addExpense: (record: Partial<FinanceRecord>) => void;
  addCategory: (category: Omit<FinanceCategory, "id">) => boolean;
}>((set) => ({
  records: readLocal("noogym:finance", initial),
  categories: readLocal("noogym:finance-categories", initialCategories),
  addRevenue: (record) => set((state) => {
    const records = [{ id: uid("FIN"), kind: "Receita" as const, category: "Mensalidades", value: 0, date: "Hoje", status: "Recebido", ...record }, ...state.records];
    persist(records);
    useAppStore.getState().addPendingSync();
    return { records };
  }),
  addExpense: (record) => set((state) => {
    const records = [{ id: uid("FIN"), kind: "Despesa" as const, category: "Operacional", value: 0, date: "Hoje", status: "Pendente", ...record }, ...state.records];
    persist(records);
    useAppStore.getState().addPendingSync();
    return { records };
  }),
  addCategory: (category) => {
    const name = category.name.trim();
    if (!name) return false;

    let created = false;
    set((state) => {
      const exists = state.categories.some((item) => item.kind === category.kind && normalize(item.name) === normalize(name));
      if (exists) return state;

      const categories = [{ id: uid("FINCAT"), ...category, name }, ...state.categories];
      persistCategories(categories);
      useAppStore.getState().addPendingSync();
      created = true;
      return { categories };
    });
    return created;
  }
}));
