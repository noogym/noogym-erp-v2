import type { IpcMain } from "electron";
import { getSQLiteLocalDb } from "./sqlite-localdb";
import { runSQLiteSync, type SQLiteSyncOptions } from "./sync-worker";

export function registerLocalDbIpc(ipcMain: IpcMain) {
  ipcMain.handle("localdb:status", () => {
    const db = getSQLiteLocalDb();
    return {
      success: true,
      path: db.getDatabasePath(),
      pendingSync: db.getPendingSyncCount(),
      failedSync: db.getFailedSyncCount(),
      conflictSync: db.getOpenSyncConflictCount(),
      binding: db.getDesktopBinding()
    };
  });

  ipcMain.handle("localdb:binding:get", () => {
    return { success: true, binding: getSQLiteLocalDb().getDesktopBinding() };
  });

  ipcMain.handle("localdb:binding:save", (_event, binding) => {
    if (!binding || typeof binding !== "object") {
      return { success: false, message: "Vinculo desktop invalido." };
    }

    return {
      success: true,
      binding: getSQLiteLocalDb().saveDesktopBinding(binding)
    };
  });

  ipcMain.handle("localdb:binding:clear", () => {
    getSQLiteLocalDb().clearDesktopBinding();
    return { success: true };
  });

  ipcMain.handle("localdb:danger:clear-local-data", () => {
    return getSQLiteLocalDb().clearLocalData();
  });

  ipcMain.handle("localdb:collections:get", (_event, key) => {
    if (typeof key !== "string" || !key.trim()) {
      return { success: false, message: "Chave local invalida." };
    }

    return {
      success: true,
      value: getSQLiteLocalDb().getLocalCollection(key)
    };
  });

  ipcMain.handle("localdb:collections:set", (_event, key, value, options) => {
    if (typeof key !== "string" || !key.trim()) {
      return { success: false, message: "Chave local invalida." };
    }

    return {
      success: true,
      value: getSQLiteLocalDb().setLocalCollection(key, value, {
        sync: Boolean(options && typeof options === "object" && "sync" in options && options.sync)
      })
    };
  });

  ipcMain.handle("localdb:collections:remove", (_event, key) => {
    if (typeof key !== "string" || !key.trim()) {
      return { success: false, message: "Chave local invalida." };
    }

    getSQLiteLocalDb().removeLocalCollection(key);
    return { success: true };
  });

  ipcMain.handle("localdb:conflicts:list", (_event, status = "open") => {
    const normalizedStatus = status === "resolved" ? "resolved" : "open";
    return {
      success: true,
      conflicts: getSQLiteLocalDb().listSyncConflicts(normalizedStatus)
    };
  });

  ipcMain.handle("localdb:conflicts:resolve", (_event, id, resolution) => {
    if (typeof id !== "string" || !id.trim()) {
      return { success: false, message: "Conflito invalido." };
    }

    if (resolution !== "keep_local" && resolution !== "use_remote") {
      return { success: false, message: "Resolucao de conflito invalida." };
    }

    return {
      success: true,
      conflict: getSQLiteLocalDb().resolveSyncConflict(id, resolution)
    };
  });

  ipcMain.handle("localdb:clients:list", () => {
    return getSQLiteLocalDb().listClients();
  });

  ipcMain.handle("localdb:clients:replace", (_event, clients) => {
    if (!Array.isArray(clients)) {
      return { success: false, message: "Lista de clientes invalida." };
    }

    return {
      success: true,
      clients: getSQLiteLocalDb().replaceClients(clients)
    };
  });

  ipcMain.handle("localdb:clients:upsert", (_event, client, operation = "update") => {
    if (!client || typeof client !== "object") {
      return { success: false, message: "Cliente invalido." };
    }

    return {
      success: true,
      client: getSQLiteLocalDb().upsertClient(client, operation)
    };
  });

  ipcMain.handle("localdb:sync:run", async (_event, options: Partial<SQLiteSyncOptions>) => {
    if (!options?.apiUrl || !options.token) {
      return { success: false, message: "API e token sao obrigatorios para sincronizar." };
    }

    return runSQLiteSync({
      apiUrl: options.apiUrl,
      token: options.token,
      gymId: options.gymId,
      limit: options.limit,
      session: options.session
    });
  });
}
