import { create } from "zustand";
import { employees as mockEmployees } from "../data/mock";
import { createResource, employeeFromApi, employeeToDto, listResource, updateResource } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import type { EmployeeActivityRecord, EmployeeRecord, EmployeeRoleRecord } from "@noogym/types";

export const employeeModules = ["Dashboard", "Check-in", "Clientes", "Planos", "Vendas", "Produtos", "Aulas", "Treinos", "Funcionarios", "Relatorios", "Financas", "Configuracoes"];

const defaultRoles: EmployeeRoleRecord[] = [
  { id: "ROLE-ADMIN", name: "Administrador", description: "Acesso completo ao sistema.", modules: employeeModules, status: "Ativo", employees: 0 },
  { id: "ROLE-GER", name: "Gerente", description: "Gestao operacional e relatorios.", modules: employeeModules.filter((module) => module !== "Configuracoes"), status: "Ativo", employees: 0 },
  { id: "ROLE-REC", name: "Recepcionista", description: "Atendimento, check-in, clientes e vendas.", modules: ["Dashboard", "Check-in", "Clientes", "Vendas", "Produtos"], status: "Ativo", employees: 0 },
  { id: "ROLE-PT", name: "Personal Trainer", description: "Treinos, aulas e acompanhamento dos alunos.", modules: ["Dashboard", "Clientes", "Aulas", "Treinos"], status: "Ativo", employees: 0 },
  { id: "ROLE-AUL", name: "Instrutor de Aulas", description: "Gestao das aulas e presencas.", modules: ["Dashboard", "Aulas", "Clientes"], status: "Ativo", employees: 0 }
];

const roleModules = (role: string) => defaultRoles.find((item) => item.name === role)?.modules ?? ["Dashboard"];
const textOr = (value: string | undefined, fallback: string) => value?.trim() ? value : fallback;
const defaultDepartment = (employee: EmployeeRecord) => employee.role.includes("Personal") || employee.role.includes("Instrutor") ? "Tecnico" : employee.role === "Recepcionista" ? "Atendimento" : "Administracao";
const defaultGymScope = (employee: EmployeeRecord) => employee.role.includes("Personal") ? "Multiunidade" : employee.gymId ? "Unidade especifica" : "Organizacao";
const defaultAccountMode = (employee: EmployeeRecord): EmployeeRecord["accountMode"] => {
  if (employee.accountMode) return employee.accountMode;
  if (employee.userId) return "Vincular usuario existente";
  if (employee.accessStatus === "Convite pendente" || employee.accountStatus === "Convite pendente") return "Convidar nova conta";
  return "Sem acesso";
};
const normalizeEmployee = (employee: EmployeeRecord, index = 0): EmployeeRecord => {
  const accountMode = defaultAccountMode(employee);
  const defaults = {
    hireDate: "2026-05-08",
    department: defaultDepartment(employee),
    contractType: "Tempo integral",
    supervisor: "Gerente",
    shift: index % 2 === 0 ? "Manha" : "Tarde",
    accessStatus: accountMode === "Sem acesso" ? "Sem acesso" : employee.status === "Ativo" ? "Liberado" : "Bloqueado",
    accountMode,
    accountEmail: employee.email,
    accountStatus: accountMode === "Sem acesso" ? "Sem conta" : employee.userId ? "Conta vinculada" : "Convite pendente",
    gymScope: defaultGymScope(employee) as EmployeeRecord["gymScope"],
    gymIds: employee.gymId ? [employee.gymId] : [],
    lastAccess: index % 3 === 0 ? "Hoje, 09:30" : index % 3 === 1 ? "Ontem, 17:12" : "Sem acesso recente",
    permissions: roleModules(employee.role),
    notes: ""
  };
  return {
    ...defaults,
    ...employee,
    hireDate: textOr(employee.hireDate, defaults.hireDate),
    department: textOr(employee.department, defaults.department),
    contractType: textOr(employee.contractType, defaults.contractType),
    supervisor: textOr(employee.supervisor, defaults.supervisor),
    shift: textOr(employee.shift, defaults.shift),
    accessStatus: textOr(employee.accessStatus, defaults.accessStatus),
    accountMode,
    accountEmail: textOr(employee.accountEmail, defaults.accountEmail),
    accountStatus: textOr(employee.accountStatus, defaults.accountStatus),
    gymScope: employee.gymScope ?? defaults.gymScope,
    gymIds: employee.gymIds?.length ? employee.gymIds : defaults.gymIds,
    lastAccess: textOr(employee.lastAccess, defaults.lastAccess),
    permissions: employee.permissions?.length ? employee.permissions : defaults.permissions,
    notes: employee.notes ?? defaults.notes
  };
};

