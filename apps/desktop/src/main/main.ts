import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron";
import path from "node:path";

const MIN_ZOOM_FACTOR = 0.85;
const MAX_ZOOM_FACTOR = 1.25;

const getWindowFromEvent = (event: IpcMainInvokeEvent) => BrowserWindow.fromWebContents(event.sender);

const clampZoomFactor = (zoomFactor: number) => {
  if (!Number.isFinite(zoomFactor)) return 1;
  const clamped = Math.min(MAX_ZOOM_FACTOR, Math.max(MIN_ZOOM_FACTOR, zoomFactor));
  return Math.round(clamped * 100) / 100;
};

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1728,
    height: 1117,
    minWidth: 1280,
    minHeight: 820,
    backgroundColor: "#050708",
    title: "Noogym Desktop",
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    window.loadURL(devServerUrl);
  } else {
    window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
};

app.whenReady().then(() => {
  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("window:minimize", (event) => {
    getWindowFromEvent(event)?.minimize();
  });
  ipcMain.handle("window:maximize", (event) => {
    const window = getWindowFromEvent(event);
    if (!window) return;
    if (window.isMaximized()) {
      window.unmaximize();
      return;
    }
    window.maximize();
  });
  ipcMain.handle("window:close", (event) => {
    getWindowFromEvent(event)?.close();
  });
  ipcMain.handle("window:zoom:get", (event) => getWindowFromEvent(event)?.webContents.getZoomFactor() ?? 1);
  ipcMain.handle("window:zoom:set", (event, zoomFactor: number) => {
    const window = getWindowFromEvent(event);
    const nextZoomFactor = clampZoomFactor(zoomFactor);
    window?.webContents.setZoomFactor(nextZoomFactor);
    return nextZoomFactor;
  });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
