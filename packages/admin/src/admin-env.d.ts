interface Window {
  noogym?: {
    getVersion: () => Promise<string>;
    openExternal?: (url: string) => Promise<boolean>;
    windowControls: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
    };
    zoomControls?: {
      getZoomFactor: () => Promise<number>;
      setZoomFactor: (zoomFactor: number) => Promise<number>;
    };
    printer?: {
      list: () => Promise<Array<{ id: string; name: string; connectionType: string; isDefault?: boolean }>>;
      printTestPage: (config: unknown) => Promise<{ success: boolean; message: string; code?: string; error?: string }>;
      printReceipt: (data: unknown, config: unknown) => Promise<{ success: boolean; message: string; code?: string; error?: string }>;
      printQRCode: (data: unknown, config: unknown) => Promise<{ success: boolean; message: string; code?: string; error?: string }>;
      openCashDrawer: (config: unknown) => Promise<{ success: boolean; message: string; code?: string; error?: string }>;
    };
    backup?: {
      exportLocalData: (payload: unknown) => Promise<{ success: boolean; message: string; path?: string; canceled?: boolean; code?: string }>;
      importLocalData: () => Promise<{ success: boolean; message: string; path?: string; canceled?: boolean; code?: string; payload?: { localStorage?: Record<string, string> } }>;
    };
    localDb?: {
      status: () => Promise<{ success: boolean; path: string; pendingSync: number; failedSync?: number; conflictSync?: number; binding?: DesktopBinding | null }>;
      danger?: {
        clearLocalData: () => Promise<{
          success: boolean;
          message: string;
          before?: { path: string; pendingSync: number; failedSync?: number; conflictSync?: number };
          after?: { path: string; pendingSync: number; failedSync?: number; conflictSync?: number };
        }>;
      };
      binding: {
        get: () => Promise<{ success: boolean; binding: DesktopBinding | null }>;
        save: (binding: DesktopBindingInput) => Promise<{ success: boolean; message?: string; binding?: DesktopBinding | null }>;
        clear: () => Promise<{ success: boolean }>;
      };
      collections: {
        get: (key: string) => Promise<{ success: boolean; message?: string; value?: unknown }>;
        set: (key: string, value: unknown, options?: { sync?: boolean }) => Promise<{ success: boolean; message?: string; value?: unknown }>;
        remove: (key: string) => Promise<{ success: boolean; message?: string }>;
      };
      conflicts: {
        list: (status?: "open" | "resolved") => Promise<{ success: boolean; message?: string; conflicts?: DesktopSyncConflict[] }>;
        resolve: (id: string, resolution: "keep_local" | "use_remote") => Promise<{ success: boolean; message?: string; conflict?: DesktopSyncConflict | null }>;
      };
      syncEvents: {
        list: (status?: "pending" | "failed" | "conflict" | "synced", limit?: number) => Promise<{ success: boolean; message?: string; events?: DesktopSyncEvent[] }>;
        retry: (id: string) => Promise<{ success: boolean; message?: string; event?: DesktopSyncEvent | null }>;
      };
      clients: {
        list: () => Promise<unknown[]>;
        replace: (clients: unknown[]) => Promise<{ success: boolean; message?: string; clients?: unknown[] }>;
        upsert: (client: unknown, operation?: "create" | "update" | "delete") => Promise<{ success: boolean; message?: string; client?: unknown }>;
      };
      sync: {
        run: (options: {
          apiUrl: string;
          token: string;
          gymId?: string;
          limit?: number;
          session?: { user?: DesktopBindingInput["user"] };
        }) => Promise<{
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
        }>;
      };
    };
  };
}

interface DesktopBinding {
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
}

interface DesktopBindingInput {
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
}

interface DesktopSyncEvent {
  id: string;
  entity: string;
  entityId: string;
  operation: "create" | "update" | "delete";
  payload: Record<string, unknown>;
  status?: "pending" | "failed" | "conflict" | "synced";
  attempts: number;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DesktopSyncConflict {
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
}
