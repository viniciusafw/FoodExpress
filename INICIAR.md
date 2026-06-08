# FoodExpress — Guia rápido de inicialização

## Como rodar hoje

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## URLs esperadas

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health

## Status de validação confirmado

- Build backend: OK
- Build frontend: OK
- Runtime do backend: depende de banco configurado
- Testes de segurança manuais reproduziram um bypass na rota de sessão e o comportamento do rate limiter

## Próximo passo recomendado

Configure as variáveis `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `MYSQLDATABASE` no backend antes de testar fluxos completos de login e cadastro.
