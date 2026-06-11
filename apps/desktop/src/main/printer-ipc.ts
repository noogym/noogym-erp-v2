import type { IpcMain } from "electron";

type PrinterModule = {
  getAvailablePrinters: () => Promise<unknown>;
  printTestPage: (config: unknown) => Promise<unknown>;
  printReceipt: (data: unknown, config: unknown) => Promise<unknown>;
  printQRCode: (data: unknown, config: unknown) => Promise<unknown>;
  openCashDrawer: (config: unknown) => Promise<unknown>;
};

const loadPrinterModule = async (): Promise<PrinterModule> => {
  const dynamicImport = new Function("return import('@noogym/printer')") as () => Promise<PrinterModule>;
  return dynamicImport();
};

export function registerPrinterIpc(ipcMain: IpcMain) {
  ipcMain.handle("printer:list", async () => {
    const printer = await loadPrinterModule();
    return printer.getAvailablePrinters();
  });

  ipcMain.handle("printer:test-page", async (_event, config) => {
    const printer = await loadPrinterModule();
    return printer.printTestPage(config);
  });

  ipcMain.handle("printer:receipt", async (_event, data, config) => {
    const printer = await loadPrinterModule();
    return printer.printReceipt(data, config);
  });

  ipcMain.handle("printer:qr-code", async (_event, data, config) => {
    const printer = await loadPrinterModule();
    return printer.printQRCode(data, config);
  });

  ipcMain.handle("printer:cash-drawer", async (_event, config) => {
    const printer = await loadPrinterModule();
    return printer.openCashDrawer(config);
  });
}
