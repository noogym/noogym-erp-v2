import { BrowserWindow, dialog, type IpcMain, type IpcMainInvokeEvent, type OpenDialogOptions, type SaveDialogOptions } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type DesktopBackupPayload = {
  version: 1;
  source: "noogym-desktop";
  exportedAt: string;
  localStorage: Record<string, string>;
};

const backupFileName = () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `noogym-backup-${stamp}.json`;
};

const windowFromEvent = (event: IpcMainInvokeEvent) => BrowserWindow.fromWebContents(event.sender) ?? undefined;

const isBackupPayload = (value: unknown): value is DesktopBackupPayload => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<DesktopBackupPayload>;
  return payload.version === 1 && payload.source === "noogym-desktop" && Boolean(payload.localStorage && typeof payload.localStorage === "object");
};

export function registerBackupIpc(ipcMain: IpcMain) {
  ipcMain.handle("backup:export-local-data", async (event, payload: DesktopBackupPayload) => {
    if (!isBackupPayload(payload)) {
      return { success: false, message: "Backup invalido.", code: "INVALID_BACKUP_PAYLOAD" };
    }

    const parentWindow = windowFromEvent(event);
    const saveOptions: SaveDialogOptions = {
      title: "Exportar backup Noogym",
      defaultPath: backupFileName(),
      filters: [{ name: "Backup Noogym", extensions: ["json"] }]
    };
    const result = parentWindow ? await dialog.showSaveDialog(parentWindow, saveOptions) : await dialog.showSaveDialog(saveOptions);

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true, message: "Exportacao cancelada." };
    }

    await mkdir(path.dirname(result.filePath), { recursive: true });
    await writeFile(result.filePath, JSON.stringify(payload, null, 2), "utf8");

    return { success: true, message: "Backup exportado com sucesso.", path: result.filePath };
  });

  ipcMain.handle("backup:import-local-data", async (event) => {
    const parentWindow = windowFromEvent(event);
    const openOptions: OpenDialogOptions = {
      title: "Restaurar backup Noogym",
      properties: ["openFile"],
      filters: [{ name: "Backup Noogym", extensions: ["json"] }]
    };
    const result = parentWindow ? await dialog.showOpenDialog(parentWindow, openOptions) : await dialog.showOpenDialog(openOptions);

    if (result.canceled || !result.filePaths[0]) {
      return { success: false, canceled: true, message: "Restauro cancelado." };
    }

    const raw = await readFile(result.filePaths[0], "utf8");
    const payload = JSON.parse(raw) as unknown;

    if (!isBackupPayload(payload)) {
      return { success: false, message: "O ficheiro selecionado nao e um backup Noogym valido.", code: "INVALID_BACKUP_FILE" };
    }

    return { success: true, message: "Backup carregado com sucesso.", path: result.filePaths[0], payload };
  });
}
