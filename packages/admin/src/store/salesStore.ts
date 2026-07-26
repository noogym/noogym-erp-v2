import { create } from "zustand";
import { apiRequest } from "../lib/api";
import { createResource, listResource, saleFromApi, saleToDto, updateResource } from "../lib/domainApi";
import { scopeByGym } from "../lib/gymScope";
import { readLocal, readLocalDb, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import { useNotificationsStore } from "./notificationsStore";
import { toastInfo } from "./toastStore";
import type { SaleItemRecord, SaleRecord } from "@noogym/types";

const persist = (sales: SaleRecord[], sync = false) => writeLocal("noogym:sales", sales, { sync });
const initialSales = readLocal("noogym:sales", [] as SaleRecord[]);

export const useSalesStore = create<{
  sales: SaleRecord[];
  revenue: number;
  loadLocal: () => Promise<void>;
  loadOnline: () => Promise<void>;
  addSale: (sale: Partial<SaleRecord>, items?: SaleItemRecord[]) => void;
  updateSale: (id: string, sale: Partial<SaleRecord>, items?: SaleItemRecord[]) => void;
  cancelSale: (id: string) => void;
  convertQuote: (id: string) => void;
}>((set, get) => ({
  sales: initialSales,
  revenue: initialSales.reduce((sum, sale) => sum + sale.total, 0),
  loadLocal: async () => {
    const sales = scopeByGym(
      await readLocalDb("noogym:sales", [] as SaleRecord[], { seedMissing: false }),
      useAppStore.getState().activeGymId,
    );
    set({ sales, revenue: sales.reduce((sum, sale) => sum + sale.total, 0) });
  },
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const activeGymId = useAppStore.getState().activeGymId ?? undefined;
    const apiSales = await listResource<Record<string, unknown>>("sales", token, { gymId: activeGymId });
    const sales = apiSales.map(saleFromApi);
    persist(sales);
    set({ sales, revenue: sales.reduce((sum, sale) => sum + sale.total, 0) });
  },
  addSale: (sale, items = []) => set((state) => {
    const record: SaleRecord = {
      id: uid("SALE"),
      gymId: sale.gymId ?? useAppStore.getState().activeGymId ?? undefined,
      cashSessionId: sale.cashSessionId,
      receiptNumber: sale.receiptNumber ?? `REC-${new Date().getFullYear()}-${String(state.sales.length + 1).padStart(5, "0")}`,
      total: sale.total ?? 0,
      subtotal: sale.subtotal ?? sale.total ?? 0,
      discountAmount: sale.discountAmount ?? 0,
      discountReason: sale.discountReason,
      taxAmount: sale.taxAmount ?? 0,
      amountReceived: sale.amountReceived,
      changeAmount: sale.changeAmount,
      paymentReference: sale.paymentReference,
      customer: sale.customer,
      memberId: sale.memberId,
      seller: sale.seller ?? "Admin",
      type: sale.type ?? "Venda normal",
      status: sale.status ?? (sale.type === "Orcamento" || sale.type === "Orçamento" ? "Orcamento" : "Concluida"),
      paymentMethod: sale.paymentMethod ?? "Dinheiro",
      dateTime: sale.dateTime ?? "Hoje, 10:30",
      soldAtIso: sale.soldAtIso,
      notes: sale.notes,
      items,
      payments: sale.payments
    };
    const sales = [record, ...state.sales];
    persist(sales, true);
    useAppStore.getState().addPendingSync();
    useNotificationsStore.getState().addNotification({
      sourceId: `event:sales:created:${record.id}`,
      title: record.status === "Orcamento" ? "Orcamento criado" : "Venda concluida",
      description: `${record.total.toLocaleString("pt-AO")} Kz - ${record.paymentMethod}.`,
      category: "sales",
      tone: record.status === "Orcamento" ? "info" : "success",
      route: "vendas",
      actionLabel: "Ver vendas"
    });

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      createResource<Record<string, unknown>>("sales", token, saleToDto(record, items))
        .then((apiSale) => {
          const synced = saleFromApi(apiSale);
          const nextSales = get().sales.map((item) => item.id === record.id ? synced : item);
          persist(nextSales);
          set({ sales: nextSales, revenue: nextSales.reduce((sum, item) => sum + item.total, 0) });
        })
        .catch(() => toastInfo("Venda salva localmente", "Nao foi possivel sincronizar com a API agora. Confirme se o servidor esta online."));
    }

    return { sales, revenue: state.revenue + record.total };
  }),
  updateSale: (id, sale, items = []) => set((state) => {
    const existing = state.sales.find((item) => item.id === id);
    if (!existing) return state;
    const record: SaleRecord = {
      ...existing,
      ...sale,
      id,
      gymId: sale.gymId ?? existing.gymId ?? useAppStore.getState().activeGymId ?? undefined,
      total: sale.total ?? existing.total,
      subtotal: sale.subtotal ?? sale.total ?? existing.subtotal ?? existing.total,
      discountAmount: sale.discountAmount ?? existing.discountAmount ?? 0,
      taxAmount: sale.taxAmount ?? existing.taxAmount ?? 0,
      seller: sale.seller ?? existing.seller,
      type: sale.type ?? existing.type,
      status: sale.status ?? existing.status,
      paymentMethod: sale.paymentMethod ?? existing.paymentMethod,
      dateTime: sale.dateTime ?? existing.dateTime,
      soldAtIso: sale.soldAtIso ?? existing.soldAtIso,
      items: items.length ? items : existing.items,
      payments: sale.payments ?? existing.payments
    };
    const sales = state.sales.map((item) => item.id === id ? record : item);
    persist(sales, true);
    useAppStore.getState().addPendingSync();
    useNotificationsStore.getState().addNotification({
      sourceId: `event:sales:updated:${record.id}:${Date.now()}`,
      title: record.status === "Orcamento" ? "Orcamento atualizado" : "Venda atualizada",
      description: `${record.total.toLocaleString("pt-AO")} Kz - ${record.paymentMethod}.`,
      category: "sales",
      tone: "info",
      route: "vendas",
      actionLabel: "Ver vendas"
    });

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token && !id.startsWith("SALE")) {
      updateResource<Record<string, unknown>>("sales", id, token, saleToDto(record, record.items ?? []))
        .then((apiSale) => {
          const synced = saleFromApi(apiSale);
          const nextSales = get().sales.map((item) => item.id === id ? synced : item);
          persist(nextSales);
          set({ sales: nextSales, revenue: nextSales.reduce((sum, item) => item.status === "Cancelada" ? sum : sum + item.total, 0) });
        })
        .catch(() => toastInfo("Orcamento salvo localmente", "Nao foi possivel atualizar o orcamento na API agora."));
    }

    return { sales, revenue: sales.reduce((sum, item) => item.status === "Cancelada" ? sum : sum + item.total, 0) };
  }),
  cancelSale: (id) => set((state) => {
    const sales = state.sales.map((sale) => sale.id === id ? { ...sale, status: "Cancelada" } : sale);
    persist(sales, true);
    useAppStore.getState().addPendingSync();
    const cancelled = sales.find((sale) => sale.id === id);
    if (cancelled) {
      useNotificationsStore.getState().addNotification({
        sourceId: `event:sales:cancelled:${id}`,
        title: "Venda cancelada",
        description: `${cancelled.total.toLocaleString("pt-AO")} Kz removidos do resumo.`,
        category: "sales",
        tone: "warning",
        route: "vendas",
        actionLabel: "Ver vendas"
      });
    }

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token && !id.startsWith("SALE")) {
      apiRequest<Record<string, unknown>>(`/sales/${id}/cancel`, { method: "PATCH", token })
        .then((apiSale) => {
          const synced = saleFromApi(apiSale);
          const nextSales = get().sales.map((sale) => sale.id === id ? synced : sale);
          persist(nextSales);
          set({ sales: nextSales, revenue: nextSales.reduce((sum, sale) => sale.status === "Cancelada" ? sum : sum + sale.total, 0) });
        })
        .catch(() => toastInfo("Cancelamento local", "Nao foi possivel sincronizar o cancelamento com a API agora."));
    }

    return { sales, revenue: sales.reduce((sum, sale) => sale.status === "Cancelada" ? sum : sum + sale.total, 0) };
  }),
  convertQuote: (id) => set((state) => {
    const sales = state.sales.map((sale) => sale.id === id ? { ...sale, type: "Venda normal", status: "Concluida" } : sale);
    persist(sales, true);
    useAppStore.getState().addPendingSync();
    return { sales, revenue: sales.reduce((sum, sale) => sale.status === "Cancelada" ? sum : sum + sale.total, 0) };
  })
}));
