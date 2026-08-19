import { create } from "zustand";
import { employees as mockEmployees } from "../data/mock";
import {
  createResource,
  employeeFromApi,
  employeeToDto,
  inviteEmployeeToAccount,
  listResource,
  remoteIdOf,
  updateResource,
} from "../lib/domainApi";
import { scopeByGym } from "../lib/gymScope";
import { listUserSettings, type UserSettings } from "../lib/settingsApi";
import { readLocal, readLocalDb, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import { toastInfo } from "./toastStore";
import type {
  EmployeeActivityRecord,
  EmployeeRecord,
  EmployeeRoleRecord,
} from "@noogym/types";

export const employeeModules = [
  "Dashboard",
  "Check-in",
  "Clientes",
  "Planos",
  "Vendas",
  "Produtos",
  "Aulas",
  "Treinos",
  "Funcionarios",
  "Relatorios",
  "Financas",
  "Configuracoes",
];

const defaultRoles: EmployeeRoleRecord[] = [
  {
    id: "ROLE-OWNER",
    name: "Proprietario",
    description: "Dono da organizacao com acesso total.",
    modules: employeeModules,
    status: "Ativo",
    employees: 0,
  },
  {
    id: "ROLE-ADMIN",
    name: "Administrador",
    description: "Acesso completo ao sistema.",
    modules: employeeModules,
    status: "Ativo",
    employees: 0,
  },
  {
    id: "ROLE-GER",
    name: "Gerente",
    description: "Gestao operacional e relatorios.",
    modules: employeeModules.filter((module) => module !== "Configuracoes"),
    status: "Ativo",
    employees: 0,
  },
  {
    id: "ROLE-REC",
    name: "Recepcionista",
    description: "Atendimento, check-in, clientes e vendas.",
    modules: ["Dashboard", "Check-in", "Clientes", "Vendas", "Produtos"],
    status: "Ativo",
    employees: 0,
  },
  {
    id: "ROLE-PT",
    name: "Personal Trainer",
    description: "Treinos, aulas e acompanhamento dos alunos.",
    modules: ["Dashboard", "Clientes", "Aulas", "Treinos"],
    status: "Ativo",
    employees: 0,
  },
  {
    id: "ROLE-AUL",
    name: "Instrutor de Aulas",
    description: "Gestao das aulas e presencas.",
    modules: ["Dashboard", "Aulas", "Clientes"],
    status: "Ativo",
    employees: 0,
  },
];

const roleModules = (role: string) =>
  defaultRoles.find((item) => item.name === role)?.modules ?? ["Dashboard"];
const administrativeUserRoles = ["SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER"];
const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "Super administrador",
    OWNER: "Proprietario",
    ADMIN: "Administrador",
    MANAGER: "Gerente",
    TRAINER: "Personal Trainer",
    RECEPTIONIST: "Recepcionista",
    FINANCE: "Financeiro",
    NUTRITIONIST: "Nutricionista",
  };
  return labels[role] ?? role;
};
const userStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    INVITED: "Licenca",
    SUSPENDED: "Inativo",
  };
  return labels[status] ?? status;
};
const userAccessStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    ACTIVE: "Liberado",
    INACTIVE: "Bloqueado",
    INVITED: "Convite pendente",
    SUSPENDED: "Bloqueado",
  };
  return labels[status] ?? status;
};
const textOr = (value: string | undefined, fallback: string) =>
  value?.trim() ? value : fallback;
const defaultDepartment = (employee: EmployeeRecord) =>
  employee.role.includes("Personal") || employee.role.includes("Instrutor")
    ? "Tecnico"
    : employee.role === "Recepcionista"
      ? "Atendimento"
      : employee.role === "Proprietario"
        ? "Direcao"
        : "Administracao";
const defaultGymScope = (employee: EmployeeRecord) =>
  employee.role.includes("Personal")
    ? "Multiunidade"
    : employee.gymId
      ? "Unidade especifica"
      : "Organizacao";
