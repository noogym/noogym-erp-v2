import type { OperationalSettings } from "../store/operationalSettingsStore";

export function buildPrinterConfig(printing: OperationalSettings["printing"]) {
  return {
    name: printing.defaultPrinterName,
    connectionType: printing.connectionType,
    profile: printing.profile,
    paperWidth: printing.paperWidth,
    network: printing.connectionType === "network" ? {
      host: printing.networkHost.trim(),
      port: printing.networkPort || 9100,
      timeoutMs: 5000
    } : undefined,
    usb: printing.connectionType === "usb" ? {
      deviceName: printing.usbDeviceName.trim() || printing.defaultPrinterName.trim() || undefined
    } : undefined,
    serial: printing.connectionType === "serial" ? {
      path: printing.serialPath.trim(),
      baudRate: 9600
    } : undefined,
    cashDrawer: {
      enabled: printing.cashDrawerEnabled,
      pin: printing.cashDrawerPin,
      onTimeMs: printing.cashDrawerOnTimeMs,
      offTimeMs: printing.cashDrawerOffTimeMs
    }
  };
}

export function validatePrintingConfig(printing: OperationalSettings["printing"], options?: { requireDevice?: boolean }) {
  if (!printing.enabled) return "Ative a impressao antes de testar.";
  if (!printing.defaultPrinterName.trim()) return "Informe o nome da impressora padrao.";
  if (options?.requireDevice === false) return "";
  if (printing.connectionType === "network" && !printing.networkHost.trim()) return "Informe o IP/host da impressora LAN.";
  if (printing.connectionType === "serial" && !printing.serialPath.trim()) return "Informe a porta serial.";
  return "";
}
