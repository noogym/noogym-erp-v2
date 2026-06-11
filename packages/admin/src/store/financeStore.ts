import { create } from "zustand";
import { createExpense, createRevenue, listFinanceRecords } from "../lib/domainApi";
import {
  closeCashSession as closeCashSessionApi,
  createFinanceAccount,
  createFinanceCategory,
  deleteFinanceCategory,
  getCurrentCashSession,
  getFinanceAccounts,
  getFinanceCategories,
  getFinanceSummary,
  listCashSessions,
  openCashSession as openCashSessionApi,
  updateFinanceAccount,
  updateFinanceCategory
} from "../lib/financeApi";
import type { CashSessionRecord, CloseCashSessionPayload, FinanceSummaryFilters, OpenCashSessionPayload } from "../lib/financeApi";
import type { FinanceLocalData } from "../lib/localFinance";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import { useNotificationsStore } from "./notificationsStore";
import type { FinanceAccountRecord, FinanceRecord } from "@noogym/types";

export type FinanceCategoryKind = "Receita" | "Despesa";

export interface FinanceCategory {
  id: string;
  kind: FinanceCategoryKind;
  name: string;
  description?: string;
}

const initial: FinanceRecord[] = [
  { id: "FIN-001", kind: "Receita", category: "Mensalidades", value: 35000, date: "Hoje", status: "Recebido", note: "Ana Luisa Santos", accountId: "FACC-001", accountName: "Caixa principal", method: "Dinheiro" },
  { id: "FIN-002", kind: "Despesa", category: "Salarios", value: 24000, date: "Hoje", status: "Pago", note: "Folha mensal", accountId: "FACC-002", accountName: "Conta operacional", method: "Transferencia", supplier: "Equipe" }
];

