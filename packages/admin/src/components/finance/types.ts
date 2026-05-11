import type { FinanceActionContent } from "./FinanceActionModal";
import type { ReactElement } from "react";
import type { FinanceRecord } from "@noogym/types";

export interface FinanceTabProps {
  openAction: (action: FinanceActionContent) => void;
  records?: FinanceRecord[];
}

export interface FinanceTabView {
  main: ReactElement;
  side: ReactElement;
  subtitle: string;
}
