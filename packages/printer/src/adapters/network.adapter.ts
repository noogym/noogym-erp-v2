import net from "node:net";
import type { PrinterAdapter, PrinterConfig, PrinterInfo, PrintResult } from "../types";

export class NetworkPrinterAdapter implements PrinterAdapter {
  async send(config: PrinterConfig, payload: Uint8Array): Promise<PrintResult> {
    const network = config.network;
    if (!network?.host) {
      return {
        success: false,
        code: "NETWORK_CONFIG_MISSING",
        message: "Informe o IP/host da impressora de rede."
      };
    }

    if (config.dryRun) {
      return {
        success: true,
        code: "DRY_RUN",
        message: "Comandos ESC/POS gerados sem envio para a impressora.",
        bytesWritten: payload.byteLength,
        printerName: config.name
      };
    }

    const port = network.port ?? 9100;
    const timeoutMs = network.timeoutMs ?? 5000;

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;

      const finish = (result: PrintResult) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(timeoutMs);
      socket.once("timeout", () => {
        finish({
          success: false,
          code: "NETWORK_TIMEOUT",
          message: `A impressora nao respondeu em ${timeoutMs}ms.`,
          printerName: config.name
        });
      });
      socket.once("error", (error) => {
        finish({
          success: false,
          code: "NETWORK_ERROR",
          message: "Nao foi possivel comunicar com a impressora de rede.",
          error: error.message,
          printerName: config.name
        });
      });
      socket.connect(port, network.host, () => {
        socket.write(Buffer.from(payload), (error) => {
          if (error) {
            finish({
              success: false,
              code: "NETWORK_WRITE_ERROR",
              message: "Falha ao enviar dados para a impressora.",
              error: error.message,
              printerName: config.name
            });
            return;
          }

          socket.end(() => {
            finish({
              success: true,
              code: "PRINT_SENT",
              message: "Trabalho enviado para a impressora de rede.",
              bytesWritten: payload.byteLength,
              printerName: config.name
            });
          });
        });
      });
    });
  }

  async list(): Promise<PrinterInfo[]> {
    return [];
  }
}