const initialAccounts: FinanceAccountRecord[] = [
  { id: "FACC-001", name: "Caixa principal", bank: "Interno", type: "Caixa", openingBalance: 5000, balance: 40000, status: "Ativa", isDefault: true, color: "#B6FF00" },
  { id: "FACC-002", name: "Conta operacional", bank: "Banco", type: "Corrente", openingBalance: 25000, balance: 1000, status: "Ativa", color: "#38BDF8" },
  { id: "FACC-003", name: "Conta cartoes", bank: "POS", type: "Cartao", openingBalance: 0, balance: 0, status: "Ativa", color: "#A78BFA" }
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
const persistAccounts = (accounts: FinanceAccountRecord[]) => writeLocal("noogym:finance-accounts", accounts);
const normalize = (value: string) => value.trim().toLocaleLowerCase("pt-AO");
const accountTransactionAffectsBalance = (record: FinanceRecord) =>
  record.kind === "Receita" ? record.status === "Recebido" : record.status === "Pago";
const applyRecordToAccounts = (accounts: FinanceAccountRecord[], record: FinanceRecord) => {
  if (!record.accountId || !accountTransactionAffectsBalance(record)) return accounts;
  return accounts.map((account) => {
    if (account.id !== record.accountId) return account;
    const delta = record.kind === "Receita" ? record.value : -record.value;
    return { ...account, balance: account.balance + delta };
  });
};
const accountSnapshot = (accounts: FinanceAccountRecord[], accountId?: string) => {
  const account = accounts.find((item) => item.id === accountId) ?? accounts.find((item) => item.isDefault) ?? accounts[0];
  return { accountId: account?.id, accountName: account?.name };
};

export const useFinanceStore = create<{
  records: FinanceRecord[];
  categories: FinanceCategory[];
  accounts: FinanceAccountRecord[];
  remoteDashboard: FinanceLocalData | null;
  activeFilters: FinanceSummaryFilters;
  currentCashSession: CashSessionRecord | null;
  cashSessions: CashSessionRecord[];
  loadOnline: (filters?: FinanceSummaryFilters) => Promise<void>;
  loadCashSessions: () => Promise<void>;
  openCashSession: (payload: OpenCashSessionPayload) => Promise<CashSessionRecord | null>;
  closeCashSession: (id: string, payload: CloseCashSessionPayload) => Promise<CashSessionRecord | null>;
  addRevenue: (record: Partial<FinanceRecord>) => void;
  addExpense: (record: Partial<FinanceRecord>) => void;
  addCategory: (category: Omit<FinanceCategory, "id">) => boolean;
  updateCategory: (id: string, category: Partial<Omit<FinanceCategory, "id">>) => boolean;
  removeCategory: (id: string) => boolean;
  addAccount: (account: Partial<FinanceAccountRecord>) => void;
  updateAccount: (id: string, account: Partial<FinanceAccountRecord>) => void;
  addTransfer: (transfer: { fromAccountId: string; toAccountId: string; value: number; date?: string; note?: string }) => void;
}>((set, get) => ({
  records: readLocal("noogym:finance", initial),
  categories: readLocal("noogym:finance-categories", initialCategories),
  accounts: readLocal("noogym:finance-accounts", initialAccounts),
  remoteDashboard: null,
  activeFilters: {},
  currentCashSession: null,
  cashSessions: [],
  loadOnline: async (filters = {}) => {
    const token = useAuthStore.getState().accessToken;
    const activeGymId = useAppStore.getState().activeGymId ?? undefined;
    const scopedFilters = { ...filters, gymId: filters.gymId ?? activeGymId };
    if (!token) {
      set({ activeFilters: scopedFilters, remoteDashboard: null, currentCashSession: null, cashSessions: [] });
      return;
    }
    const [records, accounts, categories, remoteDashboard, currentCashSession, cashSessions] = await Promise.all([
      listFinanceRecords(token, scopedFilters),
      getFinanceAccounts(token),
      getFinanceCategories(token),
      getFinanceSummary(token, scopedFilters),
      getCurrentCashSession(token, scopedFilters.gymId),
      listCashSessions(token)
    ]);
    persist(records);
    persistAccounts(accounts);
    persistCategories(categories);
    set({ records, accounts, categories, remoteDashboard, currentCashSession, cashSessions, activeFilters: scopedFilters });
  },
  loadCashSessions: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const activeGymId = useAppStore.getState().activeGymId ?? undefined;
    const [currentCashSession, cashSessions] = await Promise.all([
      getCurrentCashSession(token, activeGymId),
      listCashSessions(token)
    ]);
    set({ currentCashSession, cashSessions });
  },
  openCashSession: async (payload) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) throw new Error("AUTH_REQUIRED");
    const session = await openCashSessionApi(token, payload);
    const cashSessions = await listCashSessions(token);
    set({ currentCashSession: session, cashSessions });
    return session;
  },
  closeCashSession: async (id, payload) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) throw new Error("AUTH_REQUIRED");
    const session = await closeCashSessionApi(token, id, payload);
    const [currentCashSession, cashSessions] = await Promise.all([
      getCurrentCashSession(token),
      listCashSessions(token)
    ]);
    set({ currentCashSession, cashSessions });
    return session;
  },
  addRevenue: (record) => set((state) => {
    const target = accountSnapshot(state.accounts, record.accountId);
    const created: FinanceRecord = { id: uid("FIN"), gymId: useAppStore.getState().activeGymId ?? undefined, kind: "Receita", category: "Mensalidades", value: 0, date: "Hoje", status: "Recebido", ...target, method: "Dinheiro", ...record };
    const records = [created, ...state.records];
    const accounts = applyRecordToAccounts(state.accounts, created);
    persist(records);
    persistAccounts(accounts);
    useAppStore.getState().addPendingSync();
    useNotificationsStore.getState().addNotification({
      sourceId: `event:finance:revenue:${created.id}`,
      title: "Receita registada",
      description: `${created.category} - ${created.value.toLocaleString("pt-AO")} Kz.`,
      category: "finance",
      tone: "success",
      route: "financas",
      actionLabel: "Ver financas"
    });

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) createRevenue(token, created).catch(console.error);

    return { records, accounts };
  }),
  addExpense: (record) => set((state) => {
    const target = accountSnapshot(state.accounts, record.accountId);
    const created: FinanceRecord = { id: uid("FIN"), gymId: useAppStore.getState().activeGymId ?? undefined, kind: "Despesa", category: "Operacional", value: 0, date: "Hoje", status: "Pendente", ...target, method: "Transferencia", ...record };
    const records = [created, ...state.records];
    const accounts = applyRecordToAccounts(state.accounts, created);
    persist(records);
    persistAccounts(accounts);
    useAppStore.getState().addPendingSync();
    useNotificationsStore.getState().addNotification({
      sourceId: `event:finance:expense:${created.id}`,
      title: created.status === "Pago" ? "Despesa paga" : "Despesa pendente",
      description: `${created.category} - ${created.value.toLocaleString("pt-AO")} Kz.`,
      category: "finance",
      tone: created.status === "Pago" ? "info" : "warning",
      route: "financas",
      actionLabel: "Ver financas"
    });

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) createExpense(token, created).catch(console.error);

    return { records, accounts };
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
      const token = useAuthStore.getState().accessToken;
      if (useAppStore.getState().onlineOnly && token) createFinanceCategory(token, { ...category, name }).catch(console.error);
      return { categories };
    });
    return created;
  },
  updateCategory: (id, category) => {
    let updated = false;
    set((state) => {
      const current = state.categories.find((item) => item.id === id);
      if (!current) return state;
      const name = category.name?.trim() ?? current.name;
      const duplicate = state.categories.some((item) => item.id !== id && item.kind === (category.kind ?? current.kind) && normalize(item.name) === normalize(name));
      if (!name || duplicate) return state;
      const categories = state.categories.map((item) => item.id === id ? { ...item, ...category, name } : item);
      persistCategories(categories);
      updated = true;
      const token = useAuthStore.getState().accessToken;
      if (useAppStore.getState().onlineOnly && token) updateFinanceCategory(token, id, { ...category, name }).catch(console.error);
      return { categories };
    });
    return updated;
  },
  removeCategory: (id) => {
    let removed = false;
    set((state) => {
      const category = state.categories.find((item) => item.id === id);
      if (!category) return state;
      const inUse = state.records.some((record) => record.kind === category.kind && normalize(record.category) === normalize(category.name));
      if (inUse) return state;
      const categories = state.categories.filter((item) => item.id !== id);
      persistCategories(categories);
      removed = true;
      const token = useAuthStore.getState().accessToken;
      if (useAppStore.getState().onlineOnly && token) deleteFinanceCategory(token, id).catch(console.error);
      return { categories };
    });
    return removed;
  },
  addAccount: (account) => set((state) => {
    const created: FinanceAccountRecord = {
      id: uid("FACC"),
      name: account.name?.trim() || "Nova conta",
      bank: account.bank,
      type: account.type ?? "Corrente",
      openingBalance: account.openingBalance ?? 0,
      balance: account.balance ?? account.openingBalance ?? 0,
      status: account.status ?? "Ativa",
      isDefault: account.isDefault,
      color: account.color ?? "#B6FF00"
    };
    const accounts = [created, ...state.accounts.map((item) => created.isDefault ? { ...item, isDefault: false } : item)];
    persistAccounts(accounts);
    useAppStore.getState().addPendingSync();
    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) createFinanceAccount(token, created).catch(console.error);
    return { accounts };
  }),
  updateAccount: (id, account) => set((state) => {
    const accounts = state.accounts.map((item) => item.id === id ? { ...item, ...account, isDefault: account.isDefault ? true : item.isDefault } : account.isDefault ? { ...item, isDefault: false } : item);
    persistAccounts(accounts);
    useAppStore.getState().addPendingSync();
    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) updateFinanceAccount(token, id, account).catch(console.error);
    return { accounts };
  }),
  addTransfer: ({ fromAccountId, toAccountId, value, date = "Hoje", note = "Transferencia entre contas" }) => set((state) => {
    if (fromAccountId === toAccountId || value <= 0) return state;
    const from = state.accounts.find((account) => account.id === fromAccountId);
    const to = state.accounts.find((account) => account.id === toAccountId);
    if (!from || !to) return state;
    const records: FinanceRecord[] = [
      { id: uid("FIN"), kind: "Despesa", category: "Transferencia", value, date, status: "Pago", note, accountId: from.id, accountName: from.name, method: "Transferencia" },
      { id: uid("FIN"), kind: "Receita", category: "Transferencia", value, date, status: "Recebido", note, accountId: to.id, accountName: to.name, method: "Transferencia" },
      ...state.records
    ];
    const accounts = state.accounts.map((account) => {
      if (account.id === from.id) return { ...account, balance: account.balance - value };
      if (account.id === to.id) return { ...account, balance: account.balance + value };
      return account;
    });
    persist(records);
    persistAccounts(accounts);
    useAppStore.getState().addPendingSync();
    useNotificationsStore.getState().addNotification({
      sourceId: `event:finance:transfer:${records[0].id}:${records[1].id}`,
      title: "Transferencia entre contas",
      description: `${value.toLocaleString("pt-AO")} Kz movimentados entre contas.`,
      category: "finance",
      tone: "info",
      route: "financas",
      actionLabel: "Ver contas"
    });
    return { records, accounts };
  })
}));
