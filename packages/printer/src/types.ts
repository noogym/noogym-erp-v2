export type PrinterConnectionType = "network" | "usb" | "serial";

export type EscPosBrandProfile = "generic" | "epson" | "bematech" | "xprinter" | "rongta" | "wintec";

export interface NetworkPrinterConfig {
  host: string;
  port?: number;
  timeoutMs?: number;
}

export interface UsbPrinterConfig {
  vendorId?: number;
  productId?: number;
  deviceName?: string;
  interfaceNumber?: number;
  endpointAddress?: number;
}

export interface SerialPrinterConfig {
  path: string;
  baudRate?: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: "none" | "even" | "odd";
}

export interface PrinterConfig {
  id?: string;
  name?: string;
  connectionType: PrinterConnectionType;
  profile?: EscPosBrandProfile;
  paperWidth?: 58 | 80;
  encoding?: "ascii" | "utf8";
  dryRun?: boolean;
  network?: NetworkPrinterConfig;
  usb?: UsbPrinterConfig;
  serial?: SerialPrinterConfig;
  cashDrawer?: {
    enabled?: boolean;
    pin?: 0 | 1;
    onTimeMs?: number;
    offTimeMs?: number;
  };
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total?: number;
  sku?: string;
  taxRate?: number;
}

export interface ReceiptData {
  gymName: string;
  nif?: string;
  address?: string;
  phone?: string;
  customerName?: string;
  cashierName?: string;
  items: ReceiptItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  paymentMethod: string;
  paidAmount?: number;
  changeAmount?: number;
  date?: Date | string;
  message?: string;
  invoiceNumber?: string;
  fiscalDocumentType?: string;
  taxInfo?: string;
  qrCode?: QRCodePrintData | string;
}

export interface QRCodePrintData {
  value: string;
  label?: string;
  size?: number;
  correctionLevel?: "L" | "M" | "Q" | "H";
}

export interface PrintResult {
  success: boolean;
  code: string;
  message: string;
  bytesWritten?: number;
  printerName?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface PrinterInfo {
  id: string;
  name: string;
  connectionType: PrinterConnectionType;
  manufacturer?: string;
  model?: string;
  isDefault?: boolean;
  details?: Record<string, unknown>;
}

export interface PrinterValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PrinterAdapter {
  send(config: PrinterConfig, payload: Uint8Array): Promise<PrintResult>;
  list?(): Promise<PrinterInfo[]>;
}
