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
  }
});
