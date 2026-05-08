import { create } from "zustand";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import type { ProductRecord, SaleRecord } from "./domainTypes";

const persist = (sales: SaleRecord[]) => writeLocal("noogym:sales", sales);

export const useSalesStore = create<{
  sales: SaleRecord[];
  revenue: number;
  addSale: (sale: Partial<SaleRecord>, items?: ProductRecord[]) => void;
}>((set) => ({
  sales: readLocal("noogym:sales", [] as SaleRecord[]),
  revenue: readLocal("noogym:sales", [] as SaleRecord[]).reduce((sum, sale) => sum + sale.total, 0),
  addSale: (sale) => set((state) => {
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
    return { sales, revenue: state.revenue + record.total };
  })
}));
