import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("noogym", {
  getVersion: () => ipcRenderer.invoke("app:version")
});
