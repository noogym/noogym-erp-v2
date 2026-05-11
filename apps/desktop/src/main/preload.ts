import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("noogym", {
  getVersion: () => ipcRenderer.invoke("app:version"),
  windowControls: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close")
  }
});
