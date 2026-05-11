import { create } from "zustand";
import { employees as mockEmployees } from "../data/mock";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import type { EmployeeRecord } from "@noogym/types";

const initial: EmployeeRecord[] = mockEmployees as EmployeeRecord[];
const persist = (employees: EmployeeRecord[]) => writeLocal("noogym:employees", employees);

export const useEmployeesStore = create<{
  employees: EmployeeRecord[];
  addEmployee: (employee: Partial<EmployeeRecord>) => void;
  updateEmployee: (id: string, employee: Partial<EmployeeRecord>) => void;
  deactivateEmployee: (id: string) => void;
}>((set, get) => ({
  employees: readLocal("noogym:employees", initial),
  addEmployee: (employee) => set((state) => {
    const employees = [{ id: uid("FUNC"), name: "Novo funcionário", role: "Recepcionista", email: "funcionario@noogym.com", phone: "+244 900 000 000", status: "Ativo", salary: "0 Kz", ...employee }, ...state.employees];
    persist(employees); useAppStore.getState().addPendingSync(); return { employees };
  }),
  updateEmployee: (id, employee) => set((state) => {
    const employees = state.employees.map((item) => item.id === id ? { ...item, ...employee } : item);
    persist(employees); useAppStore.getState().addPendingSync(); return { employees };
  }),
  deactivateEmployee: (id) => get().updateEmployee(id, { status: "Inativo" })
}));
