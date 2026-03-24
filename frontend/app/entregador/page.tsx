'use client'

import Link from 'next/link'

export default function EntregadorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-orange-600">🍕 FoodExpress</Link>
          <div className="text-right">
            <p className="font-semibold">Maria Silva</p>
            <p className="text-sm text-gray-600">Entregador</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">🚗 Painel do Entregador</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-xl font-bold mb-4">Status Atual</h3>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="font-semibold">Disponível</span>
            </div>
            <button className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700">
              Ficar Indisponível
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-xl font-bold mb-4">📍 Localização</h3>
            <p className="text-gray-600 mb-4">-23.5505, -46.6333</p>
            <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
              Atualizar Localização
            </button>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Pedidos Atribuídos</h3>
          <div className="bg-white p-6 rounded-lg border">
            <p className="text-gray-600 text-center py-8">Nenhum pedido no momento</p>
          </div>
        </div>
      </main>
    </div>
  )
}
