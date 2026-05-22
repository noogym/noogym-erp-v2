# ADR-0004: Usar JWT com RBAC por UserRole

## Status

Aceite

## Contexto

A API precisa autenticar usuarios e diferenciar permissoes entre papeis como OWNER, ADMIN, MANAGER, TRAINER, RECEPTIONIST, FINANCE e NUTRITIONIST.

Algumas acoes devem ser restritas, por exemplo gestao de usuarios, configuracoes, integracoes, despesas e auditoria.

## Decisao

Usar JWT Bearer Auth com Passport e `JwtStrategy`.

O token contem:

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "ADMIN",
  "organizationId": "organization-id"
}
```

Usar `JwtAuthGuard` para autenticar endpoints protegidos e `RolesGuard` com decorator `@Roles(...)` para controle de acesso por papel.

Senhas devem ser armazenadas com hash bcrypt.

## Consequencias

Beneficios:

- Auth stateless e simples para clientes web/mobile.
- Role do usuario disponivel em cada request.
- Controle declarativo nos controllers.

Custos:

- Revogacao imediata de token exige estrategia adicional.
- Permissoes mais granulares podem exigir uma matriz dedicada no futuro.
- Mudancas de role so refletem em tokens novos.
