import type { PrinterAdapter, PrinterConfig, PrinterInfo, PrintResult } from "../types";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const rawPrinterScript = String.raw`
$ErrorActionPreference = "Stop"
$printerName = $env:NOOGYM_PRINTER_NAME
$payload = [Convert]::FromBase64String($env:NOOGYM_PRINTER_PAYLOAD)

Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public class RawPrinterHelper
{
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA
  {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

  [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static int SendBytes(string printerName, byte[] bytes)
  {
    IntPtr hPrinter;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
    {
      throw new Win32Exception(Marshal.GetLastWin32Error());
    }

    DOCINFOA di = new DOCINFOA();
    di.pDocName = "Noogym ESC/POS";
    di.pDataType = "RAW";

    IntPtr pBytes = Marshal.AllocCoTaskMem(bytes.Length);
    try
    {
      Marshal.Copy(bytes, 0, pBytes, bytes.Length);
      if (!StartDocPrinter(hPrinter, 1, di)) throw new Win32Exception(Marshal.GetLastWin32Error());
      if (!StartPagePrinter(hPrinter)) throw new Win32Exception(Marshal.GetLastWin32Error());
      int written;
      if (!WritePrinter(hPrinter, pBytes, bytes.Length, out written)) throw new Win32Exception(Marshal.GetLastWin32Error());
      EndPagePrinter(hPrinter);
      EndDocPrinter(hPrinter);
      return written;
    }
    finally
    {
      Marshal.FreeCoTaskMem(pBytes);
      ClosePrinter(hPrinter);
    }
  }
}
'@

$written = [RawPrinterHelper]::SendBytes($printerName, $payload)
Write-Output $written
`;

const listPrintersScript = String.raw`
$ErrorActionPreference = "Stop"
Get-CimInstance Win32_Printer |
  Select-Object Name,DriverName,PortName,Default |
  ConvertTo-Json -Depth 3
`;

interface UsbBridge {
  listPrinters?: () => Promise<PrinterInfo[]>;
  send?: (config: PrinterConfig, payload: number[]) => Promise<PrintResult>;
}

function getUsbBridge() {
  return (globalThis as typeof globalThis & { noogymUsbPrinterBridge?: UsbBridge }).noogymUsbPrinterBridge;
}

function normalizePrinterRows(value: unknown): Array<Record<string, unknown>> {
  if (!value) return [];
  return Array.isArray(value) ? value as Array<Record<string, unknown>> : [value as Record<string, unknown>];
}

async function sendViaWindowsSpooler(config: PrinterConfig, payload: Uint8Array): Promise<PrintResult> {
  const printerName = config.usb?.deviceName?.trim() || config.name?.trim();
  if (!printerName) {
    return {
      success: false,
      code: "USB_PRINTER_NAME_MISSING",
      message: "Informe o nome da impressora USB instalada no Windows."
    };
  }

  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", rawPrinterScript], {
      env: {
        ...process.env,
        NOOGYM_PRINTER_NAME: printerName,
        NOOGYM_PRINTER_PAYLOAD: Buffer.from(payload).toString("base64")
      },
      timeout: 15000,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    });
    const bytesWritten = Number(String(stdout).trim());

    return {
      success: true,
      code: "USB_PRINT_SENT",
      message: "Trabalho enviado para a impressora USB pelo spooler do Windows.",
      bytesWritten: Number.isFinite(bytesWritten) ? bytesWritten : payload.byteLength,
      printerName
    };
  } catch (error) {
    return {
      success: false,
      code: "USB_PRINT_ERROR",
      message: "Nao foi possivel enviar o trabalho para a impressora USB.",
      error: error instanceof Error ? error.message : String(error),
      printerName
    };
  }
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
    if (bridge?.send) {
      return bridge.send(config, Array.from(payload));
    }

    if (process.platform === "win32") {
      return sendViaWindowsSpooler(config, payload);
    }

    return {
      success: false,
      code: "USB_BRIDGE_UNAVAILABLE",
      message: "USB requer uma bridge Electron/nativa ou uma impressora instalada no Windows."
    };
  }

  async list(): Promise<PrinterInfo[]> {
    const bridgePrinters = await getUsbBridge()?.listPrinters?.();
    if (bridgePrinters?.length) return bridgePrinters;

    if (process.platform !== "win32") {
      return [];
    }

    try {
      const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", listPrintersScript], {
        timeout: 10000,
        windowsHide: true,
        maxBuffer: 1024 * 1024
      });
      const output = String(stdout).trim();
      const parsed = output ? JSON.parse(output) as unknown : [];
      return normalizePrinterRows(parsed).map((printer) => {
        const name = String(printer.Name ?? "");
        return {
          id: `winspool:${name}`,
          name,
          connectionType: "usb" as const,
          manufacturer: String(printer.DriverName ?? ""),
          isDefault: Boolean(printer.Default),
          details: {
            driverName: printer.DriverName,
            portName: printer.PortName,
            source: "windows-spooler"
          }
        };
      }).filter((printer) => printer.name);
    } catch (error) {
      return [{
        id: "winspool:list-error",
        name: error instanceof Error ? error.message : "Falha ao listar impressoras",
        connectionType: "usb",
        details: { source: "windows-spooler", error: true }
      } satisfies PrinterInfo];
    }
  }
}
