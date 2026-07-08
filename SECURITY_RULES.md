# Noogym ERP Security Rules

Estas regras sao obrigatorias para qualquer merge no Noogym ERP. Elas refletem a regra de negocio atual do projeto: SaaS multi-tenant por `organizationId`, com `gymId` como escopo de unidade dentro da organizacao.

## 1. Escopo multi-tenant

- `organizationId` nunca pode vir do frontend em body, query ou params para decidir acesso.
- Toda leitura, criacao, atualizacao e remocao de entidade tenant-aware deve usar o `organizationId` do usuario autenticado.
- Qualquer ID recebido do cliente (`gymId`, `memberId`, `planId`, `subscriptionId`, `paymentId`, `saleId`, `sellerId`, `userId`, `employeeId`) deve ser validado contra o `organizationId` autenticado antes de uso.
- `gymId` nao substitui `organizationId`. Ele so restringe dados quando a regra de papel, unidade ou associacao `UserGym` exigir.
- Dashboards globais de `OWNER`, `ADMIN` e papeis autorizados podem agregar dados da organizacao inteira.

## 2. Autenticacao e sessao

- Senhas devem ser armazenadas apenas como hash bcrypt ou algoritmo equivalente aprovado.
- `JWT_SECRET` deve ser obrigatorio em ambientes que nao sejam desenvolvimento local e deve ter entropia adequada.
- Tokens JWT devem ter expiracao configurada e documentada.
- Login, register e recuperacao de senha devem ter rate limiting.
- Refresh tokens devem ser emitidos separadamente do access token, armazenados no banco apenas como hash e rotacionados a cada uso de `POST /auth/refresh`.
- Logout server-side deve revogar o refresh token persistido, removendo o hash associado ao usuario.
- `JWT_REFRESH_SECRET` deve ser diferente de `JWT_SECRET` em producao, ter entropia adequada e expiracao documentada por `JWT_REFRESH_EXPIRES_IN`.
- Nenhum endpoint protegido pode depender apenas de validacao no frontend.

## 3. Autorizacao e RBAC

- Todo controller de dominio deve usar `JwtAuthGuard`; rotas sensiveis devem usar `RolesGuard` e `@Roles`.
- Relatorios financeiros, pagamentos, despesas, auditoria, configuracoes, usuarios, integracoes e sync desktop exigem RBAC explicito.
- `SUPER_ADMIN` nao deve ignorar isolamento tenant sem uma politica explicita e testada.
- Alteracoes de papel, estado de usuario e senha devem ser restritas a papeis administrativos autorizados.
- Qualquer nova role deve atualizar controllers, testes e esta matriz de seguranca.

## 4. Dados financeiros

- Valores financeiros finais devem ser calculados no backend.
- O frontend nao pode definir total final, estado contabil definitivo, divida, multa, desconto aprovado ou imposto final sem validacao server-side.
- Pagamentos, vendas, descontos, cancelamentos e ajustes devem gerar trilha auditavel.
- Pagamentos confirmados nao devem ser sobrescritos silenciosamente; correcoes devem preferir ajuste, cancelamento, estorno ou novo evento financeiro.
- Criacao manual de pagamentos deve validar relacoes com membro, assinatura ou venda dentro do `organizationId`.
- Duplicidade de pagamento deve ser prevenida por referencia, assinatura, venda ou chave idempotente quando aplicavel.

## 5. Check-in e presenca

- Check-in deve validar membro ativo, assinatura ativa e validade do plano no backend.
- `memberId` e `gymId` devem pertencer ao `organizationId` autenticado.
- O cliente nao deve controlar `checkedAt` sem permissao operacional explicita.
- Saidas, presencas em aulas e check-ins especiais devem manter registro auditavel.

## 6. Dados pessoais

- Dados de membros, funcionarios e usuarios devem ser retornados apenas nos campos necessarios para cada tela.
- `passwordHash` nunca pode ser selecionado em respostas HTTP.
- Documentos pessoais, contactos de emergencia, notas e informacoes financeiras devem ter exposicao minima.
- Logs e auditoria nao devem registrar senhas, tokens, documentos completos ou dados financeiros sensiveis no corpo da request.

