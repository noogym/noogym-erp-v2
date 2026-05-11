import type { FinanceActionContent } from "./FinanceActionModal";
import type { ReactElement } from "react";

export interface FinanceTabProps {
  openAction: (action: FinanceActionContent) => void;
}

export interface FinanceTabView {
  main: ReactElement;
  side: ReactElement;
  subtitle: string;
}
