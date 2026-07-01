import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("noogym", {
  getVersion: () => ipcRenderer.invoke("app:version"),
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
  }
});
