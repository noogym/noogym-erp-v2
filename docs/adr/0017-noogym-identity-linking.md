# ADR 0017: Identidade Noogym global e vinculos com ginasios

## Status

Aceita.

## Contexto

Alunos e funcionarios podem existir no ecossistema Noogym antes de serem cadastrados em um ginasio especifico. O ERP precisa permitir cadastro rapido quando a pessoa ja tem app, usando Noogym ID, QR de identificacao, codigo de barras ou cartao fisico.

Tambem e necessario convidar alunos sem app e funcionarios sem conta para entrar no ecossistema, preferencialmente por WhatsApp, SMS e e-mail.

## Decisao

Separar identidade global Noogym de vinculo operacional com ginasio.

`NoogymIdentity` representa a pessoa no app/ecossistema Noogym. `Member` representa o vinculo do aluno com uma organizacao/unidade. Um mesmo `NoogymIdentity` pode originar cadastros em ginasios diferentes, respeitando unicidade por organizacao.

`NoogymIdentityAlias` representa identificadores alternativos da identidade global. Alias ativos podem ser `NOOGYM_ID`, `QR_TOKEN`, `BARCODE` ou `CARD`, permitindo que ginasios modernos usem QR/app enquanto unidades antigas usam leitor de codigo de barras ou cartao.

`Member.accessCode` representa o codigo local de acesso do aluno no ginasio. Ele permite check-in por leitor USB mesmo quando o aluno ainda nao tem conta no app.

O backend expoe `identity-links` para:

- resolver uma identidade por Noogym ID, email, telefone, documento, QR, codigo de barras ou cartao;
- criar/vincular membro a partir da identidade;
- convidar membro sem app por canais de mensagem;
- convidar funcionario para criar/ativar conta de acesso.

O `web-admin` deve usar esse contrato no cadastro de cliente: ao informar Noogym ID, QR, barcode ou cartao, a UI preenche dados autorizados e salva o membro vinculado. Quando nao ha identidade, o cadastro normal cria um `accessCode` local e dispara convite ao app apos criar o membro remoto.

## Consequencias

- A conta do app pertence a pessoa; o contrato, plano, check-in e pagamentos pertencem ao ginasio.
- O ERP reduz tempo de cadastro e evita duplicidade quando o aluno ja existe no ecossistema.
- IDs locais temporarios continuam separados de IDs remotos e de Noogym ID.
- Codigo de barras e cartao passam a ser aliases revogaveis, nao novas identidades.
- Check-in por scanner pode validar QR, barcode, cartao ou accessCode local.
- Convites atuais ficam registrados pela API; provedores reais de WhatsApp/SMS/e-mail devem ser plugados posteriormente no backend.
- Futuras integracoes com WSO2 AM, RabbitMQ e produtos Noogym devem publicar eventos como `identity.resolved`, `member.linked`, `member.invite.requested` e `employee.invite.requested`.