## 7. Frontend e armazenamento local

- Logica sensivel deve residir no backend; o frontend pode otimizar UX, mas nao autorizar operacoes.
- O uso atual de `localStorage` para simulacao local-first e dados operacionais do MVP e uma decisao arquitetural existente.
- O web-admin deve preferir o modo de sessao com cookie `HttpOnly`, `Secure` e `SameSite`, emitido pelo BFF Next em `/api/auth/*`.
- O refresh token nao deve ficar acessivel a JavaScript no SaaS web. `localStorage` para tokens fica restrito a fluxos legados, desktop/local-first ou ambientes sem BFF.
- Novos secrets, chaves de integracao, tokens de terceiros ou dados fiscais sensiveis nao podem ser armazenados no frontend.
- Erros exibidos ao usuario nao devem revelar stack trace, queries, secrets ou detalhes internos.

## 8. API, infraestrutura e headers

- CORS deve usar allowlist por ambiente, nunca politica aberta em producao.
- A API deve aplicar headers de seguranca adequados, preferencialmente via Helmet ou middleware equivalente.
- Endpoints publicos devem ser intencionais e documentados.
- DTOs devem usar `class-validator` e a API deve manter `whitelist` e `forbidNonWhitelisted`.
- Uploads futuros devem validar tipo, tamanho, extensao, armazenamento e acesso.
- Dependencias devem ser auditadas antes de releases.

## 9. Integracoes e secrets

- Secrets reais nunca devem ser versionados.
- `.env`, `.env.local` e variantes devem permanecer no `.gitignore`.
- `.env.example` pode conter apenas placeholders seguros.
- Configuracoes de integracao que contenham secrets devem ser criptografadas ou movidas para storage seguro antes de uso em producao.
- Logs nao devem imprimir tokens, API keys, senhas, connection strings ou payloads sensiveis.

## 10. Faturacao Angola e AGT

- Enquanto nao existir modulo fiscal completo, faturas, recibos, numeracao fiscal, impostos oficiais e integracoes AGT devem ser classificados como requisito futuro, nao como funcionalidade parcialmente segura.
- Quando esse modulo existir, numero de documento, imposto, desconto, valor final, anulacao e retificacao devem ser calculados e auditados no backend.
- Documentos fiscais emitidos devem ser imutaveis; correcoes devem usar anulacao, nota ou evento fiscal apropriado.

## 11. Testes obrigatorios de seguranca

Antes de merge em qualquer fluxo sensivel, adicionar ou manter testes para:

- acesso cruzado entre `organizationId`;
- manipulacao de IDs recebidos do frontend;
- usuario autenticado sem role necessaria;
- refresh token expirado, adulterado, reutilizado apos rotacao ou revogado por logout;
- acesso indevido a relatorios financeiros;
- criacao ou alteracao de pagamentos com valor/status manipulado;
- venda com preco, desconto, imposto ou total adulterado;
- check-in sem membro ativo ou assinatura ativa;
- relacoes com `gymId`, `memberId`, `planId`, `subscriptionId`, `saleId`, `userId` e `employeeId` de outra organizacao;
- resposta sem `passwordHash` e sem dados sensiveis desnecessarios;
- entradas maliciosas em DTOs e query params.

## 12. Checklist antes de merge

- [ ] Nao aceitei `organizationId` do frontend.
- [ ] Validei todos os IDs relacionados contra o tenant autenticado.
- [ ] A rota tem `JwtAuthGuard` quando nao e publica.
- [ ] A rota sensivel tem `RolesGuard` e `@Roles`.
- [ ] Fluxos de auth nao expuseram `refreshTokenHash` nem persistiram refresh token em texto puro.
- [ ] Valores financeiros decisivos sao calculados ou validados no backend.
- [ ] Nao expus `passwordHash`, tokens, secrets ou dados pessoais desnecessarios.
- [ ] Nao registei secrets ou dados sensiveis em logs/auditoria.
- [ ] Mantive a regra `organizationId` como fronteira SaaS e `gymId` como escopo de unidade.
- [ ] Atualizei ou adicionei testes de seguranca proporcionais ao risco.
- [ ] Rodei lint, typecheck e testes relevantes quando possivel.
