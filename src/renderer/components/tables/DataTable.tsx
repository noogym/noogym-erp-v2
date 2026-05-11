import type { ReactNode } from "react";
import { Table } from "../ui/Table";

export function DataTable({ columns, children }: { columns: string[]; children: ReactNode }) {
  return <Table columns={columns}>{children}</Table>;
}