const initial: EmployeeRecord[] = (mockEmployees as EmployeeRecord[]).map(normalizeEmployee);
const persist = (employees: EmployeeRecord[]) => writeLocal("noogym:employees", employees);
const persistRoles = (roles: EmployeeRoleRecord[]) => writeLocal("noogym:employee-roles", roles);
const persistActivities = (activities: EmployeeActivityRecord[]) => writeLocal("noogym:employee-activities", activities);
const activityTime = () => new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
const withEmployeeCount = (roles: EmployeeRoleRecord[], employees: EmployeeRecord[]) => roles.map((role) => ({ ...role, employees: employees.filter((employee) => employee.role === role.name).length }));
const mergeSyncedEmployee = (synced: EmployeeRecord, fallback: EmployeeRecord): EmployeeRecord => normalizeEmployee({
  ...fallback,
  ...synced,
  contractType: fallback.contractType,
  supervisor: fallback.supervisor,
  shift: fallback.shift,
  accessStatus: fallback.accessStatus,
  accountMode: fallback.accountMode,
  accountEmail: fallback.accountEmail,
  accountStatus: fallback.accountStatus,
  gymScope: fallback.gymScope,
  gymIds: fallback.gymIds,
  inviteSentAt: fallback.inviteSentAt,
  inviteUrl: fallback.inviteUrl,
  lastAccess: fallback.lastAccess,
  permissions: fallback.permissions,
  notes: synced.notes ?? fallback.notes
});

