import type { FinanceAccountRecord } from "@noogym/types";
import type { FinanceCategory } from "../store/financeStore";
import type { FinanceLocalData } from "./localFinance";
import { apiPath, apiRequest } from "./api";

export interface FinanceSummaryFilters {
  startDate?: string;
  endDate?: string;
  method?: string;
  gymId?: string;
}

export interface CashAmounts {
  cash: number;
  card: number;
  transfer: number;
  multicaixa: number;
  pix: number;
  other: number;
  total: number;
}

export interface CashSessionRecord {
  id: string;
  organizationId: string;
  gymId?: string;
  gymName?: string;
  status: "OPEN" | "CLOSED";
  openingAmount: number;
  openedAt: string;
  openedBy?: { id: string; name: string; email?: string } | null;
  notes?: string;
  expected: CashAmounts;
  actual?: CashAmounts | null;
  difference: number;
  closedAt?: string;
  closedBy?: { id: string; name: string; email?: string } | null;
  closingNotes?: string;
}

export interface OpenCashSessionPayload {
  gymId?: string;
  openingAmount?: number;
  notes?: string;
}

export interface CloseCashSessionPayload {
  actualCash?: number;
  actualCard?: number;
  actualTransfer?: number;
  actualMulticaixa?: number;
  actualPix?: number;
  actualOther?: number;
  notes?: string;
}

type ApiFinanceAccount = {
  id: string;
  name: string;
  bank?: string | null;
  type?: string;
  openingBalance?: number | string;
  balance?: number | string;
  status?: string;
  isDefault?: boolean;
  color?: string;
};

type ApiFinanceCategory = {
  id: string;
  kind: "Receita" | "Despesa";
  name: string;
  description?: string | null;
  color?: string;
  status?: string;
  displayOrder?: number;
};

export const getFinanceSummary = (token: string, filters?: FinanceSummaryFilters) =>
  apiRequest<FinanceLocalData>(apiPath("/finance/summary", filters ? { ...filters } : undefined), { token });

export const getFinanceAccounts = async (token: string): Promise<FinanceAccountRecord[]> => {
  const accounts = await apiRequest<ApiFinanceAccount[]>("/finance/accounts", { token });
  return accounts.map(accountFromApi);
};

export const createFinanceAccount = (token: string, account: Partial<FinanceAccountRecord>) =>
  apiRequest<ApiFinanceAccount>("/finance/accounts", { method: "POST", token, body: accountToDto(account) });

export const updateFinanceAccount = (token: string, id: string, account: Partial<FinanceAccountRecord>) =>
  apiRequest<ApiFinanceAccount>(`/finance/accounts/${id}`, { method: "PATCH", token, body: accountToDto(account) });

export const getFinanceCategories = async (token: string): Promise<FinanceCategory[]> => {
  const categories = await apiRequest<ApiFinanceCategory[]>("/finance/categories", { token });
  return categories.map(categoryFromApi);
};

export const createFinanceCategory = (token: string, category: Omit<FinanceCategory, "id">) =>
  apiRequest<ApiFinanceCategory>("/finance/categories", { method: "POST", token, body: categoryToDto(category) });

export const updateFinanceCategory = (token: string, id: string, category: Partial<Omit<FinanceCategory, "id">>) =>
  apiRequest<ApiFinanceCategory>(`/finance/categories/${id}`, { method: "PATCH", token, body: categoryToDto(category) });

export const deleteFinanceCategory = (token: string, id: string) =>
  apiRequest<ApiFinanceCategory>(`/finance/categories/${id}`, { method: "DELETE", token });

export const getCurrentCashSession = (token: string, gymId?: string) =>
  apiRequest<CashSessionRecord | null>(apiPath("/finance/cash-sessions/current", { gymId }), { token });

export const listCashSessions = (token: string) =>
  apiRequest<CashSessionRecord[]>("/finance/cash-sessions", { token });

export const openCashSession = (token: string, body: OpenCashSessionPayload) =>
  apiRequest<CashSessionRecord>("/finance/cash-sessions/open", { method: "POST", token, body });

export const closeCashSession = (token: string, id: string, body: CloseCashSessionPayload) =>
  apiRequest<CashSessionRecord>(`/finance/cash-sessions/${id}/close`, { method: "POST", token, body });

function accountFromApi(account: ApiFinanceAccount): FinanceAccountRecord {
  return {
    id: account.id,
    name: account.name,
    bank: account.bank ?? undefined,
    type: accountType(account.type),
    openingBalance: asNumber(account.openingBalance),
    balance: asNumber(account.balance),
    status: account.status === "INACTIVE" || account.status === "Inativa" ? "Inativa" : "Ativa",
    isDefault: account.isDefault,
    color: account.color ?? "#B6FF00"
  };
}

function accountType(value?: string): FinanceAccountRecord["type"] {
  const allowed: FinanceAccountRecord["type"][] = ["Caixa", "Corrente", "Poupanca", "Carteira movel", "Cartao", "Outro"];
  return allowed.includes(value as FinanceAccountRecord["type"]) ? value as FinanceAccountRecord["type"] : "Corrente";
}

function accountToDto(account: Partial<FinanceAccountRecord>) {
  return {
    name: account.name,
    bank: account.bank,
    type: account.type,
    openingBalance: account.openingBalance,
    balance: account.balance,
    status: account.status === "Ativa" ? "ACTIVE" : account.status,
    isDefault: account.isDefault,
    color: account.color
  };
}

function categoryFromApi(category: ApiFinanceCategory): FinanceCategory {
  return {
    id: category.id,
    kind: category.kind,
    name: category.name,
    description: category.description ?? undefined
  };
}

function categoryToDto(category: Partial<Omit<FinanceCategory, "id">>) {
  return {
    kind: category.kind,
    name: category.name,
    description: category.description
  };
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