const defaultAccountMode = (
  employee: EmployeeRecord,
): EmployeeRecord["accountMode"] => {
  if (employee.accountMode) return employee.accountMode;
  if (employee.userId) return "Vincular usuario existente";
  if (
    employee.accessStatus === "Convite pendente" ||
    employee.accountStatus === "Convite pendente"
  )
    return "Convidar nova conta";
  return "Sem acesso";
};
const normalizeEmployee = (
  employee: EmployeeRecord,
  index = 0,
): EmployeeRecord => {
  const accountMode = defaultAccountMode(employee);
  const defaults = {
    hireDate: "2026-05-08",
    department: defaultDepartment(employee),
    contractType: "Tempo integral",
    supervisor: "Gerente",
    shift: index % 2 === 0 ? "Manha" : "Tarde",
    accessStatus:
      accountMode === "Sem acesso"
        ? "Sem acesso"
        : employee.status === "Ativo"
          ? "Liberado"
          : "Bloqueado",
    accountMode,
    accountEmail: employee.email,
    accountStatus:
      accountMode === "Sem acesso"
        ? "Sem conta"
        : employee.userId
          ? "Conta vinculada"
          : "Convite pendente",
    gymScope: defaultGymScope(employee) as EmployeeRecord["gymScope"],
    gymIds: employee.gymId ? [employee.gymId] : [],
    lastAccess:
      index % 3 === 0
        ? "Hoje, 09:30"
        : index % 3 === 1
          ? "Ontem, 17:12"
          : "Sem acesso recente",
    permissions: roleModules(employee.role),
    notes: "",
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
    permissions: employee.permissions?.length
      ? employee.permissions
      : defaults.permissions,
    notes: employee.notes ?? defaults.notes,
  };
};

const initial: EmployeeRecord[] = (mockEmployees as EmployeeRecord[]).map(
  normalizeEmployee,
);
const persist = (employees: EmployeeRecord[], sync = false) =>
  writeLocal("noogym:employees", employees, { sync });
const persistRoles = (roles: EmployeeRoleRecord[]) =>
  writeLocal("noogym:employee-roles", roles);
const persistActivities = (activities: EmployeeActivityRecord[]) =>
  writeLocal("noogym:employee-activities", activities);
