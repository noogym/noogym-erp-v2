# ADR 0018: Impressao termica na versao web

## Status

Aceita.

## Contexto

O Desktop consegue enviar ESC/POS para USB, Serial e LAN porque roda fora do sandbox do navegador. A versao web, aberta em browser comum, nao pode escrever diretamente em USB/Serial/TCP nem abrir gaveta de dinheiro de forma confiavel.

Mesmo assim, o web-admin precisa permitir recibos no POS e pagamentos quando o ginasio nao usa o Desktop.

## Decisao

A impressao passa a ter tres caminhos:

- Desktop/Electron: usa `window.noogym.printer` e `@noogym/printer` para impressao ESC/POS completa.
- Web browser: abre recibo HTML termico e chama `window.print()`, permitindo que o usuario escolha a impressora instalada no sistema.
- Web com Print Agent: quando `printing.webPrintMode` e `agent`, o web-admin chama um agente local em `printing.printAgentUrl`, por padrao `http://127.0.0.1:47891`, para enviar ESC/POS e abrir gaveta.

O POS tenta Desktop primeiro, depois Print Agent quando configurado, e por fim impressao do navegador.

O agente local fica em `apps/print-agent` e expoe:

- `GET /health`
- `GET /v1/printers`
- `POST /v1/print/test`
- `POST /v1/print/receipt`
- `POST /v1/printer/cash-drawer`

## Consequencias

- A versao web funciona sem instalacao extra usando o dialogo de impressao do navegador.
- Impressao termica real com gaveta no browser exige Noogym Print Agent local.
- A configuracao operacional registra o modo web e a URL do agente.
- O Desktop continua sendo o caminho mais completo para recepcao/POS.