export const useEmployeesStore = create<{
  employees: EmployeeRecord[];
  roles: EmployeeRoleRecord[];
  activities: EmployeeActivityRecord[];
  loadOnline: () => Promise<void>;
  addEmployee: (employee: Partial<EmployeeRecord>) => void;
  updateEmployee: (id: string, employee: Partial<EmployeeRecord>) => void;
  deactivateEmployee: (id: string) => void;
  setEmployeeStatus: (id: string, status: string) => void;
  setAccessStatus: (id: string, accessStatus: string) => void;
  sendInvite: (id: string) => void;
  resetPassword: (id: string) => void;
  saveRole: (role: EmployeeRoleRecord) => void;
  toggleRolePermission: (roleId: string, module: string) => void;
}>((set, get) => ({
  employees: readLocal("noogym:employees", initial).map(normalizeEmployee),
  roles: withEmployeeCount(readLocal("noogym:employee-roles", defaultRoles), readLocal("noogym:employees", initial).map(normalizeEmployee)),
  activities: readLocal("noogym:employee-activities", []),
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const apiEmployees = await listResource<Record<string, unknown>>("employees", token);
    const currentEmployees = get().employees;
    const employees = apiEmployees.map(employeeFromApi).map((employee, index) => {
      const fallback = currentEmployees.find((item) => item.id === employee.id || (employee.email && item.email === employee.email));
      return fallback ? mergeSyncedEmployee(employee, fallback) : normalizeEmployee(employee, index);
    });
    const roles = withEmployeeCount(get().roles, employees);
    persist(employees);
    persistRoles(roles);
    set({ employees, roles });
  },
  addEmployee: (employee) => set((state) => {
    const created: EmployeeRecord = normalizeEmployee({ id: uid("FUNC"), name: "Novo funcionario", role: "Recepcionista", email: "funcionario@noogym.com", phone: "+244 900 000 000", status: "Ativo", salary: "0 Kz", ...employee } as EmployeeRecord);
    const employees = [created, ...state.employees];
    const roles = withEmployeeCount(state.roles, employees);
    const activities = [{
      id: uid("ACT"),
      employeeId: created.id,
      employeeName: created.name,
      action: "Funcionario criado",
      module: "Funcionarios",
      dateTime: activityTime(),
      detail: created.role
    }, ...state.activities];
    persist(employees);
    persistRoles(roles);
    persistActivities(activities);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      createResource<Record<string, unknown>>("employees", token, employeeToDto(created))
        .then((apiEmployee) => {
          const synced = mergeSyncedEmployee(employeeFromApi(apiEmployee), created);
          const nextEmployees = get().employees.map((item) => item.id === created.id ? synced : item);
          const nextRoles = withEmployeeCount(get().roles, nextEmployees);
          persist(nextEmployees);
          persistRoles(nextRoles);
          set({ employees: nextEmployees, roles: nextRoles });
        })
        .catch(console.error);
    }

    return { employees, roles, activities };
  }),
  updateEmployee: (id, employee) => set((state) => {
    const current = state.employees.find((item) => item.id === id);
    const nextEmployee = normalizeEmployee({ ...current, ...employee } as EmployeeRecord);
    const employees = state.employees.map((item) => item.id === id ? nextEmployee : item);
    const roles = withEmployeeCount(state.roles, employees);
    persist(employees);
    persistRoles(roles);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      updateResource<Record<string, unknown>>("employees", id, token, employeeToDto(nextEmployee))
        .then((apiEmployee) => {
          const synced = mergeSyncedEmployee(employeeFromApi(apiEmployee), nextEmployee);
          const nextEmployees = get().employees.map((item) => item.id === id ? synced : item);
          const nextRoles = withEmployeeCount(get().roles, nextEmployees);
          persist(nextEmployees);
          persistRoles(nextRoles);
          set({ employees: nextEmployees, roles: nextRoles });
        })
        .catch(console.error);
    }

    return { employees, roles };
  }),
  deactivateEmployee: (id) => get().setEmployeeStatus(id, "Inativo"),
  setEmployeeStatus: (id, status) => {
    const employee = get().employees.find((item) => item.id === id);
    if (!employee) return;
    get().updateEmployee(id, { status, accessStatus: status === "Ativo" ? "Liberado" : "Bloqueado" });
    const activities = [{ id: uid("ACT"), employeeId: id, employeeName: employee.name, action: status === "Ativo" ? "Funcionario reativado" : "Funcionario desativado", module: "Funcionarios", dateTime: activityTime(), detail: employee.role }, ...get().activities];
    persistActivities(activities);
    set({ activities });
  },
  setAccessStatus: (id, accessStatus) => {
    const employee = get().employees.find((item) => item.id === id);
    if (!employee) return;
    get().updateEmployee(id, { accessStatus });
    const activities = [{ id: uid("ACT"), employeeId: id, employeeName: employee.name, action: accessStatus === "Bloqueado" ? "Acesso bloqueado" : "Acesso liberado", module: "Acesso", dateTime: activityTime(), detail: accessStatus }, ...get().activities];
    persistActivities(activities);
    set({ activities });
  },
  sendInvite: (id) => {
    const employee = get().employees.find((item) => item.id === id);
    if (!employee) return;
    const inviteSentAt = new Date().toISOString();
    const inviteUrl = `https://app.noogym.com/convite/${id}`;
    get().updateEmployee(id, {
      accountMode: "Convidar nova conta",
      accountEmail: employee.accountEmail ?? employee.email,
      accountStatus: "Convite pendente",
      accessStatus: "Convite pendente",
      inviteSentAt,
      inviteUrl,
      lastAccess: "Convite enviado agora"
    });
    const activities = [{ id: uid("ACT"), employeeId: id, employeeName: employee.name, action: "Convite enviado", module: "Acesso", dateTime: activityTime(), detail: employee.accountEmail ?? employee.email }, ...get().activities];
    persistActivities(activities);
    set({ activities });
  },
  resetPassword: (id) => {
    const employee = get().employees.find((item) => item.id === id);
    if (!employee) return;
    const activities = [{ id: uid("ACT"), employeeId: id, employeeName: employee.name, action: "Senha redefinida", module: "Acesso", dateTime: activityTime(), detail: "Link de redefinicao gerado" }, ...get().activities];
    persistActivities(activities);
    set({ activities });
  },
  saveRole: (role) => set((state) => {
    const exists = state.roles.some((item) => item.id === role.id);
    const roles = withEmployeeCount(exists ? state.roles.map((item) => item.id === role.id ? role : item) : [role, ...state.roles], state.employees);
    persistRoles(roles);
    return { roles };
  }),
  toggleRolePermission: (roleId, module) => set((state) => {
    const roles = state.roles.map((role) => {
      if (role.id !== roleId) return role;
      const modules = role.modules.includes(module) ? role.modules.filter((item) => item !== module) : [...role.modules, module];
      return { ...role, modules };
    });
    const role = roles.find((item) => item.id === roleId);
    const employees = role ? state.employees.map((employee) => employee.role === role.name ? { ...employee, permissions: role.modules } : employee) : state.employees;
    persistRoles(roles);
    persist(employees);
    return { roles: withEmployeeCount(roles, employees), employees };
  })
}));
