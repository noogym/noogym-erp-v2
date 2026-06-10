import { EscPosBuilder } from "../adapters/escpos.adapter";
import type { PrinterConfig, QRCodePrintData, ReceiptData, ReceiptItem } from "../types";
import { formatDate } from "../utils/format-date";
import { formatMoney } from "../utils/format-money";
import { sanitizeText, singleLine } from "../utils/sanitize-text";

function paperColumns(config?: Pick<PrinterConfig, "paperWidth">) {
  return config?.paperWidth === 80 ? 48 : 32;
}

function linePair(left: string, right: string, width: number) {
  const cleanLeft = singleLine(left);
  const cleanRight = singleLine(right);
  const available = Math.max(1, width - cleanRight.length - 1);
  return `${cleanLeft.slice(0, available).padEnd(available, " ")} ${cleanRight}`;
}

function itemTotal(item: ReceiptItem) {
  return typeof item.total === "number" ? item.total : item.quantity * item.unitPrice;
}

function receiptTotal(data: ReceiptData) {
  if (typeof data.total === "number") return data.total;
  const subtotal = data.items.reduce((sum, item) => sum + itemTotal(item), 0);
  return subtotal - (data.discount ?? 0) + (data.tax ?? 0);
}

function normalizeQrCode(qrCode?: QRCodePrintData | string): QRCodePrintData | undefined {
  if (!qrCode) return undefined;
  return typeof qrCode === "string" ? { value: qrCode } : qrCode;
}

export function buildReceiptTemplate(data: ReceiptData, config?: PrinterConfig) {
  const width = paperColumns(config);
  const subtotal = data.subtotal ?? data.items.reduce((sum, item) => sum + itemTotal(item), 0);
  const total = receiptTotal(data);
  const qrCode = normalizeQrCode(data.qrCode);
  const builder = new EscPosBuilder();

  builder
    .initialize()
    .align("center")
    .bold()
    .size(2, 1)
    .line(data.gymName)
    .size(1, 1)
    .bold(false);

  if (data.nif) builder.line(`NIF: ${data.nif}`);
  if (data.address) builder.line(data.address);
  if (data.phone) builder.line(`Tel: ${data.phone}`);

  builder
    .separator(width)
    .align("left")
    .line(linePair("Data", formatDate(data.date), width));

  if (data.invoiceNumber) builder.line(linePair("Documento", data.invoiceNumber, width));
  if (data.fiscalDocumentType) builder.line(linePair("Tipo", data.fiscalDocumentType, width));
  if (data.customerName) builder.line(linePair("Cliente", data.customerName, width));
  if (data.cashierName) builder.line(linePair("Operador", data.cashierName, width));

  builder.separator(width).bold().line("Itens").bold(false);

  for (const item of data.items) {
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 1;
    builder.line(singleLine(item.name, width));
    builder.line(linePair(`${quantity} x ${formatMoney(item.unitPrice)}`, formatMoney(itemTotal(item)), width));
  }

  builder.separator(width);
  builder.line(linePair("Subtotal", formatMoney(subtotal), width));
  if (data.discount) builder.line(linePair("Desconto", formatMoney(data.discount), width));
  if (data.tax) builder.line(linePair("Taxa", formatMoney(data.tax), width));
  builder.bold().line(linePair("TOTAL", formatMoney(total), width)).bold(false);
  builder.line(linePair("Pagamento", data.paymentMethod, width));
  if (typeof data.paidAmount === "number") builder.line(linePair("Recebido", formatMoney(data.paidAmount), width));
  if (typeof data.changeAmount === "number") builder.line(linePair("Troco", formatMoney(data.changeAmount), width));
  if (data.taxInfo) builder.separator(width).line(sanitizeText(data.taxInfo));

  if (qrCode?.value) {
    builder.separator(width);
    if (qrCode.label) builder.align("center").line(qrCode.label);
    builder.align("center").qrCode(qrCode);
  }

  builder
    .separator(width)
    .align("center")
    .line(data.message ?? "Obrigado pela preferencia.")
    .feed(3)
    .cut();

  return builder.build();
}
