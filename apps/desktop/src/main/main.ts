import { app, BrowserWindow, ipcMain, shell, type IpcMainInvokeEvent } from "electron";
import path from "node:path";
import { registerBackupIpc } from "./backup-ipc";
import { registerLocalDbIpc } from "./localdb-ipc";
import { registerPrinterIpc } from "./printer-ipc";

const MIN_ZOOM_FACTOR = 0.85;
const MAX_ZOOM_FACTOR = 1.25;
const APP_USER_MODEL_ID = "com.noogym.erp.desktop";

if (process.platform === "win32") {
  app.setAppUserModelId(APP_USER_MODEL_ID);
}

const getWindowFromEvent = (event: IpcMainInvokeEvent) => BrowserWindow.fromWebContents(event.sender);

const appIconPath = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, "icon.ico")
    : path.join(__dirname, "../../build-resources/icon.ico");

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
    icon: appIconPath(),
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
  ipcMain.handle("app:open-external", async (_event, url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
      await shell.openExternal(parsed.toString());
      return true;
    } catch {
      return false;
    }
  });
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
  registerBackupIpc(ipcMain);
  registerLocalDbIpc(ipcMain);
  registerPrinterIpc(ipcMain);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
