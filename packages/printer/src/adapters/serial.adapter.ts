import type { PrinterAdapter, PrinterConfig, PrinterInfo, PrintResult } from "../types";

interface SerialBridge {
  listPrinters?: () => Promise<PrinterInfo[]>;
  send?: (config: PrinterConfig, payload: number[]) => Promise<PrintResult>;
}

function getSerialBridge() {
  return (globalThis as typeof globalThis & { noogymSerialPrinterBridge?: SerialBridge }).noogymSerialPrinterBridge;
}

export class SerialPrinterAdapter implements PrinterAdapter {
  async send(config: PrinterConfig, payload: Uint8Array): Promise<PrintResult> {
    if (config.dryRun) {
      return {
        success: true,
        code: "DRY_RUN",
        message: "Comandos ESC/POS serial gerados sem envio para a impressora.",
        bytesWritten: payload.byteLength,
        printerName: config.name
      };
    }

    const bridge = getSerialBridge();
    if (!bridge?.send) {
      return {
        success: false,
        code: "SERIAL_BRIDGE_UNAVAILABLE",
        message: "Serial esta preparado, mas requer bridge/driver Electron para envio real."
      };
    }

    return bridge.send(config, Array.from(payload));
  }

  async list(): Promise<PrinterInfo[]> {
    return getSerialBridge()?.listPrinters?.() ?? [];
  }
}
