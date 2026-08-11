import type { PrinterAdapter, PrinterConfig, PrinterInfo, PrintResult } from "../types";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const serialSendScript = String.raw`
$ErrorActionPreference = "Stop"
$path = $env:NOOGYM_SERIAL_PATH
$baudRate = [int]$env:NOOGYM_SERIAL_BAUD_RATE
$dataBits = [int]$env:NOOGYM_SERIAL_DATA_BITS
$payload = [Convert]::FromBase64String($env:NOOGYM_SERIAL_PAYLOAD)
$port = [System.IO.Ports.SerialPort]::new($path, $baudRate, [System.IO.Ports.Parity]::None, $dataBits, [System.IO.Ports.StopBits]::One)
$port.WriteTimeout = 5000
$port.ReadTimeout = 5000
try {
  $port.Open()
  $port.Write($payload, 0, $payload.Length)
  Write-Output $payload.Length
} finally {
  if ($port.IsOpen) { $port.Close() }
  $port.Dispose()
}
`;

const serialListScript = String.raw`
$ErrorActionPreference = "Stop"
[System.IO.Ports.SerialPort]::GetPortNames() | Sort-Object | ConvertTo-Json -Depth 2
`;

interface SerialBridge {
  listPrinters?: () => Promise<PrinterInfo[]>;
  send?: (config: PrinterConfig, payload: number[]) => Promise<PrintResult>;
}

function getSerialBridge() {
  return (globalThis as typeof globalThis & { noogymSerialPrinterBridge?: SerialBridge }).noogymSerialPrinterBridge;
}

function normalizePortRows(value: unknown): string[] {
  if (!value) return [];
  const rows = Array.isArray(value) ? value : [value];
  return rows.map((row) => String(row)).filter(Boolean);
}

async function sendViaWindowsSerial(config: PrinterConfig, payload: Uint8Array): Promise<PrintResult> {
  const serial = config.serial;
  if (!serial?.path?.trim()) {
    return {
      success: false,
      code: "SERIAL_CONFIG_MISSING",
      message: "Informe a porta serial da impressora."
    };
  }

  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", serialSendScript], {
      env: {
        ...process.env,
        NOOGYM_SERIAL_PATH: serial.path.trim(),
        NOOGYM_SERIAL_BAUD_RATE: String(serial.baudRate ?? 9600),
        NOOGYM_SERIAL_DATA_BITS: String(serial.dataBits ?? 8),
        NOOGYM_SERIAL_PAYLOAD: Buffer.from(payload).toString("base64")
      },
      timeout: 15000,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    });
    const bytesWritten = Number(String(stdout).trim());

    return {
      success: true,
      code: "SERIAL_PRINT_SENT",
      message: "Trabalho enviado para a impressora serial.",
      bytesWritten: Number.isFinite(bytesWritten) ? bytesWritten : payload.byteLength,
      printerName: config.name ?? serial.path
    };
  } catch (error) {
    return {
      success: false,
      code: "SERIAL_PRINT_ERROR",
      message: "Nao foi possivel enviar o trabalho para a porta serial.",
      error: error instanceof Error ? error.message : String(error),
      printerName: config.name ?? serial.path
    };
  }
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
    if (bridge?.send) {
      return bridge.send(config, Array.from(payload));
    }

    if (process.platform === "win32") {
      return sendViaWindowsSerial(config, payload);
    }

    return {
      success: false,
      code: "SERIAL_BRIDGE_UNAVAILABLE",
      message: "Serial esta preparado, mas requer bridge/driver Electron para envio real fora do Windows."
    };
  }

  async list(): Promise<PrinterInfo[]> {
    const bridgePrinters = await getSerialBridge()?.listPrinters?.();
    if (bridgePrinters?.length) return bridgePrinters;

    if (process.platform !== "win32") {
      return [];
    }

    try {
      const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", serialListScript], {
        timeout: 10000,
        windowsHide: true,
        maxBuffer: 1024 * 1024
      });
      const output = String(stdout).trim();
      const parsed = output ? JSON.parse(output) as unknown : [];
      return normalizePortRows(parsed).map((port) => ({
        id: `serial:${port}`,
        name: port,
        connectionType: "serial",
        details: {
          path: port,
          source: "windows-serial"
        }
      }));
    } catch (error) {
      return [{
        id: "serial:list-error",
        name: error instanceof Error ? error.message : "Falha ao listar portas seriais",
        connectionType: "serial",
        details: { source: "windows-serial", error: true }
      } satisfies PrinterInfo];
    }
  }
}
