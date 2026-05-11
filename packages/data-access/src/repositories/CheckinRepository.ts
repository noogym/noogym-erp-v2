import type { CheckinRecord } from "@noogym/types";

export interface CheckinRepository {
  list(): Promise<CheckinRecord[]>;
  register(checkin: CheckinRecord): Promise<CheckinRecord>;
}
