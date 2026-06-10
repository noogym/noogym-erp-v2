import { create } from "zustand";
import { apiRequest } from "../lib/api";
import { createResource, listResource, saleFromApi, saleToDto } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import { useNotificationsStore } from "./notificationsStore";
import { toastInfo } from "./toastStore";
import type { SaleItemRecord, SaleRecord } from "@noogym/types";

const persist = (sales: SaleRecord[]) => writeLocal("noogym:sales", sales);
const initialSales = readLocal("noogym:sales", [] as SaleRecord[]);

export const useSalesStore = create<{
  sales: SaleRecord[];
  revenue: number;
  loadOnline: () => Promise<void>;
  addSale: (sale: Partial<SaleRecord>, items?: SaleItemRecord[]) => void;
  cancelSale: (id: string) => void;
  convertQuote: (id: string) => void;
}>((set, get) => ({
  sales: initialSales,
  revenue: initialSales.reduce((sum, sale) => sum + sale.total, 0),
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const apiSales = await listResource<Record<string, unknown>>("sales", token);
    const sales = apiSales.map(saleFromApi);
    persist(sales);
    set({ sales, revenue: sales.reduce((sum, sale) => sum + sale.total, 0) });
  },
  addSale: (sale, items = []) => set((state) => {
    const record: SaleRecord = {
      id: uid("SALE"),
      total: sale.total ?? 0,
      subtotal: sale.subtotal ?? sale.total ?? 0,
      discountAmount: sale.discountAmount ?? 0,
      taxAmount: sale.taxAmount ?? 0,
      customer: sale.customer,
      memberId: sale.memberId,
      seller: sale.seller ?? "Admin",
      type: sale.type ?? "Venda normal",
      status: sale.status ?? (sale.type === "Orcamento" || sale.type === "Orçamento" ? "Orcamento" : "Concluida"),
      paymentMethod: sale.paymentMethod ?? "Dinheiro",
      dateTime: sale.dateTime ?? "Hoje, 10:30",
      soldAtIso: sale.soldAtIso,
      notes: sale.notes,
      items
    };
    const sales = [record, ...state.sales];
    persist(sales);
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
  cancelSale: (id) => set((state) => {
    const sales = state.sales.map((sale) => sale.id === id ? { ...sale, status: "Cancelada" } : sale);
    persist(sales);
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
    persist(sales);
    useAppStore.getState().addPendingSync();
    return { sales, revenue: sales.reduce((sum, sale) => sale.status === "Cancelada" ? sum : sum + sale.total, 0) };
  })
}));
