# 📋 Implementação de Regras de Negócio - FoodExpress v2.0

## Status das Regras de Negócio (RN)

### ✅ RN001 - Acesso do Gerente
**Status:** IMPLEMENTADO
**Descrição:** O usuário logado como gerente terá acesso a todas as funcionalidades do sistema.

**Implementação:**
- Autenticação via Clerk.dev
- Role-based access control (RBAC) verificado nas rotas
- Dashboard gerente em `/app/gerente/page.tsx`
- Middleware de autenticação em `/middleware.ts`
- Verificação de perfil em componentes

**Arquivos:**
- `/frontend/middleware.ts` - Verificação de autenticação
- `/frontend/app/gerente/page.tsx` - Dashboard gerente

---

### ⚠️ RN002 - Redirecionamento Automático de Pedidos
**Status:** PARCIALMENTE IMPLEMENTADO
**Descrição:** Pedidos não atendidos em 5 minutos são redirecionados automaticamente.

**Implementação Necessária:**
- [ ] Implementar sistema de fila com timeout de 5 minutos
- [ ] Job automático para reatribuir pedidos
- [ ] Notificação ao operador
- [ ] Log de reatribuição

**Sugestão de Implementação:**
```typescript
// Verificar pedidos com timestamp > 5 minutos e status 'pendente'
// Redirecionar para próximo entregador disponível
// Registrar em histórico de atribuições
```

**Prioridade:** ALTA

---

### ✅ RN003 - Taxa de Entrega por Distância
**Status:** IMPLEMENTADO
**Descrição:** Taxa de entrega calculada por distância: até 3km (R$5), 3-5km (R$8), 5-8km (R$12).

**Implementação:**
```typescript
let taxa_entrega = 5
if (distancia > 5) taxa_entrega = 12
else if (distancia > 3) taxa_entrega = 8
```

**Arquivos:**
- `/frontend/app/api/pedidos/route.ts` (linhas 120-125)
- Função `calculateDistance()` usa Haversine

**Teste:** ✅ Verificado nas rotas POST /api/pedidos

---

### ⚠️ RN004 - Comissão de 15% e Repasse D+7
**Status:** PARCIALMENTE IMPLEMENTADO
**Descrição:** Comissão de 15% sobre pedidos para plataforma, repasse em D+7.

**Implementação Necessária:**
- [ ] Cálculo de comissão (15%) nos pedidos confirmados
- [ ] Tabela de finanças/comissões
- [ ] Job scheduler automático (cron) para D+7
- [ ] Status de repasse (pendente, processando, pago)
- [ ] Extrato financeiro por restaurante

**Relatório Associado:** REL007 (Financeiro - comissões)

**Prioridade:** ALTA

---

### ⚠️ RN005 - Remuneração de Entregadores
**Status:** PARCIALMENTE IMPLEMENTADO
**Descrição:** Entregadores recebem por km rodado + gorjeta.

**Implementação Necessária:**
- [ ] Tabela de preço por km (ex: R$2/km)
- [ ] Cálculo automático de ganho na rota
- [ ] Integração com sistema de gorjeta
- [ ] Extrato de ganhos do entregador
- [ ] Dashboard financeiro entregador

**Arquivos Relacionados:**
- `/frontend/app/entregador/page.tsx` - Dashboard entregador

**Prioridade:** ALTA

---

### ⚠️ RN006 - Multa por Cancelamento após 5 minutos
**Status:** NÃO IMPLEMENTADO
**Descrição:** Cancelamento após 5 minutos gera multa de 50% do valor.

**Implementação Necessária:**
- [ ] Timestamp de aceitação do pedido
- [ ] Verificação de 5 minutos para cancelamentos
- [ ] Cálculo de multa (50%)
- [ ] Retenção de valor no pagamento
- [ ] Notificação ao cliente sobre multa

**Fluxo:**
1. Cliente tenta cancelar pedido após 5 min
2. Sistema calcula 50% de retenção
3. Processa reembolso de 50%
4. Registra multa em histórico

**Prioridade:** MÉDIA

---

## Resumo de Implementação

| ID | Regra | Status | Prioridade |
|----|-------|--------|-----------|
| RN001 | Acesso Gerente | ✅ Pronto | - |
| RN002 | Auto-redirecionamento 5min | ⚠️ Parcial | 🔴 ALTA |
| RN003 | Taxa por Distância | ✅ Pronto | - |
| RN004 | Comissão 15% D+7 | ⚠️ Parcial | 🔴 ALTA |
| RN005 | Remuneração Entregador | ⚠️ Parcial | 🔴 ALTA |
| RN006 | Multa Cancelamento | ❌ Não | 🟡 MÉDIA |

---

## Próximas Ações

1. **URGENTE:** Implementar RN002 (auto-redirecionamento)
2. **URGENTE:** Implementar RN004 (comissões e repasses)
3. **URGENTE:** Implementar RN005 (remuneração entregadors)
4. **Importante:** Implementar RN006 (multa cancelamento)

---

*Data: 04/02/2026 | Versão: 2.0*
