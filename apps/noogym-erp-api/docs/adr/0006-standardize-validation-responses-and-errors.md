# ADR-0006: Padronizar validacao, respostas e erros HTTP

## Status

Aceite

## Contexto

Uma API SaaS com muitos modulos precisa de respostas consistentes para facilitar consumo pelo frontend e integracoes.

Tambem e necessario validar dados de entrada para reduzir erros de dominio e dados invalidos no banco.

## Decisao

Usar `ValidationPipe` global com:

```ts
whitelist: true
transform: true
forbidNonWhitelisted: true
```

Usar DTOs com `class-validator` e `class-transformer`.

Padronizar respostas de sucesso com:

```json
{
  "success": true,
  "data": {}
}
```

Padronizar erros com:

```json
{
  "success": false,
  "error": {}
}
```

## Consequencias

Beneficios:

- Contrato previsivel para clientes.
- Menos dados inesperados chegando aos services.
- Melhor experiencia ao depurar erros de validacao.

Custos:

- O formato padrao envolve tambem respostas simples.
- Interceptors e filters precisam ser considerados em testes e documentacao.
