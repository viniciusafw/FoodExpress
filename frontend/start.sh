#!/bin/bash

# FoodExpress - Script de Inicio Rápido

echo "🍕 FoodExpress - Iniciando..."
echo ""

# Check se dependencies estão instaladas
if [ ! -d "node_modules" ]; then
  echo "⏳ Instalando dependências..."
  npm install
fi

echo ""
echo "🚀 Iniciando servidor de desenvolvimento..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ FoodExpress rodando em: http://localhost:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Dashboards disponíveis:"
echo "  👤 Cliente:     http://localhost:3000/cliente"
echo "  🚗 Entregador:  http://localhost:3000/entregador"
echo "  🍽️  Restaurante: http://localhost:3000/restaurante"
echo "  ⚙️  Operador:    http://localhost:3000/operador"
echo "  📊 Gerente:     http://localhost:3000/gerente"
echo ""
echo "Pressione Ctrl+C para parar"
echo ""

npm run dev
