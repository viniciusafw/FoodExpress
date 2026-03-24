'use client'

import Link from 'next/link'

export default function RestaurantePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-orange-600">🍕 FoodExpress</Link>
          <div className="text-right">
            <p className="font-semibold">Pizzaria do João</p>
            <p className="text-sm text-gray-600">Gerenciador</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">🍽️ Painel do Restaurante</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded border">
            <p className="text-gray-600 text-sm">Pedidos Hoje</p>
            <p className="text-3xl font-bold text-orange-600">12</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-gray-600 text-sm">Faturamento</p>
            <p className="text-3xl font-bold text-green-600">R$ 892.50</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-gray-600 text-sm">Avaliação</p>
            <p className="text-3xl font-bold text-yellow-600">4.8 ⭐</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded border">
          <h3 className="text-xl font-bold mb-4">Pedidos Recentes</h3>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex justify-between items-center p-3 border-b">
                <div>
                  <p className="font-semibold">Pedido #{1000 + i}</p>
                  <p className="text-sm text-gray-600">Cliente: João Silva</p>
                </div>
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  i === 1 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                }`}>
                  {i === 1 ? 'Preparando' : 'Entregue'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