const activityTime = () =>
  new Intl.DateTimeFormat("pt-AO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
const mergeDefaultRoles = (storedRoles: EmployeeRoleRecord[]) => {
  const storedByName = new Map(storedRoles.map((role) => [role.name, role]));
  return [
    ...defaultRoles.map((role) =>
      storedByName.get(role.name)
        ? {
            ...role,
            ...storedByName.get(role.name),
            modules: storedByName.get(role.name)?.modules?.length
              ? storedByName.get(role.name)!.modules
              : role.modules,
          }
        : role,
    ),
    ...storedRoles.filter(
      (role) => !defaultRoles.some((item) => item.name === role.name),
    ),
  ];
};
const withEmployeeCount = (
  roles: EmployeeRoleRecord[],
  employees: EmployeeRecord[],
) =>
  roles.map((role) => ({
    ...role,
    employees: employees.filter((employee) => employee.role === role.name)
      .length,
  }));
const mergeSyncedEmployee = (
  synced: EmployeeRecord,
  fallback: EmployeeRecord,
): EmployeeRecord =>
  normalizeEmployee({
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
    notes: synced.notes ?? fallback.notes,
  });
const userGymIds = (user: UserSettings) =>
  (user.gyms ?? [])
    .map((item) => item.gym?.id ?? item.gymId ?? item.id)
    .filter((id): id is string => Boolean(id));
const shouldShowUserAsEmployee = (user: UserSettings, activeGymId?: string) => {
  if (!administrativeUserRoles.includes(user.role)) return false;
  const gymIds = userGymIds(user);
  if (!activeGymId || !gymIds.length) return true;
  return (
    gymIds.includes(activeGymId) ||
    user.role === "OWNER" ||
    user.role === "SUPER_ADMIN"
  );
};
const userToEmployee = (user: UserSettings, index = 0): EmployeeRecord =>
  normalizeEmployee({
    id: `USER-${user.id}`,
    userId: user.id,
    name: user.name,
    role: roleLabel(user.role),
    email: user.email,
    phone: user.phone ?? "+244 900 000 000",
    status: userStatusLabel(user.status),
    salary: "0 Kz",
    hireDate: user.createdAt,
    department: user.role === "OWNER" ? "Direcao" : "Administracao",
    contractType: "Administrativo",
    supervisor: user.role === "OWNER" ? "Organizacao" : "Proprietario",
    shift: "Livre",
    accessStatus: userAccessStatusLabel(user.status),
    accountMode: "Vincular usuario existente",
    accountEmail: user.email,
    accountStatus:
      user.status === "ACTIVE"
        ? "Conta vinculada"
        : userAccessStatusLabel(user.status),
    gymScope:
      userGymIds(user).length > 1
        ? "Multiunidade"
        : userGymIds(user).length === 1
          ? "Unidade especifica"
          : "Organizacao",
    gymIds: userGymIds(user),
    lastAccess: user.lastLoginAt
      ? new Intl.DateTimeFormat("pt-AO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(user.lastLoginAt))
      : index % 2 === 0
        ? "Sem acesso recente"
        : "Hoje, 09:30",
    permissions: roleModules(roleLabel(user.role)),
    notes: "Usuario administrativo sem cadastro de funcionario operacional.",
  });
const mergeUsersWithoutEmployeeProfiles = (
  employees: EmployeeRecord[],
  users: UserSettings[],
  activeGymId?: string,
) => {
  const employeeUserIds = new Set(
    employees.map((employee) => employee.userId).filter(Boolean),
  );
  const employeeEmails = new Set(
    employees.map((employee) => employee.email.toLowerCase()),
  );
  const userEmployees = users
    .filter((user) => shouldShowUserAsEmployee(user, activeGymId))
    .filter(
      (user) =>
        !employeeUserIds.has(user.id) &&
        !employeeEmails.has(user.email.toLowerCase()),
    )
    .map(userToEmployee);

  return [...userEmployees, ...employees];
};

export const useEmployeesStore = create<{
  employees: EmployeeRecord[];
  roles: EmployeeRoleRecord[];
  activities: EmployeeActivityRecord[];
  loadLocal: () => Promise<void>;
  loadOnline: () => Promise<void>;
  addEmployee: (employee: Partial<EmployeeRecord>) => void;
  updateEmployee: (id: string, employee: Partial<EmployeeRecord>) => void;
  deactivateEmployee: (id: string) => void;
  setEmployeeStatus: (id: string, status: string) => void;
  setAccessStatus: (id: string, accessStatus: string) => void;
  sendInvite: (
    id: string,
  ) => Promise<{ emailQueued?: boolean; emailSent?: boolean; remote: boolean }>;
  resetPassword: (id: string) => void;
  saveRole: (role: EmployeeRoleRecord) => void;
  toggleRolePermission: (roleId: string, module: string) => void;
}>((set, get) => ({
  employees: readLocal("noogym:employees", initial).map(normalizeEmployee),
  roles: withEmployeeCount(
    mergeDefaultRoles(readLocal("noogym:employee-roles", defaultRoles)),
    readLocal("noogym:employees", initial).map(normalizeEmployee),
  ),
  activities: readLocal("noogym:employee-activities", []),
  loadLocal: async () => {
    const [rawEmployees, rawRoles, activities] = await Promise.all([
      readLocalDb("noogym:employees", [] as EmployeeRecord[], {
        seedMissing: false,
      }),
      readLocalDb("noogym:employee-roles", defaultRoles),
      readLocalDb("noogym:employee-activities", [] as EmployeeActivityRecord[]),
    ]);
    const employees = scopeByGym(
      rawEmployees.map(normalizeEmployee),
      useAppStore.getState().activeGymId,
    );
    const roles = withEmployeeCount(mergeDefaultRoles(rawRoles), employees);
    set({ employees, roles, activities });
  },
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const activeGymId = useAppStore.getState().activeGymId ?? undefined;
    set({
      employees: [],
      roles: withEmployeeCount(mergeDefaultRoles(get().roles), []),
      activities: [],
    });
    const [apiEmployees, apiUsers] = await Promise.all([
      listResource<Record<string, unknown>>("employees", token, {
        gymId: activeGymId,
      }),
      listUserSettings(token).catch(() => [] as UserSettings[]),
    ]);
    const currentEmployees = get().employees;
    const syncedEmployees = apiEmployees
      .map(employeeFromApi)
      .map((employee, index) => {
        const fallback = currentEmployees.find(
          (item) =>
            item.id === employee.id ||
            (employee.email && item.email === employee.email),
        );
        return fallback
          ? mergeSyncedEmployee(employee, fallback)
          : normalizeEmployee(employee, index);
      });
    const employees = mergeUsersWithoutEmployeeProfiles(
      syncedEmployees,
      apiUsers,
      activeGymId,
    );
    const roles = withEmployeeCount(mergeDefaultRoles(get().roles), employees);
    persist(employees);
    persistRoles(roles);
    set({ employees, roles });
  },
  addEmployee: (employee) =>
    set((state) => {
      const created: EmployeeRecord = normalizeEmployee({
        id: uid("FUNC"),
        gymId: useAppStore.getState().activeGymId ?? undefined,
        name: "Novo funcionario",
        role: "Recepcionista",
        email: "funcionario@noogym.com",
        phone: "+244 900 000 000",
        status: "Ativo",
        salary: "0 Kz",
        ...employee,
      } as EmployeeRecord);
      const employees = [created, ...state.employees];
      const roles = withEmployeeCount(state.roles, employees);
      const activities = [
        {
          id: uid("ACT"),
          employeeId: created.id,
          employeeName: created.name,
          action: "Funcionario criado",
          module: "Funcionarios",
          dateTime: activityTime(),
          detail: created.role,
        },
        ...state.activities,
      ];
      persist(employees, true);
      persistRoles(roles);
      persistActivities(activities);
      useAppStore.getState().addPendingSync();

      const token = useAuthStore.getState().accessToken;
      if (useAppStore.getState().onlineOnly && token) {
        createResource<Record<string, unknown>>(
          "employees",
          token,
          employeeToDto(created),
        )
          .then((apiEmployee) => {
            const synced = mergeSyncedEmployee(
              employeeFromApi(apiEmployee),
              created,
            );
            const nextEmployees = get().employees.map((item) =>
              item.id === created.id ? synced : item,
            );
            const nextRoles = withEmployeeCount(get().roles, nextEmployees);
            persist(nextEmployees);
            persistRoles(nextRoles);
            set({ employees: nextEmployees, roles: nextRoles });
          })
          .catch(() =>
            toastInfo(
              "Funcionario salvo localmente",
              "Nao foi possivel sincronizar com a API agora.",
            ),
          );
      }

      return { employees, roles, activities };
    }),
  updateEmployee: (id, employee) =>
    set((state) => {
      const current = state.employees.find((item) => item.id === id);
      const nextEmployee = normalizeEmployee({
        ...current,
        ...employee,
      } as EmployeeRecord);
      const employees = state.employees.map((item) =>
        item.id === id ? nextEmployee : item,
      );
      const roles = withEmployeeCount(state.roles, employees);
      persist(employees, true);
      persistRoles(roles);
      useAppStore.getState().addPendingSync();

      const token = useAuthStore.getState().accessToken;
      if (
        useAppStore.getState().onlineOnly &&
        token &&
        !id.startsWith("USER-")
      ) {
        const remoteId = remoteIdOf(current, ["FUNC", "USER-"]);
        const request = remoteId
          ? updateResource<Record<string, unknown>>(
              "employees",
              remoteId,
              token,
              employeeToDto(nextEmployee),
            )
          : createResource<Record<string, unknown>>(
              "employees",
              token,
              employeeToDto(nextEmployee),
            );
        request
          .then((apiEmployee) => {
            const synced = mergeSyncedEmployee(
              employeeFromApi(apiEmployee),
              nextEmployee,
            );
            const nextEmployees = get().employees.map((item) =>
              item.id === id ? synced : item,
            );
            const nextRoles = withEmployeeCount(get().roles, nextEmployees);
            persist(nextEmployees);
            persistRoles(nextRoles);
            set({ employees: nextEmployees, roles: nextRoles });
          })
          .catch(() =>
            toastInfo(
              "Funcionario salvo localmente",
              "Nao foi possivel sincronizar com a API agora.",
            ),
          );
      }

      return { employees, roles };
    }),
  deactivateEmployee: (id) => get().setEmployeeStatus(id, "Inativo"),
  setEmployeeStatus: (id, status) => {
    const employee = get().employees.find((item) => item.id === id);
    if (!employee) return;
    get().updateEmployee(id, {
      status,
      accessStatus: status === "Ativo" ? "Liberado" : "Bloqueado",
    });
    const activities = [
      {
        id: uid("ACT"),
        employeeId: id,
        employeeName: employee.name,
        action:
          status === "Ativo"
            ? "Funcionario reativado"
            : "Funcionario desativado",
        module: "Funcionarios",
        dateTime: activityTime(),
        detail: employee.role,
      },
      ...get().activities,
    ];
    persistActivities(activities);
    set({ activities });
  },
  setAccessStatus: (id, accessStatus) => {
    const employee = get().employees.find((item) => item.id === id);
    if (!employee) return;
    get().updateEmployee(id, { accessStatus });
    const activities = [
      {
        id: uid("ACT"),
        employeeId: id,
        employeeName: employee.name,
        action:
          accessStatus === "Bloqueado" ? "Acesso bloqueado" : "Acesso liberado",
        module: "Acesso",
        dateTime: activityTime(),
        detail: accessStatus,
      },
      ...get().activities,
    ];
    persistActivities(activities);
    set({ activities });
  },
  sendInvite: async (id) => {
    const employee = get().employees.find((item) => item.id === id);
    if (!employee) return { remote: false };
    const inviteSentAt = new Date().toISOString();
    const inviteUrl = `https://app.noogym.com/convite/${id}`;
    get().updateEmployee(id, {
      accountMode: "Convidar nova conta",
      accountEmail: employee.accountEmail ?? employee.email,
      accountStatus: "Convite pendente",
      accessStatus: "Convite pendente",
      inviteSentAt,
      inviteUrl,
      lastAccess: "Convite enviado agora",
    });
    const activities = [
      {
        id: uid("ACT"),
        employeeId: id,
        employeeName: employee.name,
        action: "Convite enviado",
        module: "Acesso",
        dateTime: activityTime(),
        detail: employee.accountEmail ?? employee.email,
      },
      ...get().activities,
    ];
    persistActivities(activities);
    set({ activities });
    const token = useAuthStore.getState().accessToken;
    const remoteId = remoteIdOf(employee, ["FUNC", "USER-"]);
    if (token && remoteId) {
      const result = await inviteEmployeeToAccount(token, remoteId);
      const data = result as {
        userId?: string;
        inviteUrl?: string;
        accountEmail?: string;
        emailQueued?: boolean;
        emailSent?: boolean;
      };
      const nextEmployees = get().employees.map((item) =>
        item.id === id
          ? normalizeEmployee({
              ...item,
              userId: data.userId ?? item.userId,
              accountEmail: data.accountEmail ?? item.accountEmail,
              inviteUrl: data.inviteUrl ?? item.inviteUrl,
              accountStatus: "Convite pendente",
              accessStatus: "Convite pendente",
              lastAccess: "Convite enviado agora",
            })
          : item,
      );
      const nextRoles = withEmployeeCount(get().roles, nextEmployees);
      persist(nextEmployees);
      persistRoles(nextRoles);
      set({ employees: nextEmployees, roles: nextRoles });
      return {
        emailQueued: data.emailQueued,
        emailSent: data.emailSent,
        remote: true,
      };
    }
    toastInfo(
      "Convite registado localmente",
      "Sincronize o funcionario com a API para enviar por e-mail.",
    );
    return { remote: false };
  },
  resetPassword: (id) => {
    const employee = get().employees.find((item) => item.id === id);
    if (!employee) return;
    const activities = [
      {
        id: uid("ACT"),
        employeeId: id,
        employeeName: employee.name,
        action: "Senha redefinida",
        module: "Acesso",
        dateTime: activityTime(),
        detail: "Link de redefinicao gerado",
      },
      ...get().activities,
    ];
    persistActivities(activities);
    set({ activities });
  },
  saveRole: (role) =>
    set((state) => {
      const exists = state.roles.some((item) => item.id === role.id);
      const roles = withEmployeeCount(
        exists
          ? state.roles.map((item) => (item.id === role.id ? role : item))
          : [role, ...state.roles],
        state.employees,
      );
      persistRoles(roles);
      return { roles };
    }),
  toggleRolePermission: (roleId, module) =>
    set((state) => {
      const roles = state.roles.map((role) => {
        if (role.id !== roleId) return role;
        const modules = role.modules.includes(module)
          ? role.modules.filter((item) => item !== module)
          : [...role.modules, module];
        return { ...role, modules };
      });
      const role = roles.find((item) => item.id === roleId);
      const employees = role
        ? state.employees.map((employee) =>
            employee.role === role.name
              ? { ...employee, permissions: role.modules }
              : employee,
          )
        : state.employees;
      persistRoles(roles);
      persist(employees, true);
      return { roles: withEmployeeCount(roles, employees), employees };
    }),
}));
