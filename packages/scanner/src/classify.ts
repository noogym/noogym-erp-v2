import type { ScannerCodeType } from "./types";

const barcodePatterns = [
  /^\d{8}$/,
  /^\d{12}$/,
  /^\d{13}$/,
  /^\d{14}$/,
  /^[A-Z0-9._-]{6,64}$/i,
];

export function normalizeScanValue(value: string) {
  return value.replace(/[\r\n\t]+$/g, "").trim();
}

export function classifyScanValue(value: string): ScannerCodeType {
  const normalized = normalizeScanValue(value);
  if (!normalized) return "unknown";

  if (
    normalized.startsWith("noogym://") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("{") ||
    normalized.includes("://checkin/")
  ) {
    return "qr";
  }

  if (barcodePatterns.some((pattern) => pattern.test(normalized))) {
    return "barcode";
  }

  return "unknown";
}

export function isLikelyBarcode(value: string) {
  return classifyScanValue(value) === "barcode";
}

export function isLikelyQrCode(value: string) {
  return classifyScanValue(value) === "qr";
}
