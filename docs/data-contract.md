# Noogym Data Contract

Este contrato define a fonte da verdade para os dados operacionais do Noogym. Ele existe para evitar divergencia entre web-admin, desktop SQLite, localStorage e dados mockados.

## Regras gerais

- A API e a fonte da verdade para dados SaaS compartilhados entre dispositivos.
- `organizationId` vem sempre do usuario autenticado no backend.
- `gymId` restringe unidade, mas nunca substitui `organizationId`.
- O desktop pode operar localmente e guardar uma fila de alteracoes, mas a sincronizacao deve reconciliar com a API.
- Mocks servem apenas como fallback de desenvolvimento ou primeiro carregamento local; nao devem prevalecer sobre dados vindos da API ou SQLite sincronizado.
- Valores financeiros finais, autorizacao, check-in valido e mudancas sensiveis devem ser calculados ou validados no backend.

## Matriz de fonte da verdade

| Dominio | Fonte da verdade | Desktop offline | Web-admin | Escopo de unidade | Observacoes |
| --- | --- | --- | --- | --- | --- |
| Organizacoes | API | Leitura em binding local | Super Admin/API | Organizacao | Apenas Super Admin ve todas. |
| Unidades | API | Cache SQLite/binding | API | Organizacao | Troca de unidade deve recarregar colecoes escopadas. |
| Usuarios e permissoes | API | Cache de sessao/binding | API | Organizacao/unidade | Frontend apenas reflete permissoes. |
| Clientes | API | SQLite com fila | API | Unidade quando aplicavel | Conflitos por alteracao remota/local devem ser resolvidos no desktop. |
| Planos | API | SQLite com fila | API | Unidade quando plano tiver unidades | Nome nao e identificador unico. Usar `id`. |
| Produtos | API | SQLite com fila | API | Unidade | Estoque deve reconciliar vendas e ajustes. |
| Vendas POS | API | SQLite com fila | API | Unidade | Totais finais devem ser validados no backend. |
| Pagamentos/financeiro | API | SQLite com fila restrita | API | Unidade/organizacao | Estados finais precisam auditoria e validacao server-side. |
| Check-ins | API | SQLite com fila | API | Unidade | Backend valida membro ativo e assinatura. |
| Aulas | API | SQLite com fila | API | Unidade | Participantes/presencas precisam sincronizacao auditavel. |
| Treinos | API | SQLite com fila | API | Organizacao/cliente | Pode ser local-first, mas deve reconciliar por `remoteId`. |
| Configuracoes operacionais | API | Cache SQLite/local | API | Organizacao/unidade | Valores sensiveis nao ficam em localStorage. |
| Relatorios | API | Leitura derivada local quando offline | API | Conforme permissao | Relatorio financeiro oficial vem do backend. |
| Auditoria | API | Nao editavel | API/Super Admin | Organizacao | Eventos de suporte e escrita sensivel devem ser persistidos. |

## Identidade e sincronizacao

- Todo registo local sincronizavel deve manter `id` local e `remoteId` quando existir correspondencia na API.
- Nomes, labels e titulos nunca sao chaves de identidade.
- Operacoes locais devem entrar na fila com entidade, operacao, payload, tentativas e erro.
- A sincronizacao deve enviar pendencias antes de puxar dados remotos, salvo quando houver conflito aberto.
- Conflitos ficam abertos ate o operador escolher `Manter local` ou `Usar servidor`.
- `Manter local` reenfileira a alteracao; `Usar servidor` aplica a versao remota no SQLite.

## Fluxos que exigem backend

- Login, refresh, reset de senha e revogacao de sessao.
- Criacao/alteracao de usuarios, papeis e permissoes.
- Check-in operacional definitivo.
- Venda concluida, cancelamento, pagamento, estorno e ajuste financeiro.
- Alteracao de estoque por venda ou ajuste.
- Super Admin, impersonacao/suporte e auditoria.
- Relatorios financeiros oficiais.

## Checklist para novas features

- Definir fonte da verdade antes da UI.
- Definir se a entidade e escopada por organizacao, unidade ou usuario.
- Definir se funciona offline no desktop.
- Definir DTO/API e mapper desktop antes de gravar no store.
- Criar teste de acesso cruzado entre organizacoes quando houver backend.
- Criar teste de troca de unidade quando houver `gymId`.
- Evitar localStorage para dados sensiveis ou operacionais definitivos.
