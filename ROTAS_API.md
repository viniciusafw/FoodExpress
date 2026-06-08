# Rotas de API — status atual

## Status geral

- Build backend: OK
- Build frontend: OK
- Runtime: depende de banco configurado
- Segurança: revisão pendente em autenticação e rate limiter

## Rotas principais

### Autenticação

- `POST /api/auth/login` — envio do código de acesso por e-mail
- `POST /api/auth/login/confirmar` — confirmação do código e emissão de JWT
- `POST /api/auth/registrar` — cadastro inicial do cliente
- `POST /api/auth/session` — sessão local/fluxos internos (revisar segurança)
- `POST /api/auth/auth0-sync` — sincronização com Auth0

### Recursos de negócio

- `GET /api/restaurantes`
- `GET /api/cardapio`
- `GET /api/pedidos`
- `GET /api/entregadores`
- `GET /api/clientes`
- `GET /api/avaliacoes`
- `GET /api/cupons`
- `GET /api/tickets`
- `GET /api/relatorios`
- `POST /api/rotas/calcular`
- `GET /health`

## Observação de validação

A reprodução de testes confirmada foi:

1. `/health` responde, mas com erro de banco no ambiente atual (`Unknown database 'railway'`).
2. `/api/auth/session` com `cadastro=true` emite JWT válido sem validação real de cadastro.
3. `/api/restaurantes` retorna `429` após várias requisições, confirmando o rate limiter ativo.

## Conclusão

A base está compilando e a API está acessível, mas a segurança da sessão e o ambiente de banco precisam de correção antes de considerar o projeto totalmente estável para produção.
