import type { SaleRecord } from "@noogym/types";

export interface SaleRepository {
  list(): Promise<SaleRecord[]>;
  register(sale: SaleRecord): Promise<SaleRecord>;
}
