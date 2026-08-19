# Architecture Decision Records

Este diretorio guarda as decisoes arquiteturais do Noogym Monorepo, incluindo o desktop Electron, o web-admin Next.js, os packages compartilhados e o backend `noogym-erp-api`.

Formato usado:

- Status
- Contexto
- Decisao
- Consequencias

ADRs atuais:

- [0001 - Aplicacao desktop com Electron, React e TypeScript](0001-electron-react-typescript.md)
- [0002 - Renderer com Vite e componentes React](0002-vite-renderer-react.md)
- [0003 - Design system dark premium com Tailwind](0003-tailwind-dark-premium-design-system.md)
- [0004 - Estado de UI e dominio com Zustand](0004-zustand-state-management.md)
- [0005 - Persistencia local-first com localStorage](0005-local-first-localstorage.md)
- [0006 - Stores por dominio operacional](0006-domain-stores.md)
- [0007 - Componentes reutilizaveis de formularios, modais e tabelas](0007-reusable-components.md)
- [0008 - Fluxos simulados com dados mockados](0008-mocked-operational-flows.md)
- [0009 - Sincronizacao offline simulada](0009-offline-sync-simulation.md)
- [0010 - Interface em portugues, moeda Kz e contexto Angola](0010-portuguese-angola-kz.md)
- [0011 - Autenticacao preservada no shell principal](0011-auth-shell-separation.md)
- [0012 - Sem APIs externas obrigatorias no MVP desktop](0012-no-required-external-apis.md)
- [0013 - Backend ERP API com NestJS para web-admin e desktop](0013-nestjs-erp-api-for-clients.md)
- [0014 - Setup local previsivel para desenvolvimento](0014-local-dev-setup.md)
- [0015 - Web-admin API-first nas stores operacionais](0015-web-admin-api-first-stores.md)
- [0016 - Integracoes operacionais e mensageria sem sucesso simulado](0016-operational-integrations-and-messaging.md)
- [0017 - Identidade Noogym global e vinculos com ginasios](0017-noogym-identity-linking.md)
- [0018 - Impressao termica na versao web](0018-web-printing-and-print-agent.md)

ADRs especificos do backend:

- [apps/noogym-erp-api/docs/adr](../../apps/noogym-erp-api/docs/adr/README.md)
