import type { PrinterAdapter, PrinterConfig, PrinterInfo, PrintResult } from "../types";

interface UsbBridge {
  listPrinters?: () => Promise<PrinterInfo[]>;
  send?: (config: PrinterConfig, payload: number[]) => Promise<PrintResult>;
}

function getUsbBridge() {
  return (globalThis as typeof globalThis & { noogymUsbPrinterBridge?: UsbBridge }).noogymUsbPrinterBridge;
}

export class UsbPrinterAdapter implements PrinterAdapter {
  async send(config: PrinterConfig, payload: Uint8Array): Promise<PrintResult> {
    if (config.dryRun) {
      return {
        success: true,
        code: "DRY_RUN",
        message: "Comandos ESC/POS USB gerados sem envio para a impressora.",
        bytesWritten: payload.byteLength,
        printerName: config.name
      };
    }

    const bridge = getUsbBridge();
    if (!bridge?.send) {
      return {
        success: false,
        code: "USB_BRIDGE_UNAVAILABLE",
        message: "USB requer uma bridge Electron/nativa para enviar bytes ESC/POS."
      };
    }

    return bridge.send(config, Array.from(payload));
  }

  async list(): Promise<PrinterInfo[]> {
    return getUsbBridge()?.listPrinters?.() ?? [];
  }
}
