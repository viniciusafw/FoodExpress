# Resumo de testes — estado real do projeto

## Data da validação

2026-06-08

## Testes executados

### 1. Build

- `cd backend && npm run build` → OK
- `cd frontend && npm run build` → OK

### 2. Runtime

- `curl http://localhost:3001/health` → retornou status `ok`, mas com erro de banco (`Unknown database 'railway'`)

### 3. Segurança / sessão

- `POST /api/auth/session` com `cadastro=true` retornou JWT válido para um e-mail arbitrário
- Isso reproduz o bypass de cadastro apontado na revisão de segurança

### 4. Rate limiter

- Requisições repetidas para `/api/restaurantes` retornaram `429`
- O comportamento do limiter está ativo, mas precisa revisão de memória e política de uso

### 5. Dependências

- `npm audit --omit=dev` no backend → 0 vulnerabilidades
- `npm audit --omit=dev` no frontend → 2 vulnerabilidades moderadas (`react-router` / `react-router-dom`)

## Situação atual

- A base compila.
- O ambiente de banco precisa ser corrigido para validar fluxos completos.
- A documentação antiga com Playwright/Clerk/Next precisa ser descartada ou revisada, porque não representa a implementação atual.

## Próximos passos recomendados

1. Corrigir a rota `/api/auth/session`.
2. Revisar o rate limiter e a limpeza do `Map` global.
3. Implementar revogação de JWT.
4. Configurar banco real e rodar testes end-to-end completos.
