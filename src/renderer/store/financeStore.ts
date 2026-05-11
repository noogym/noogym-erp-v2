import { create } from "zustand";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import type { FinanceRecord } from "./domainTypes";

const initial: FinanceRecord[] = [
  { id: "FIN-001", kind: "Receita", category: "Mensalidades", value: 35000, date: "Hoje", status: "Recebido", note: "Ana Luísa Santos" },
  { id: "FIN-002", kind: "Despesa", category: "Salários", value: 24000, date: "Hoje", status: "Pago", note: "Folha mensal" }
];
const persist = (records: FinanceRecord[]) => writeLocal("noogym:finance", records);

export const useFinanceStore = create<{
  records: FinanceRecord[];
  addRevenue: (record: Partial<FinanceRecord>) => void;
  addExpense: (record: Partial<FinanceRecord>) => void;
}>((set) => ({
  records: readLocal("noogym:finance", initial),
  addRevenue: (record) => set((state) => {
    const records = [{ id: uid("FIN"), kind: "Receita" as const, category: "Mensalidades", value: 0, date: "Hoje", status: "Recebido", ...record }, ...state.records];
    persist(records); useAppStore.getState().addPendingSync(); return { records };
  }),
  addExpense: (record) => set((state) => {
    const records = [{ id: uid("FIN"), kind: "Despesa" as const, category: "Operacional", value: 0, date: "Hoje", status: "Pendente", ...record }, ...state.records];
    persist(records); useAppStore.getState().addPendingSync(); return { records };
  })
}));
