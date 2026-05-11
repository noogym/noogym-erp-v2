import type { FinanceRecord } from "@noogym/types";

export interface FinanceRepository {
  list(): Promise<FinanceRecord[]>;
  save(record: FinanceRecord): Promise<FinanceRecord>;
}
