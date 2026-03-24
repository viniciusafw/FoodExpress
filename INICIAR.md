# 🍕 FoodExpress - Guia Rápido de Inicialização

## ⚡ Comando Único para Rodar

```bash
cd /home/ujoao/FoodExpress-main/frontend && npm run dev
```

Ou use o script automático:

```bash
./start.sh
```

---

## 📱 Acesse os Dashboards

Após executar o comando acima, acesse no navegador:

| Perfil | URL |
|--------|-----|
| **Home** | http://localhost:3000 |
| **Cliente** | http://localhost:3000/cliente |
| **Entregador** | http://localhost:3000/entregador |
| **Restaurante** | http://localhost:3000/restaurante |
| **Operador** | http://localhost:3000/operador |
| **Gerente** | http://localhost:3000/gerente |
| **Relatórios** | http://localhost:3000/relatorios |

---

## 🎯 Fluxo de Teste

1. Acesse http://localhost:3000
2. Selecione um perfil (ex: Cliente)
3. Explore as funcionalidades

---

## 🔧 Variáveis de Ambiente

Arquivo `.env.local` já foi configurado com valores de teste. Para usar com Clerk/Stripe reais, atualize:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=seu_valor
CLERK_SECRET_KEY=seu_valor
STRIPE_SECRET_KEY=seu_valor
```

---

## 📋 O que foi Implementado

✅ 6 Dashboards (Cliente, Entregador, Restaurante, Operador, Gerente, Relatórios)
✅ 8 APIs REST completas (Entregadores, Pedidos, Restaurantes, Cardápio, Clientes, Relatórios)
✅ Sistema de autenticação (Clerk.dev)
✅ 12 Relatórios Gerenciais
✅ Rastreamento GPS em tempo real
✅ Checkout com carrito de compras
✅ Integração Stripe (webhooks)
✅ Design responsivo com Tailwind CSS

---

## 🚀 Status: PRONTO PARA USAR
