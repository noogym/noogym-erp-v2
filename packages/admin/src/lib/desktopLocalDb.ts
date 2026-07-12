import type { ClientRecord } from "@noogym/types";

export type DesktopBinding = {
  apiUrl?: string;
  organizationId?: string;
  organizationName?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  activeGymId?: string;
  activeGymName?: string;
  organization?: Record<string, unknown> | null;
  gyms: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
  linkedAt: string;
  lastBootstrapAt?: string;
  updatedAt: string;
};

export type DesktopBindingInput = {
  apiUrl?: string;
  organization?: Record<string, unknown> | null;
  gyms?: Array<Record<string, unknown>>;
  users?: Array<Record<string, unknown>>;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    organizationId?: string;
    organizationName?: string;
    gyms?: Array<{ id?: string; name?: string }>;
  };
  activeGymId?: string;
  linkedAt?: string;
  lastBootstrapAt?: string;
};

export type DesktopSyncOptions = {
  apiUrl: string;
  token: string;
  gymId?: string;
  limit?: number;
  session?: {
    user?: DesktopBindingInput["user"];
  };
};

export type DesktopSyncResult = {
  success: boolean;
  message?: string;
  pushed?: number;
  pulled?: number;
  failed?: number;
  pendingSync?: number;
  failedSync?: number;
  conflictSync?: number;
  errors?: string[];
  binding?: DesktopBinding | null;
};

export type DesktopSyncConflict = {
  id: string;
  eventId?: string;
  entity: string;
  entityId: string;
  remoteId?: string;
  operation: "create" | "update" | "delete";
  localPayload: Record<string, unknown>;
  remotePayload?: Record<string, unknown> | null;
  status: "open" | "resolved";
  resolution?: "keep_local" | "use_remote";
  error?: string;
  createdAt: string;
  resolvedAt?: string;
};

export type DesktopLocalDbStatus = {
  success: boolean;
  path: string;
  pendingSync: number;
  failedSync?: number;
  conflictSync?: number;
  binding?: DesktopBinding | null;
};

export type DesktopLocalDataClearResult = {
  success: boolean;
  message: string;
  before?: {
    path: string;
    pendingSync: number;
    failedSync?: number;
    conflictSync?: number;
  };
  after?: {
    path: string;
    pendingSync: number;
    failedSync?: number;
    conflictSync?: number;
  };
};

const clientRecord = (value: unknown): ClientRecord | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<ClientRecord>;
  if (!record.id || !record.name) return null;
  return record as ClientRecord;
};

export const desktopLocalDb = () => {
  if (typeof window === "undefined") return undefined;
  return window.noogym?.localDb;
};

export const isDesktopLocalDbAvailable = () => Boolean(desktopLocalDb());

export const getDesktopBinding = async () => {
  const bridge = desktopLocalDb();
  if (!bridge?.binding) return null;

  const response = await bridge.binding.get();
  return response.binding ?? null;
};

export const getDesktopLocalDbStatus = async () => {
  const bridge = desktopLocalDb();
  if (!bridge?.status) return null;

  return bridge.status() as Promise<DesktopLocalDbStatus>;
};

export const clearDesktopLocalData = async () => {
  const bridge = desktopLocalDb();
  if (!bridge?.danger?.clearLocalData) return null;

  return bridge.danger.clearLocalData() as Promise<DesktopLocalDataClearResult>;
};

export const saveDesktopBinding = async (binding: DesktopBindingInput) => {
  const bridge = desktopLocalDb();
  if (!bridge?.binding) return null;

  const response = await bridge.binding.save(binding);
  return response.binding ?? null;
};

export const getDesktopCollection = async <T>(key: string) => {
  const bridge = desktopLocalDb();
  if (!bridge?.collections) return undefined;

  const response = await bridge.collections.get(key);
  return response.success ? response.value as T | undefined : undefined;
};

export const setDesktopCollection = async <T>(key: string, value: T, options?: { sync?: boolean }) => {
  const bridge = desktopLocalDb();
  if (!bridge?.collections) return undefined;

  const response = await bridge.collections.set(key, value, options);
  return response.success ? response.value as T | undefined : undefined;
};

export const removeDesktopCollection = async (key: string) => {
  const bridge = desktopLocalDb();
  if (!bridge?.collections) return;

  await bridge.collections.remove(key);
};

export const listDesktopSyncConflicts = async (status: "open" | "resolved" = "open") => {
  const bridge = desktopLocalDb();
  if (!bridge?.conflicts) return [];

  const response = await bridge.conflicts.list(status);
  return response.success ? response.conflicts ?? [] : [];
};

export const resolveDesktopSyncConflict = async (id: string, resolution: "keep_local" | "use_remote") => {
  const bridge = desktopLocalDb();
  if (!bridge?.conflicts) return null;

  const response = await bridge.conflicts.resolve(id, resolution);
  return response.success ? response.conflict ?? null : null;
};

export const listDesktopClients = async () => {
  const bridge = desktopLocalDb();
  if (!bridge) return null;

  const clients = await bridge.clients.list();
  return clients.map(clientRecord).filter(Boolean) as ClientRecord[];
};

export const replaceDesktopClients = async (clients: ClientRecord[]) => {
  const bridge = desktopLocalDb();
  if (!bridge) return;

  await bridge.clients.replace(clients);
};

export const upsertDesktopClient = async (
  client: ClientRecord,
  operation: "create" | "update" | "delete" = "update",
) => {
  const bridge = desktopLocalDb();
  if (!bridge) return;

  await bridge.clients.upsert(client, operation);
};

export const runDesktopSync = async (options: DesktopSyncOptions) => {
  const bridge = desktopLocalDb();
  if (!bridge) return null;

  return bridge.sync.run(options) as Promise<DesktopSyncResult>;
};
