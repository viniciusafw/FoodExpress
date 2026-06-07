# FoodExpress — Monorepo

Projeto completo com **frontend** (React + Vite) e **backend** (Express + TypeScript + Turso).

```
foodexpress/
├── frontend/              ← React + Vite + Tailwind + React Router
│   └── src/
│       ├── pages/         ← Home, Login, Restaurantes, PaginaLoja, Checkout, Gerente...
│       ├── components/    ← Header, NavBar, GavetaCarrinho, CarrosselCategorias...
│       ├── contexts/      ← AuthContext, CartContext
│       ├── data/          ← DadosGerente, DadosPagina, dadosLojas
│       └── utils/         ← mascaras.js
├── backend/               ← Express + TypeScript + Turso (SQLite na nuvem)
│   ├── scripts/
│   │   ├── migrate.ts     ← cria todas as tabelas
│   │   └── seed.ts        ← popula com dados de exemplo
│   └── src/
│       ├── routes/        ← 13 módulos de rotas (ver tabela abaixo)
│       ├── lib/           ← db.ts, validacoes.ts
│       └── middleware/    ← auth.ts (JWT), rateLimit.ts
├── schema.sql             ← estrutura completa do banco
└── package.json           ← scripts monorepo (concurrently)
```

## Configuração rápida

### 1. Instalar dependências
```bash
npm run install:all
```

### 2. Configurar variáveis de ambiente

**Backend** (`backend/.env`):
```bash
cd backend && cp .env.example .env
# Preencha: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, STRIPE_SECRET_KEY, JWT_SECRET
```

**Frontend** (`frontend/.env`):
```bash
cd frontend && cp .env.example .env
# Preencha: VITE_API_URL=http://localhost:3001
```

### 3. Criar o banco (Turso)
```bash
# Crie conta em https://turso.tech
turso db create foodexpress
turso db show foodexpress --url    # → TURSO_DATABASE_URL
turso db tokens create foodexpress # → TURSO_AUTH_TOKEN
```

### 4. Rodar migrations e seed
```bash
cd backend
npm run migrate   # cria as tabelas
npm run seed      # insere dados de exemplo (5 restaurantes, 15 itens)
```

### 5. Rodar em desenvolvimento
```bash
# Na raiz — roda frontend (3000) + backend (3001) juntos:
npm run dev
```

---

## API — Endpoints completos

### Restaurantes
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/restaurantes | Listar (filtros: categoria, ordenar, limite) |
| GET | /api/restaurantes/:id | Detalhe |
| POST | /api/restaurantes | Criar (auth) |
| PUT | /api/restaurantes/:id | Atualizar (auth) |
| DELETE | /api/restaurantes/:id | Desativar (auth) |
| GET | /api/restaurantes/cadastro | Buscar restaurante do usuário logado |
| POST | /api/restaurantes/cadastro | Criar registro inicial ao selecionar role |
| POST | /api/restaurantes/:id/aprovar | Aprovar ou rejeitar restaurante (gerente) |

### Cardápio
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/cardapio | Listar (filtros: restauranteId, categoria) |
| GET | /api/cardapio/:id | Detalhe do item |
| POST | /api/cardapio | Criar item (auth) |
| PUT | /api/cardapio/:id | Atualizar item (auth) |
| DELETE | /api/cardapio/:id | Desativar item (auth) |

### Pedidos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/pedidos | Listar (filtros: status, clienteId, restauranteId, entregadorId) |
| GET | /api/pedidos/:id | Detalhe |
| POST | /api/pedidos | Criar + gerar PaymentIntent Stripe |
| PUT | /api/pedidos/:id | Atualizar status/tempo |
| DELETE | /api/pedidos/:id | Cancelar (com multa após 5 min) |
| GET | /api/pedidos/:id/rastrear | Rastrear em tempo real |
| POST | /api/pedidos/:id/atribuir-entregador | Atribuir entregador manualmente |
| POST | /api/pedidos/:id/atribuir-entregador-automatico | Atribuir o mais próximo automaticamente |

### Entregadores
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/entregadores | Listar (filtro: status) |
| GET | /api/entregadores/:id | Detalhe |
| POST | /api/entregadores | Criar (auth) |
| PUT | /api/entregadores/:id | Atualizar (auth) |
| DELETE | /api/entregadores/:id | Desativar (auth) |
| GET | /api/entregadores/cadastro | Buscar entregador do usuário logado |
| POST | /api/entregadores/cadastro | Criar registro inicial ao selecionar role |
| POST | /api/entregadores/:id/disponibilidade | Toggle online/offline |

### Outros
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/clientes | Buscar cliente logado |
| POST | /api/clientes | Criar cliente |
| PUT | /api/clientes/:id | Atualizar perfil |
| GET | /api/avaliacoes | Listar avaliações |
| POST | /api/avaliacoes | Criar avaliação |
| GET | /api/cupons?codigo=XXX&total=50 | Validar cupom |
| POST | /api/cupons | Criar cupom |
| GET | /api/disputas | Listar disputas |
| POST | /api/disputas | Abrir disputa |
| PUT | /api/disputas/:id | Responder/resolver disputa |
| GET | /api/tickets | Listar tickets de suporte |
| POST | /api/tickets | Criar ticket |
| GET | /api/relatorios?tipo=vendas | 12 tipos de relatório gerencial |
| POST | /api/rotas/calcular | Calcular distância e tempo estimado |
| POST | /api/documentos/upload | Upload de documento (CNH, CNPJ...) |
| POST | /api/webhooks/stripe | Webhook de pagamento Stripe |
| GET | /health | Health check |

## Autenticação

Inclua o token JWT no header de toda requisição protegida:
```
Authorization: Bearer <token>
```

Para gerar tokens, implemente `POST /api/auth/login` que receba email/senha,
valide no banco e retorne `jwt.sign({ userId, role }, process.env.JWT_SECRET)`.
# FoodExpress

## Acesso administrativo

A área do dono da plataforma fica em `/admin`. O login direto fica em
`/admin/login`.

Configure a conta principal no backend:

```env
ADMIN_NAME=Administrador FoodExpress
ADMIN_EMAIL=admin@seudominio.com
ADMIN_PASSWORD=UmaSenhaForte@123
```

Ao iniciar, o backend cria ou atualiza esse operador sem disponibilizar cadastro
público de administradores.
