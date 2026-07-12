import type { FinanceActionContent } from "./FinanceActionModal";
import type { ReactElement } from "react";
import type { FinanceRecord } from "@noogym/types";
import type { FinanceLocalData } from "../../lib/localFinance";

export interface FinanceTabProps {
  openAction: (action: FinanceActionContent) => void;
  onAddAccount?: () => void;
  records?: FinanceRecord[];
  data: FinanceLocalData;
}

export interface FinanceTabView {
  main: ReactElement;
  side: ReactElement;
  subtitle: string;
}
