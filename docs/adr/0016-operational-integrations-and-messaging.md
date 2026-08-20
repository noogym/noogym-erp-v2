# ADR 0016: Integracoes operacionais e mensageria sem sucesso simulado

## Status

Aceita.

## Contexto

Alguns fluxos operacionais comunicavam sucesso mesmo quando nao existia integracao real configurada, como mensagens, biometria e acoes auxiliares. Para SaaS, isso gera falsa confianca operacional.

O backend ja possui modulo de mensagens com `POST /messages` e `PATCH /messages/:id/send`, enquanto a entrega externa por WhatsApp, SMS ou e-mail depende de provedores futuros.

## Decisao

Fluxos operacionais nao devem confirmar sucesso simulado. Quando existir endpoint interno, a UI deve chama-lo e comunicar exatamente o que foi confirmado pela API. Quando depender de hardware ou provedor externo ainda nao configurado, a UI deve informar estado "nao configurado".

Mensagens do admin devem ser registradas/enviadas via API interna usando destinatarios com `remoteId` valido. Convites de aluno e funcionario devem passar pelos endpoints de `identity-links`. O conteudo pode incluir rodape institucional incentivando o app Noogym, mas a entrega externa deve ser tratada como responsabilidade do backend/provedor.

Biometria, catraca, backup cloud e outros provedores devem seguir o mesmo padrao: integracao real, ou estado indisponivel/configuravel, sem toast de sucesso artificial.

## Consequencias

- A operacao fica honesta sobre o que foi realmente executado.
- A evolucao para WhatsApp Business, RabbitMQ, WSO2 AM e demais produtos Noogym fica atras de contratos claros da API.
- Quando forem adicionados providers externos, o backend deve concentrar orquestracao, auditoria, retry e status de entrega.
- A UI deve preferir feedback acionavel: "registrado na API", "aguardando provedor", "nao configurado" ou erro detalhado.
