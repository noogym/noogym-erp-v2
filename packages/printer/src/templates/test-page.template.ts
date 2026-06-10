import { EscPosBuilder } from "../adapters/escpos.adapter";
import type { PrinterConfig } from "../types";
import { formatDate } from "../utils/format-date";

export function buildTestPageTemplate(config?: PrinterConfig) {
  const width = config?.paperWidth === 80 ? 48 : 32;

  return new EscPosBuilder()
    .initialize()
    .align("center")
    .bold()
    .size(2, 1)
    .line("NOOGYM")
    .size(1, 1)
    .line("Teste de impressao")
    .bold(false)
    .separator(width)
    .align("left")
    .line(`Perfil: ${config?.profile ?? "generic"}`)
    .line(`Conexao: ${config?.connectionType ?? "nao configurada"}`)
    .line(`Papel: ${config?.paperWidth ?? 58}mm`)
    .line(`Data: ${formatDate(new Date())}`)
    .separator(width)
    .line("Se esta mensagem foi impressa,")
    .line("a comunicacao ESC/POS esta pronta.")
    .separator(width)
    .align("center")
    .line("QR de teste")
    .qrCode({ value: "https://noogym.com", size: 5 })
    .feed(3)
    .cut()
    .build();
}
