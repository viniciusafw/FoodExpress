# FoodExpress — Checklist de apresentação

## Como rodar

```bash
npm install
npm --prefix frontend install
npm --prefix backend install
npm --prefix backend run migrate
npm run seed
npm run dev
```

Sem `backend/.env`, o projeto usa um banco local em `database/foodexpress-local.db`. Com Turso configurado, usa o banco Turso normalmente.

## Fluxos verificados

- Cliente lista restaurantes ativos/fechados.
- Cliente vê cardápio, adiciona item e finaliza pedido.
- Pedido aparece no painel do gerente somente da própria loja.
- Gerente gerencia cardápio da própria loja.
- Gerente abre/fecha loja nas configurações.
- Configurações salvam dados da loja, horários, pagamentos, latitude e longitude.
- Relatórios REL001 a REL012 funcionam e ficam filtrados pela loja do gerente.
- Entregador fica online, vê pedidos disponíveis e aceita entrega.
- Avaliações, clientes, entregadores, rotas e pedidos têm dados no seed.

## Dados demo criados pelo seed

- 8 restaurantes.
- 24 itens de cardápio.
- 10 clientes.
- 6 entregadores.
- 112+ pedidos de exemplo.
- Rotas e avaliações para alimentar relatórios.
