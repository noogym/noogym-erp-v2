import { create } from "zustand";
import { createExpense, createRevenue, listFinanceRecords } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
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
  loadOnline: () => Promise<void>;
  addRevenue: (record: Partial<FinanceRecord>) => void;
  addExpense: (record: Partial<FinanceRecord>) => void;
  addCategory: (category: Omit<FinanceCategory, "id">) => boolean;
}>((set) => ({
  records: readLocal("noogym:finance", initial),
  categories: readLocal("noogym:finance-categories", initialCategories),
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const records = await listFinanceRecords(token);
    persist(records);
    set({ records });
  },
  addRevenue: (record) => set((state) => {
    const created: FinanceRecord = { id: uid("FIN"), kind: "Receita", category: "Mensalidades", value: 0, date: "Hoje", status: "Recebido", ...record };
    const records = [created, ...state.records];
    persist(records);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) createRevenue(token, created).catch(console.error);

    return { records };
  }),
  addExpense: (record) => set((state) => {
    const created: FinanceRecord = { id: uid("FIN"), kind: "Despesa", category: "Operacional", value: 0, date: "Hoje", status: "Pendente", ...record };
    const records = [created, ...state.records];
    persist(records);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) createExpense(token, created).catch(console.error);

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
