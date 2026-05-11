# ADR 0012: Sem APIs externas obrigatorias no MVP desktop

## Status

Aceita.

## Contexto

O MVP desktop precisa funcionar localmente, sem depender de rede, APIs externas ou imagens remotas obrigatorias.

## Decisao

Nao usar API externa obrigatoria nos fluxos operacionais atuais. Integracoes como pagamentos, WhatsApp, catracas e API ficam como configuracoes simuladas.

## Consequencias

- `npm run dev` e `npm run build` devem funcionar sem credenciais externas.
- Uploads, exportacoes, importacoes, QR Code, codigo de barras e sincronizacao sao simulados.
- Futuras integracoes devem ser adicionadas por adaptadores, preservando a operacao offline.
