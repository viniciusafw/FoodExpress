# FoodExpress — Monorepo

Projeto com frontend React + Vite e backend Express + TypeScript.

## Status verificado em 2026-06-08

- ✅ Build do backend concluído com `cd backend && npm run build`
- ✅ Build do frontend concluído com `cd frontend && npm run build`
- ⚠️ Execução em runtime ainda depende de variáveis do banco MariaDB/MySQL
- ⚠️ O endpoint `/api/auth/session` com `cadastro=true` foi reproduzido como bypass de cadastro
- ⚠️ O rate limiter está ativo, mas precisa revisão de memória e política de limitação

## Estrutura atual

```text
foodexpress/
├── backend/      # Express + TypeScript + MySQL/MariaDB
├── frontend/     # React + Vite + Tailwind
└── database/     # esquema SQL e apoio de persistência
```

## Configuração rápida

### 1) Instalar dependências

```bash
npm run install:all
```

### 2) Configurar variáveis de ambiente

Backend (`backend/.env`):

```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
MYSQLDATABASE=foodexpress
JWT_SECRET=troque-este-valor
FRONTEND_URL=http://localhost:5173
```

Frontend (`frontend/.env`):

```bash
VITE_API_URL=http://localhost:3001
```

### 3) Executar em desenvolvimento

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

### 4) Validar a base

```bash
cd backend && npm run build
cd frontend && npm run build
```

## Observações importantes

- O backend não sobe completamente sem um banco configurado. No ambiente testado, a rota `/health` retornou `Unknown database 'railway'`.
- A documentação antiga mencionava Clerk/Next/Turso; essa base foi atualizada para refletir a implementação atual.
- Para produção, revisar os pontos críticos de segurança listados nos relatórios do projeto antes de liberar novos acessos.
