import { EscPosBuilder } from "./adapters/escpos.adapter";
import { NetworkPrinterAdapter } from "./adapters/network.adapter";
import { SerialPrinterAdapter } from "./adapters/serial.adapter";
import { UsbPrinterAdapter } from "./adapters/usb.adapter";
import { buildQRCodeTemplate } from "./templates/qr.template";
import { buildReceiptTemplate } from "./templates/receipt.template";
import { buildTestPageTemplate } from "./templates/test-page.template";
import type { PrinterAdapter, PrinterConfig, PrinterInfo, PrinterValidationResult, PrintResult, QRCodePrintData, ReceiptData } from "./types";

const networkAdapter = new NetworkPrinterAdapter();
const usbAdapter = new UsbPrinterAdapter();
const serialAdapter = new SerialPrinterAdapter();

let defaultConfig: PrinterConfig | undefined;

function adapterFor(config: PrinterConfig): PrinterAdapter {
  switch (config.connectionType) {
    case "network":
      return networkAdapter;
    case "usb":
      return usbAdapter;
    case "serial":
      return serialAdapter;
    default:
      return networkAdapter;
  }
}

function resolveConfig(config?: PrinterConfig) {
  return config ?? defaultConfig;
}

function validationError(result: PrinterValidationResult): PrintResult {
  return {
    success: false,
    code: "INVALID_PRINTER_CONFIG",
    message: "Configuracao da impressora invalida.",
    details: {
      errors: result.errors,
      warnings: result.warnings
    }
  };
}

export function validatePrinterConfig(config?: PrinterConfig): PrinterValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config) {
    return {
      valid: false,
      errors: ["Configuracao da impressora nao informada."],
      warnings
    };
  }

  if (!["network", "usb", "serial"].includes(config.connectionType)) {
    errors.push("Tipo de conexao da impressora invalido.");
  }

  if (config.connectionType === "network") {
    if (!config.network?.host) errors.push("Impressora LAN/IP requer network.host.");
    if (config.network?.port && (config.network.port < 1 || config.network.port > 65535)) errors.push("Porta de rede invalida.");
  }

  if (config.connectionType === "usb" && !config.usb?.deviceName && !config.usb?.vendorId) {
    warnings.push("USB esta configurado sem vendorId, productId ou deviceName. A bridge Electron tera de selecionar o dispositivo.");
  }

  if (config.connectionType === "serial" && !config.serial?.path) {
    errors.push("Impressora serial requer serial.path.");
  }

  if (config.paperWidth && ![58, 80].includes(config.paperWidth)) {
    errors.push("paperWidth deve ser 58 ou 80.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function configurePrinter(config: PrinterConfig) {
  const validation = validatePrinterConfig(config);
  if (!validation.valid) return validation;
  defaultConfig = config;
  return validation;
}

export class PrinterService {
  constructor(private readonly config?: PrinterConfig) {}

  async printTestPage(config?: PrinterConfig) {
    return sendPrintJob(resolveConfig(config ?? this.config), (resolvedConfig) => buildTestPageTemplate(resolvedConfig));
  }

  async printReceipt(data: ReceiptData, config?: PrinterConfig) {
    if (!data.items.length) {
      return {
        success: false,
        code: "EMPTY_RECEIPT",
        message: "O recibo precisa de pelo menos um item."
      };
    }

    return sendPrintJob(resolveConfig(config ?? this.config), (resolvedConfig) => buildReceiptTemplate(data, resolvedConfig));
  }

  async printQRCode(data: QRCodePrintData, config?: PrinterConfig) {
    if (!data.value.trim()) {
      return {
        success: false,
        code: "EMPTY_QR_CODE",
        message: "Informe o conteudo do QR Code."
      };
    }

    return sendPrintJob(resolveConfig(config ?? this.config), (resolvedConfig) => buildQRCodeTemplate(data, resolvedConfig));
  }

  async openCashDrawer(config?: PrinterConfig) {
    const resolvedConfig = resolveConfig(config ?? this.config);
    return sendPrintJob(resolvedConfig, (printerConfig) => {
      const drawer = printerConfig.cashDrawer;
      return new EscPosBuilder()
        .initialize()
        .cashDrawer(drawer?.pin ?? 0, drawer?.onTimeMs ?? 50, drawer?.offTimeMs ?? 250)
        .build();
    });
  }

  async getAvailablePrinters() {
    return getAvailablePrinters();
  }
}

async function sendPrintJob(config: PrinterConfig | undefined, buildPayload: (config: PrinterConfig) => Uint8Array): Promise<PrintResult> {
  const validation = validatePrinterConfig(config);
  if (!validation.valid || !config) return validationError(validation);

  try {
    const payload = buildPayload(config);
    return adapterFor(config).send(config, payload);
  } catch (error) {
    return {
      success: false,
      code: "PRINT_JOB_ERROR",
      message: "Falha ao preparar o trabalho de impressao.",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function createPrinterService(config?: PrinterConfig) {
  return new PrinterService(config);
}

export function printTestPage(config?: PrinterConfig) {
  return new PrinterService(config).printTestPage();
}

export function printReceipt(data: ReceiptData, config?: PrinterConfig) {
  return new PrinterService(config).printReceipt(data);
}

export function printQRCode(data: QRCodePrintData, config?: PrinterConfig) {
  return new PrinterService(config).printQRCode(data);
}

export function openCashDrawer(config?: PrinterConfig) {
  return new PrinterService(config).openCashDrawer();
}

export async function getAvailablePrinters(): Promise<PrinterInfo[]> {
  const [usbPrinters, serialPrinters] = await Promise.all([
    usbAdapter.list?.() ?? [],
    serialAdapter.list?.() ?? []
  ]);

  return [
    ...usbPrinters,
    ...serialPrinters
  ];
}
