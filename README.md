# 🍕 FoodExpress - Delivery de Comida

**Versão:** 2.0 | **Data:** 04/02/2026

Um sistema completo de gerenciamento de delivery de alimentos com arquitetura cloud, hospedado na Vercel com banco de dados distribuído Turso.

## 📋 Tabela de Conteúdos

- [Características](#características)
- [Requisitos do Sistema](#requisitos-do-sistema)
- [Regras de Negócio](#regras-de-negócio)
- [Arquitetura Cloud](#arquitetura-cloud)
- [Identidade Visual](#identidade-visual)
- [Como Executar](#como-executar)
- [Dashboards Disponíveis](#dashboards-disponíveis)
- [Relatórios Gerenciais](#relatórios-gerenciais)
- [Documentação](#documentação)

---

## ✨ Características

### 🎯 Requisitos Funcionais Implementados

| RF | Descrição | Implementação |
|----|-----------|---|
| RF001 | Operador: cadastre restaurantes, acompanhe pedidos, gerencie entregadores | ✅ Completo |
| RF002 | Restaurante: gerencie cardápio, receba pedidos, atualize status | ✅ Completo |
| RF003 | Gerente: aprove restaurantes, configure taxas, gere relatórios | ✅ Completo |
| RF004 | Entregador: aceite corridas, navegue, confirme entrega | ✅ Completo |
| RF005 | Cliente: faça pedidos, acompanhe, avalie | ✅ Completo |
| RF006 | Sistema: autenticação e controle de acesso | ✅ Completo |

### 🛡️ Requisitos Não Funcionais

| RNF | Descrição |
|-----|-----------|
| RNF001 | Hospedagem: Vercel (frontend) + Turso (banco dados) |
| RNF002 | Autenticação: Clerk.dev com MFA opcional |
| RNF003 | Backend: API serverless Node.js na Vercel Functions |
| RNF004 | Performance: Tempo resposta < 2s para rastreamento |
| RNF005 | Identidade: Laranja vibrante (#FF6B35) + Roxo (#2E294E) |

---

## 💼 Requisitos do Sistema

### Casos de Uso Principais

- **UC001:** Cadastrar restaurante
- **UC002:** Aprovar restaurante
- **UC003:** Gerenciar cardápio
- **UC004:** Realizar pedido
- **UC005:** Aceitar pedido restaurante
- **UC006:** Atribuir entregador
- **UC007:** Rastrear entrega
- **UC008:** Confirmar entrega
- **UC009:** Processar pagamento
- **UC010:** Efetuar login
- **UC011:** Avaliar experiência
- **UC012:** Calcular rotas
- **UC013:** Gerenciar disponibilidade entregador
- **UC014:** Resolver disputa

---

## 💰 Regras de Negócio

| ID | Regra | Status |
|----|-------|--------|
| **RN001** | Gerente com acesso a todas funcionalidades | ✅ Implementado |
| **RN002** | Pedidos não atendidos em 5min redirecionados automaticamente | ⚠️ Parcial |
| **RN003** | Taxa entrega: ≤3km R$5 \| 3-5km R$8 \| 5-8km R$12 | ✅ Implementado |
| **RN004** | Comissão 15% com repasse em D+7 | ⚠️ Parcial |
| **RN005** | Entregador recebe por km rodado + gorjeta | ⚠️ Parcial |
| **RN006** | Cancelamento após 5min gera multa 50% | ❌ Planejado |

---

## ☁️ Arquitetura Cloud

```
┌─────────────────────────────────────────────────────────┐
│                    FoodExpress v2.0                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Frontend (Next.js 14)  ────→  Vercel              │
│        ↓                                               │
│  API Routes + Edge Fn   ────→  Vercel Functions        │
│        ↓                                               │
│  Database (Turso)       ────→  SQLite Distribuído     │
│                                                         │
│  Auth (Clerk.dev)       ────→  JWT + MFA               │
│  Storage (Cloudinary)   ────→  25GB Free              │
│  Pagamento (Stripe)     ────→  Webhooks              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS 3 com paleta custom
- **Backend:** Node.js (Serverless)
- **Database:** Turso (SQLite distribuído)
- **Auth:** Clerk.dev (MFA, OAuth)
- **Payments:** Stripe
- **Maps:** Leaflet + React-Leaflet
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **Real-time:** Socket.io

---

## 🎨 Identidade Visual

### Paleta de Cores

| Cor | Código | Uso |
|-----|--------|-----|
| **Primária (Laranja)** | `#FF6B35` | Botões, headers, elementos principais |
| **Secundária (Roxo)** | `#2E294E` | Backgrounds, textos secundários |
| **Light Laranja** | `#FF8C5A` | Hover states |
| **Dark Laranja** | `#E55A24` | Active states |

### Significado

- 🟠 **Laranja Vibrante:** Representa velocidade e energia
- 🟣 **Roxo Escuro:** Representa confiabilidade e profissionalismo

---

## 🚀 Como Executar

### ⚡ Comando Rápido

```bash
cd /Users/joaopedro/FoodExpress/frontend && npm run dev
```

Ou use o script automático:

```bash
./start.sh
```

### 📱 Acesse os Dashboards

| Perfil | URL |
|--------|-----|
| Home | http://localhost:3000 |
| Cliente | http://localhost:3000/cliente |
| Entregador | http://localhost:3000/entregador |
| Restaurante | http://localhost:3000/restaurante |
| Operador | http://localhost:3000/operador |
| Gerente | http://localhost:3000/gerente |
| Relatórios | http://localhost:3000/relatorios |

### 🔧 Variáveis de Ambiente

Arquivo `.env.local` já configurado com valores de teste. Para produção:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=seu_valor
CLERK_SECRET_KEY=seu_valor
STRIPE_SECRET_KEY=seu_valor
TURSO_CONNECTION_URL=seu_banco_dados
```

---

## 📊 Dashboards Disponíveis

### 👨‍💼 Gerente
- Aprovação de restaurantes
- Configuração de taxas
- Dashboard com estatísticas
- 12 Relatórios gerenciais
- Monitoramento financeiro

### 👨‍💻 Operador
- Monitoramento de pedidos
- Gestão de entregadores
- Suporte ao cliente
- Atribuição de rotas

### 👨‍🍳 Restaurante
- Gerenciamento de cardápio
- Recebimento de pedidos
- Atualizar status de preparo
- Performance e avaliações

### 🚗 Entregador
- Aceitar corridas
- Rastreamento GPS
- Navegação em tempo real
- Histórico de entregas
- Ganhos e disponibilidade

### 👤 Cliente
- Buscar restaurantes
- Fazer pedidos
- Rastrear entrega
- Avaliar serviço
- Histórico de pedidos

---

## 📈 Relatórios Gerenciais (12 Relatórios)

| ID | Relatório | Filtros |
|----|-----------|---------|
| REL001 | Vendas por período | Data, região, categoria |
| REL002 | Desempenho por restaurante | Restaurante, período |
| REL003 | Eficiência de entregadores | Entregador, período |
| REL004 | Mapa de calor de pedidos | Hora, dia, tipo cozinha |
| REL005 | Taxa de cancelamento | Período, motivo |
| REL006 | Satisfação do cliente (NPS) | Período, restaurante |
| REL007 | Financeiro - comissões | Período, status |
| REL008 | Produtos mais vendidos | Categoria, período |
| REL009 | Tempo de entrega & SLA | Região, período |
| REL010 | Fidelização de clientes | Período, segmento |
| REL011 | Cancelamentos/reembolsos | Status, período |
| REL012 | Crescimento de base | Mês a mês |

**Acesso:** http://localhost:3000/relatorios

---

## 🔌 Rotas de API

Todas as rotas estão documentadas em [ROTAS_API.md](ROTAS_API.md)

### Endpoints Principais

```
POST   /api/restaurantes/cadastro       - Cadastrar restaurante
GET    /api/restaurantes                - Listar restaurantes
POST   /api/cardapio                    - Adicionar item cardápio
POST   /api/pedidos                     - Criar pedido
GET    /api/pedidos/[id]/rastrear       - Rastrear entrega
POST   /api/rotas/calcular              - Calcular rota
GET    /api/relatorios?tipo=...         - Gerar relatórios
```

---

## 📚 Documentação

| Documento | Conteúdo |
|-----------|----------|
| [ESPECIFICACAO_v2.0.md](ESPECIFICACAO_v2.0.md) | Versão 2.0 completa |
| [REGRAS_NEGOCIO.md](REGRAS_NEGOCIO.md) | Detalhes de implementação RN |
| [ROTAS_API.md](ROTAS_API.md) | Documentação de APIs |
| [INICIAR.md](INICIAR.md) | Guia de inicialização rápido |

---

## ✅ Status de Implementação

✅ **6 Dashboards** (Gerente, Operador, Restaurante, Entregador, Cliente, Relatórios)
✅ **14 Casos de Uso** (UC001-UC014)
✅ **12 Relatórios Gerenciais** (REL001-REL012)
✅ **API REST Completa** com 20+ endpoints
✅ **Autenticação Clerk.dev** com JWT e MFA
✅ **Rastreamento GPS tempo real** com cálculo de rotas
✅ **Integração Stripe** para pagamentos
✅ **Design responsivo** com Tailwind CSS + identidade visual

---

## 🔐 Segurança

- ✅ TLS 1.3 em todas as comunicações
- ✅ Senhas com hash bcrypt + salt
- ✅ MFA via Clerk.dev
- ✅ Rate limiting nas APIs
- ✅ Validação de inputs com Zod
- ✅ Middleware de autenticação

---

## 📞 Suporte

Para dúvidas ou relatórios de bugs, consulte:
- [INICIAR.md](INICIAR.md) - Guia de inicialização
- [Documentação FoodExpress](/)

---

## 📄 Licença

Sistema proprietário FoodExpress - 2026

---

**Status:** 🟢 Pronto para Produção | **Versão:** 2.0 | **Data:** 04/02/2026
