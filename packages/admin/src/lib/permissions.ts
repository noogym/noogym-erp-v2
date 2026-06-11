import type { EmployeeRecord, EmployeeRoleRecord } from "@noogym/types";
import type { RouteId } from "../store/appStore";
import type { AuthUser } from "../store/authStore";
import type { GymSettings } from "./settingsApi";

export const routeModules: Record<RouteId, string> = {
  dashboard: "Dashboard",
  checkin: "Check-in",
  clientes: "Clientes",
  planos: "Planos",
  vendas: "Vendas",
  produtos: "Produtos",
  aulas: "Aulas",
  treinos: "Treinos",
  funcionarios: "Funcionarios",
  relatorios: "Relatorios",
  financas: "Financas",
  configuracoes: "Configuracoes"
};

const allModules = Object.values(routeModules);

const rolePermissionMatrix: Record<string, string[]> = {
  "super administrador": allModules,
  proprietario: allModules,
  owner: allModules,
  admin: allModules,
  administrador: allModules,
  gerente: allModules.filter((module) => module !== "Configuracoes"),
  recepcionista: ["Dashboard", "Check-in", "Clientes", "Vendas", "Produtos"],
  "personal trainer": ["Dashboard", "Clientes", "Aulas", "Treinos"],
  trainer: ["Dashboard", "Clientes", "Aulas", "Treinos"],
  "instrutor de aulas": ["Dashboard", "Clientes", "Aulas"],
  financeiro: ["Dashboard", "Relatorios", "Financas"],
  finance: ["Dashboard", "Relatorios", "Financas"],
  nutricionista: ["Dashboard", "Clientes"],
  nutritionist: ["Dashboard", "Clientes"],
  funcionario: ["Dashboard"],
  staff: ["Dashboard"]
};

const normalize = (value?: string) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const findEmployeeForUser = (user: AuthUser | null, employees: EmployeeRecord[]) => {
  if (!user) return undefined;
  const email = normalize(user.email);
  return employees.find((employee) => {
    if (user.id && employee.userId === user.id) return true;
    return Boolean(email && (normalize(employee.email) === email || normalize(employee.accountEmail) === email));
  });
};

export const effectiveRole = (user: AuthUser | null, employees: EmployeeRecord[]) => {
  const employee = findEmployeeForUser(user, employees);
  return employee?.role ?? user?.employeeRole ?? user?.role ?? "Funcionario";
};

export const permissionsForUser = (user: AuthUser | null, employees: EmployeeRecord[], roles: EmployeeRoleRecord[] = []) => {
  if (!user) return [] as string[];

  const employee = findEmployeeForUser(user, employees);
  if (employee?.status === "Inativo" || employee?.accessStatus === "Bloqueado") return [];
  if (employee?.permissions?.length) return employee.permissions;
  if (user.permissions?.length) return user.permissions;

  const roleName = employee?.role ?? user.employeeRole ?? user.role;
  const role = roles.find((item) => normalize(item.name) === normalize(roleName));
  if (role?.status === "Ativo") return role.modules;

  return rolePermissionMatrix[normalize(roleName)] ?? ["Dashboard"];
};

export const canAccessRoute = (route: RouteId, user: AuthUser | null, employees: EmployeeRecord[], roles: EmployeeRoleRecord[] = []) =>
  permissionsForUser(user, employees, roles).includes(routeModules[route]);

export const firstAllowedRoute = (routes: RouteId[], user: AuthUser | null, employees: EmployeeRecord[], roles: EmployeeRoleRecord[] = []) =>
  routes.find((route) => canAccessRoute(route, user, employees, roles)) ?? "dashboard";

export const allowedGymsForUser = (user: AuthUser | null, employees: EmployeeRecord[], gyms: GymSettings[]) => {
  if (!user) return [] as GymSettings[];
  const activeGyms = gyms.filter((gym) => gym.isActive !== false);
  const employee = findEmployeeForUser(user, employees);
  const role = normalize(employee?.role ?? user.employeeRole ?? user.role);
  const hasOrganizationScope =
    employee?.gymScope === "Organizacao" ||
    ["super administrador", "proprietario", "owner", "admin", "administrador"].includes(role);

  if (hasOrganizationScope) return activeGyms;

  const allowedIds = new Set<string>([
    ...(employee?.gymIds ?? []),
    ...(employee?.gymId ? [employee.gymId] : []),
    ...(user.gyms?.map((gym) => gym.id) ?? [])
  ]);

  if (employee?.gymScope === "Multiunidade" && allowedIds.size === 0) return activeGyms;
  return activeGyms.filter((gym) => allowedIds.has(gym.id));
};

export const canSwitchGym = (user: AuthUser | null, employees: EmployeeRecord[], gyms: GymSettings[]) =>
  allowedGymsForUser(user, employees, gyms).length > 1;
