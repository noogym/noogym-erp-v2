import { EscPosBuilder } from "../adapters/escpos.adapter";
import type { PrinterConfig, QRCodePrintData } from "../types";

export function buildQRCodeTemplate(data: QRCodePrintData, config?: PrinterConfig) {
  const width = config?.paperWidth === 80 ? 48 : 32;

  const builder = new EscPosBuilder()
    .initialize()
    .align("center");

  if (data.label) builder.bold().line(data.label).bold(false).separator(width);

  return builder
    .qrCode(data)
    .feed(3)
    .cut()
    .build();
}
