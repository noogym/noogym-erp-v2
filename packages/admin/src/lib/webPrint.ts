type PrintResult = {
  success: boolean;
  message: string;
  code?: string;
  error?: string;
};

type ReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  total?: number;
  sku?: string;
};

type ReceiptPrintData = {
  gymName: string;
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
  qrCode?: { label?: string; value: string } | string;
};

type BrowserPrintOptions = {
  paperWidth?: 58 | 80;
  title?: string;
};

const defaultPrintAgentUrl = "http://127.0.0.1:47891";

export function printReceiptInBrowser(data: ReceiptPrintData, options: BrowserPrintOptions = {}): PrintResult {
  if (typeof window === "undefined") {
    return {
      success: false,
      code: "BROWSER_UNAVAILABLE",
      message: "Impressao do navegador indisponivel fora do browser."
    };
  }

  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) {
    return {
      success: false,
      code: "POPUP_BLOCKED",
      message: "O navegador bloqueou a janela de impressao."
    };
  }

  printWindow.document.open();
  printWindow.document.write(receiptHtml(data, options));
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 250);

  return {
    success: true,
    code: "BROWSER_PRINT_OPENED",
    message: "Recibo aberto na impressao do navegador."
  };
}

export async function printReceiptViaAgent(data: ReceiptPrintData, config: unknown, agentUrl?: string): Promise<PrintResult> {
  return postPrintAgent("/v1/print/receipt", { data, config }, agentUrl);
}

export async function openCashDrawerViaAgent(config: unknown, agentUrl?: string): Promise<PrintResult> {
  return postPrintAgent("/v1/printer/cash-drawer", { config }, agentUrl);
}

export function normalizedPrintAgentUrl(agentUrl?: string) {
  const value = agentUrl?.trim() || defaultPrintAgentUrl;
  return value.replace(/\/+$/, "");
}

async function postPrintAgent(path: string, body: unknown, agentUrl?: string): Promise<PrintResult> {
  try {
    const response = await fetch(`${normalizedPrintAgentUrl(agentUrl)}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const payload = await response.json().catch(() => ({})) as Partial<PrintResult>;
    if (!response.ok) {
      return {
        success: false,
        code: payload.code ?? "PRINT_AGENT_ERROR",
        message: payload.message ?? "Print Agent respondeu com erro.",
        error: payload.error ?? response.statusText
      };
    }

    return {
      success: payload.success ?? true,
      code: payload.code ?? "PRINT_AGENT_SENT",
      message: payload.message ?? "Trabalho enviado para o Print Agent.",
      error: payload.error
    };
  } catch (error) {
    return {
      success: false,
      code: "PRINT_AGENT_UNAVAILABLE",
      message: "Noogym Print Agent local indisponivel.",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function receiptHtml(data: ReceiptPrintData, options: BrowserPrintOptions) {
  const width = options.paperWidth ?? 58;
  const qrValue = typeof data.qrCode === "string" ? data.qrCode : data.qrCode?.value;
  const title = options.title ?? `Recibo ${data.invoiceNumber ?? ""}`.trim();

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: ${width}mm auto; margin: 4mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #fff;
      color: #111;
      font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
      font-size: ${width === 80 ? 12 : 10}px;
      line-height: 1.35;
    }
    .receipt { width: ${width}mm; max-width: 100%; margin: 0 auto; }
    h1 { margin: 0 0 4px; font-size: ${width === 80 ? 18 : 15}px; text-align: center; }
    .center { text-align: center; }
    .muted { color: #444; }
    .line { border-top: 1px dashed #111; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .item { margin: 6px 0; }
    .item-name { overflow-wrap: anywhere; }
    .total { font-weight: 700; font-size: ${width === 80 ? 14 : 12}px; }
    .qr { overflow-wrap: anywhere; font-size: ${width === 80 ? 10 : 9}px; }
    @media screen {
      body { background: #f4f4f5; padding: 16px; }
      .receipt { background: #fff; padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.12); }
    }
  </style>
</head>
<body>
  <main class="receipt">
    <h1>${escapeHtml(data.gymName)}</h1>
    <p class="center muted">${escapeHtml(formatDate(data.date))}</p>
    <div class="line"></div>
    ${infoLine("Recibo", data.invoiceNumber)}
    ${infoLine("Cliente", data.customerName)}
    ${infoLine("Caixa", data.cashierName)}
    ${infoLine("Pagamento", data.paymentMethod)}
    <div class="line"></div>
    ${data.items.map(itemHtml).join("")}
    <div class="line"></div>
    ${moneyLine("Subtotal", data.subtotal)}
    ${moneyLine("Desconto", data.discount)}
    ${moneyLine("Taxa", data.tax)}
    ${moneyLine("Total", data.total, "total")}
    ${moneyLine("Recebido", data.paidAmount)}
    ${moneyLine("Troco", data.changeAmount)}
    <div class="line"></div>
    <p class="center">${escapeHtml(data.message ?? "Obrigado pela preferencia.")}</p>
    ${qrValue ? `<p class="qr center">${escapeHtml(qrValue)}</p>` : ""}
  </main>
  <script>window.addEventListener("afterprint", () => window.close());</script>
</body>
</html>`;
}

function itemHtml(item: ReceiptItem) {
  const total = item.total ?? item.unitPrice * item.quantity;
  return `<div class="item">
    <div class="item-name">${escapeHtml(item.quantity)}x ${escapeHtml(item.name)}</div>
    <div class="row muted"><span>${escapeHtml(item.sku ?? "")}</span><span>${formatMoney(total)}</span></div>
  </div>`;
}

function infoLine(label: string, value?: string) {
  return value ? `<div class="row"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>` : "";
}

function moneyLine(label: string, value?: number, className = "") {
  if (value === undefined || value === null || value === 0 && label !== "Total") return "";
  return `<div class="row ${className}"><span>${escapeHtml(label)}</span><span>${formatMoney(value)}</span></div>`;
}

function formatMoney(value: number) {
  return `${Number(value).toLocaleString("pt-AO")} Kz`;
}

function formatDate(value?: Date | string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  return new Intl.DateTimeFormat("pt-AO", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
