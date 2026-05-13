# ADR 0009: Alinhar dominio operacional da API aos fluxos do admin

## Status

Aceita.

## Contexto

O `web-admin` e o desktop compartilham a mesma experiencia administrativa em `packages/admin`. Essa experiencia ja possui fluxos operacionais para produtos, vendas POS, aulas e funcionarios, alem dos dominios ja cobertos pela API como membros, planos, assinaturas, pagamentos, check-ins, treinos e relatorios.

Antes desta decisao, parte desses fluxos existia apenas como estado local, mocks ou estruturas de UI. Para o `web-admin` funcionar como SaaS real, o backend precisa persistir esses dominios sem perder a arquitetura multi-tenant existente.

Tambem e importante preservar a separacao entre conceitos que parecem proximos, mas tem responsabilidades diferentes:

- `User`: identidade de acesso ao sistema, autenticacao e RBAC.
- `Employee`: funcionario operacional do ginasio, com ou sem login.
- `Member`: cliente/aluno.
- `Product`: item ou servico vendido no POS.
- `Sale`: transacao comercial do POS.
- `Payment`: registro financeiro de pagamento.
- `GymClass`: aula operacional com sala, instrutor, capacidade e presencas.
- `Appointment`: agenda generica para eventos, reunioes, personal, avaliacoes e outros compromissos.

## Decisao

Expandir o schema e os modulos do `noogym-erp-api` para cobrir explicitamente os fluxos operacionais que o admin ja apresenta:

- Produtos e estoque com `Product` e `StockMovement`.
- Vendas POS com `Sale` e `SaleItem`.
- Funcionarios operacionais com `Employee`, opcionalmente vinculado a `User`.
- Aulas coletivas com `GymClass` e `ClassEnrollment`.

Todos esses modelos devem continuar escopados por `organizationId`. Quando fizer sentido operacional, tambem podem ser escopados por `gymId`.

As vendas POS devem gerar itens, reduzir estoque de produtos controlados e criar pagamento vinculado. Cancelamentos devem cancelar pagamentos vinculados e devolver estoque quando aplicavel.

Aulas devem ter instrutor, sala, capacidade, participantes e inscricoes/presencas. Elas devem ser modeladas separadamente de `Appointment`, porque o frontend trata aulas como um dominio operacional recorrente e reportavel, nao apenas como um compromisso generico de agenda.

Funcionarios devem existir como entidade propria para permitir cadastro de equipe, cargos, salarios, status e relatorios mesmo quando a pessoa nao possui acesso ao sistema. Quando houver login, `Employee.userId` cria a ligacao com `User`.

## Consequencias

- O backend passa a representar melhor os fluxos reais do `web-admin` e a futura sincronizacao do desktop.
- A visao SaaS existente permanece: multi-tenancy por `organizationId`, RBAC por `UserRole`, auditoria, validacao global e documentacao OpenAPI.
- Produtos, vendas POS, aulas e funcionarios deixam de depender apenas de mocks/localStorage para fluxos SaaS.
- Relatorios podem separar melhor receita de assinaturas, vendas POS, produtos, aulas e desempenho de equipe.
- `Payment` continua sendo o registro financeiro; `Sale` representa a operacao comercial que pode gerar um ou mais pagamentos.
- `User` nao deve ser usado como substituto de funcionario operacional; o vinculo com `Employee` e opcional.
- Futuras mudancas nos adapters do frontend devem consumir esses contratos REST em vez de duplicar regras de estoque, venda e presenca no cliente.
