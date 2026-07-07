import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("noogym", {
  getVersion: () => ipcRenderer.invoke("app:version"),
  openExternal: (url: string) => ipcRenderer.invoke("app:open-external", url),
  windowControls: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close")
  },
  zoomControls: {
    getZoomFactor: () => ipcRenderer.invoke("window:zoom:get"),
    setZoomFactor: (zoomFactor: number) => ipcRenderer.invoke("window:zoom:set", zoomFactor)
  },
  printer: {
    list: () => ipcRenderer.invoke("printer:list"),
    printTestPage: (config: unknown) => ipcRenderer.invoke("printer:test-page", config),
    printReceipt: (data: unknown, config: unknown) => ipcRenderer.invoke("printer:receipt", data, config),
    printQRCode: (data: unknown, config: unknown) => ipcRenderer.invoke("printer:qr-code", data, config),
    openCashDrawer: (config: unknown) => ipcRenderer.invoke("printer:cash-drawer", config)
  },
  backup: {
    exportLocalData: (payload: unknown) => ipcRenderer.invoke("backup:export-local-data", payload),
    importLocalData: () => ipcRenderer.invoke("backup:import-local-data")
  },
  localDb: {
    status: () => ipcRenderer.invoke("localdb:status"),
    binding: {
      get: () => ipcRenderer.invoke("localdb:binding:get"),
      save: (binding: unknown) => ipcRenderer.invoke("localdb:binding:save", binding),
      clear: () => ipcRenderer.invoke("localdb:binding:clear")
    },
    collections: {
      get: (key: string) => ipcRenderer.invoke("localdb:collections:get", key),
      set: (key: string, value: unknown, options?: { sync?: boolean }) => ipcRenderer.invoke("localdb:collections:set", key, value, options),
      remove: (key: string) => ipcRenderer.invoke("localdb:collections:remove", key)
    },
    conflicts: {
      list: (status?: "open" | "resolved") => ipcRenderer.invoke("localdb:conflicts:list", status),
      resolve: (id: string, resolution: "keep_local" | "use_remote") => ipcRenderer.invoke("localdb:conflicts:resolve", id, resolution)
    },
    clients: {
      list: () => ipcRenderer.invoke("localdb:clients:list"),
      replace: (clients: unknown[]) => ipcRenderer.invoke("localdb:clients:replace", clients),
      upsert: (client: unknown, operation?: "create" | "update" | "delete") => ipcRenderer.invoke("localdb:clients:upsert", client, operation)
    },
    sync: {
      run: (options: {
        apiUrl: string;
        token: string;
        gymId?: string;
        limit?: number;
        session?: unknown;
      }) =>
        ipcRenderer.invoke("localdb:sync:run", options)
    }
  }
});
