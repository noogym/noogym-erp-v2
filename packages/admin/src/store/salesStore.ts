import { create } from "zustand";
import { createResource, listResource, saleFromApi, saleToDto } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import type { ProductRecord, SaleRecord } from "@noogym/types";

const persist = (sales: SaleRecord[]) => writeLocal("noogym:sales", sales);
const initialSales = readLocal("noogym:sales", [] as SaleRecord[]);

export const useSalesStore = create<{
  sales: SaleRecord[];
  revenue: number;
  loadOnline: () => Promise<void>;
  addSale: (sale: Partial<SaleRecord>, items?: ProductRecord[]) => void;
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
      customer: sale.customer,
      seller: sale.seller ?? "Admin",
      type: sale.type ?? "Venda normal",
      paymentMethod: sale.paymentMethod ?? "Dinheiro",
      dateTime: sale.dateTime ?? "Hoje, 10:30"
    };
    const sales = [record, ...state.sales];
    persist(sales);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      createResource<Record<string, unknown>>("sales", token, saleToDto(record, items))
        .then((apiSale) => {
          const synced = saleFromApi(apiSale);
          const nextSales = get().sales.map((item) => item.id === record.id ? synced : item);
          persist(nextSales);
          set({ sales: nextSales, revenue: nextSales.reduce((sum, item) => sum + item.total, 0) });
        })
        .catch(console.error);
    }

    return { sales, revenue: state.revenue + record.total };
  })
}));
