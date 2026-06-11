# @noogym/printer

Lib interna para impressao termica POS no Noogym. A primeira base usa ESC/POS generico e esta preparada para impressoras Epson, Bematech, Xprinter, Rongta, WINTEC e modelos compativeis, incluindo a WINTEC WIN91PT.

Esta lib nao implementa faturacao AGT. Os campos fiscais existem apenas como preparacao: `invoiceNumber`, `fiscalDocumentType` e `taxInfo`.

## Configurar impressora LAN/IP

```ts
import { printTestPage, type PrinterConfig } from "@noogym/printer";

const printer: PrinterConfig = {
  name: "Recepcao",
  connectionType: "network",
  profile: "generic",
  paperWidth: 58,
  network: {
    host: "192.168.1.50",
    port: 9100,
    timeoutMs: 5000
  }
};

await printTestPage(printer);
```

## Configurar USB no Electron

USB precisa de uma bridge Electron/nativa para listar dispositivos e enviar bytes. A lib procura por `globalThis.noogymUsbPrinterBridge`.

```ts
globalThis.noogymUsbPrinterBridge = {
  async listPrinters() {
    return [];
  },
  async send(config, payload) {
    // Enviar payload para driver USB/nativo.
    return {
      success: true,
      code: "USB_PRINT_SENT",
      message: "Trabalho enviado por USB.",
      bytesWritten: payload.length,
      printerName: config.name
    };
  }
};
```

## Imprimir recibo

```ts
import { printReceipt } from "@noogym/printer";

await printReceipt({
  gymName: "Noogym Fitness Center",
  nif: "5000000000",
  address: "Luanda, Angola",
  customerName: "Maria Sacalumbo",
  paymentMethod: "Dinheiro",
  items: [
    { name: "Whey Protein 900g", quantity: 1, unitPrice: 15600 }
  ],
  total: 15600,
  message: "Obrigado pela preferencia.",
  qrCode: {
    label: "Validar recibo",
    value: "https://noogym.com/receipt/123"
  }
}, printer);
```

## Testar impressao

Sem impressora ligada, use o teste em `dryRun`:

```bash
pnpm --filter @noogym/printer print:test
```

Para testar uma impressora real, use `printTestPage(config)` com `dryRun: false` ou sem `dryRun`.

## Abrir gaveta

```ts
import { openCashDrawer } from "@noogym/printer";

await openCashDrawer({
  ...printer,
  cashDrawer: {
    enabled: true,
    pin: 0,
    onTimeMs: 50,
    offTimeMs: 250
  }
});
```

## API publica

- `printTestPage(config)`
- `printReceipt(data, config)`
- `printQRCode(data, config)`
- `openCashDrawer(config)`
- `getAvailablePrinters()`
- `validatePrinterConfig(config)`
- `configurePrinter(config)`
- `createPrinterService(config)`
