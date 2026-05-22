import { create } from "zustand";
import { employees as mockEmployees } from "../data/mock";
import { createResource, employeeFromApi, employeeToDto, listResource, updateResource } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import type { EmployeeRecord } from "@noogym/types";

const initial: EmployeeRecord[] = mockEmployees as EmployeeRecord[];
const persist = (employees: EmployeeRecord[]) => writeLocal("noogym:employees", employees);

export const useEmployeesStore = create<{
  employees: EmployeeRecord[];
  loadOnline: () => Promise<void>;
  addEmployee: (employee: Partial<EmployeeRecord>) => void;
  updateEmployee: (id: string, employee: Partial<EmployeeRecord>) => void;
  deactivateEmployee: (id: string) => void;
}>((set, get) => ({
  employees: readLocal("noogym:employees", initial),
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const apiEmployees = await listResource<Record<string, unknown>>("employees", token);
    const employees = apiEmployees.map(employeeFromApi);
    persist(employees);
    set({ employees });
  },
  addEmployee: (employee) => set((state) => {
    const created: EmployeeRecord = { id: uid("FUNC"), name: "Novo funcionario", role: "Recepcionista", email: "funcionario@noogym.com", phone: "+244 900 000 000", status: "Ativo", salary: "0 Kz", ...employee };
    const employees = [created, ...state.employees];
    persist(employees);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      createResource<Record<string, unknown>>("employees", token, employeeToDto(created))
        .then((apiEmployee) => {
          const synced = employeeFromApi(apiEmployee);
          const nextEmployees = get().employees.map((item) => item.id === created.id ? synced : item);
          persist(nextEmployees);
          set({ employees: nextEmployees });
        })
        .catch(console.error);
    }

    return { employees };
  }),
  updateEmployee: (id, employee) => set((state) => {
    const nextEmployee = { ...state.employees.find((item) => item.id === id), ...employee };
    const employees = state.employees.map((item) => item.id === id ? { ...item, ...employee } : item);
    persist(employees);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      updateResource<Record<string, unknown>>("employees", id, token, employeeToDto(nextEmployee))
        .then((apiEmployee) => {
          const synced = employeeFromApi(apiEmployee);
          const nextEmployees = get().employees.map((item) => item.id === id ? synced : item);
          persist(nextEmployees);
          set({ employees: nextEmployees });
        })
        .catch(console.error);
    }

    return { employees };
  }),
  deactivateEmployee: (id) => get().updateEmployee(id, { status: "Inativo" })
}));
