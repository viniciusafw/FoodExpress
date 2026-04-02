# 🔌 Rotas de API - FoodExpress v2.0

## Status das APIs Conforme Requisitos Funcionais (RF)

### RF001 - Operador: Cadastro de Restaurantes, Acompanhamento de Pedidos e Gestão de Entregadores

#### ✅ Cadastro de Restaurantes
```
POST   /api/restaurantes/cadastro
GET    /api/restaurantes
GET    /api/restaurantes/[id]
PATCH  /api/restaurantes/[id]
DELETE /api/restaurantes/[id]
```

#### ✅ Acompanhamento de Pedidos
```
GET    /api/pedidos
GET    /api/pedidos/[id]
PATCH  /api/pedidos/[id]              (atualizar status)
GET    /api/pedidos/[id]/rastrear     (rastreamento em tempo real)
```

#### ✅ Gestão de Entregadores
```
GET    /api/entregadores
POST   /api/entregadores/cadastro
GET    /api/entregadores/[id]
PATCH  /api/entregadores/[id]
GET    /api/entregadores/[id]/disponibilidade
POST   /api/entregadores/[id]/disponibilidade
```

**Status:** ✅ COMPLETO

---

### RF002 - Restaurante: Gerenciar Cardápio, Receber Pedidos e Atualizar Status

#### ✅ Gerenciar Cardápio
```
GET    /api/cardapio
POST   /api/cardapio              (criar item)
GET    /api/cardapio/[id]
PATCH  /api/cardapio/[id]         (atualizar item)
DELETE /api/cardapio/[id]
```

#### ✅ Receber Pedidos
```
GET    /api/pedidos?restauranteId=X
POST   /api/pedidos               (cliente cria, restaurante recebe notificação)
```

#### ✅ Atualizar Status
```
PATCH  /api/pedidos/[id]
       { status: 'preparando' | 'pronto' | 'entregue' | 'cancelado' }
```

**Status:** ✅ COMPLETO

---

### RF003 - Gerente: Aprovar Restaurantes, Configurar Taxas e Gerar Relatórios

#### ✅ Aprovar Restaurantes
```
POST   /api/restaurantes/[id]/aprovar
PATCH  /api/restaurantes/[id]    (com status de aprovação)
```

#### ✅ Configurar Taxas
```
PATCH  /api/restaurantes/[id]
       { taxa_comissao: 15, taxa_entrega_padrao: 5 }
```

#### ✅ Gerar Relatórios
```
GET    /api/relatorios?tipo=vendas&inicio=XXX&fim=XXX
GET    /api/relatorios?tipo=desempenho-restaurantes
GET    /api/relatorios?tipo=eficiencia-entregadores
GET    /api/relatorios?tipo=mapa-calor
GET    /api/relatorios?tipo=taxa-cancelamento
GET    /api/relatorios?tipo=satisfacao-cliente
GET    /api/relatorios?tipo=financeiro-comissoes
GET    /api/relatorios?tipo=produtos-top
GET    /api/relatorios?tipo=tempo-entrega
GET    /api/relatorios?tipo=fidelizacao
GET    /api/relatorios?tipo=cancelamentos-reembolsos
GET    /api/relatorios?tipo=crescimento-base
```

**Status:** ✅ COMPLETO (12 relatórios implementados)

---

### RF004 - Entregador: Aceitar Corridas, Navegar e Confirmar Entrega

#### ✅ Aceitar Corridas
```
PATCH  /api/pedidos/[id]
       { status: 'aceito', entregador_id: X }
```

#### ✅ Navegar até Destino
```
GET    /api/rotas/calcular
       { origem_lat, origem_lng, destino_lat, destino_lng }
       → Retorna distância, tempo estimado, pontos da rota
```

#### ✅ Confirmar Entrega
```
PATCH  /api/pedidos/[id]
       { status: 'entregue', data_entrega: XXX }
```

**Status:** ✅ COMPLETO

---

### RF005 - Cliente: Fazer Pedidos, Acompanhar Entrega e Avaliar

#### ✅ Fazer Pedidos
```
POST   /api/pedidos
       { clienteId, restauranteId, itens[], endereco_entrega, latitude, longitude }
```

#### ✅ Acompanhar Entrega
```
GET    /api/pedidos/[id]/rastrear
       → Retorna localização em tempo real, tempo estimado
```

#### ✅ Avaliar
```
POST   /api/avaliacoes
       { pedido_id, restaurante_rating, entregador_rating, comentario }
```

**Status:** ✅ COMPLETO

---

### RF006 - Sistema: Controlar Login e Senha

#### ✅ Login e Autenticação
```
GET    /api/auth/me               (info do usuário autenticado)
POST   /api/auth/logout           (logout)
```

**Implementação:** Clerk.dev com JWT e MFA opcional

**Status:** ✅ COMPLETO

---

## Verbs HTTP e Métodos

| Método | Endpoint | Descrição | RF |
|--------|----------|-----------|-----|
| GET | /api/restaurantes | Listar todos | RF001, RF003 |
| POST | /api/restaurantes/cadastro | Criar restaurante | RF001 |
| GET | /api/restaurantes/[id] | Obter detalhes | RF001 |
| PATCH | /api/restaurantes/[id] | Atualizar | RF001, RF002 |
| POST | /api/restaurantes/[id]/aprovar | Aprovar | RF003 |
| GET | /api/cardapio | Listar itens | RF002 |
| POST | /api/cardapio | Criar item | RF002 |
| PATCH | /api/cardapio/[id] | Atualizar item | RF002 |
| GET | /api/pedidos | Listar pedidos | RF001, RF003 |
| POST | /api/pedidos | Criar pedido | RF005 |
| GET | /api/pedidos/[id] | Obter detalhes | Todos |
| PATCH | /api/pedidos/[id] | Atualizar status | RF002, RF004 |
| GET | /api/pedidos/[id]/rastrear | Rastreamento | RF005 |
| POST | /api/rotas/calcular | Calcular rota | RF004 |
| GET | /api/entregadores | Listar entregadores | RF001 |
| POST | /api/entregadores/cadastro | Cadastrar | RF001 |
| GET | /api/entregadores/[id] | Obter detalhes | RF001 |
| GET | /api/avaliacoes | Listar avaliações | RF005 |
| POST | /api/avaliacoes | Criar avaliação | RF005 |
| GET | /api/relatorios | 12 tipos de relatórios | RF003 |

---

## Autenticação

**Provedor:** Clerk.dev
**Método:** JWT + MFA opcional
**Timeout:** 24 horas
**Middleware:** `/frontend/middleware.ts`

---

## Validações Implementadas

- ✅ Verificação de autenticação em todas as rotas
- ✅ Validação de campos obrigatórios
- ✅ Cálculo de distância com Haversine
- ✅ Taxa de entrega por distância (RN003)
- ✅ Integração Stripe para pagamentos
- ✅ Limites de taxa (Rate Limiting)

---

## Status Geral

**✅ TODAS AS ROTAS IMPLEMENTADAS**

Todos os 6 requisitos funcionais (RF001-RF006) estão cobertos pelas rotas de API.

---

*Data: 04/02/2026 | Versão: 2.0*
