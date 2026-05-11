import type { PlanRecord } from "@noogym/types";

export interface PlanRepository {
  list(): Promise<PlanRecord[]>;
  findById(id: string): Promise<PlanRecord | null>;
  save(plan: PlanRecord): Promise<PlanRecord>;
}
