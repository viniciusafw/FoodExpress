'use client'

import Link from 'next/link'

export default function OperadorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-orange-600">🍕 FoodExpress</Link>
          <div className="text-right">
            <p className="font-semibold">Carlos</p>
            <p className="text-sm text-gray-600">Operador</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">⚙️ Painel do Operador</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded border">
            <p className="text-gray-600 text-sm">Total Pedidos</p>
            <p className="text-3xl font-bold text-blue-600">248</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-gray-600 text-sm">Faturamento</p>
            <p className="text-3xl font-bold text-green-600">R$ 8.5k</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-gray-600 text-sm">Restaurantes</p>
            <p className="text-3xl font-bold text-purple-600">34</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-gray-600 text-sm">Entregadores</p>
            <p className="text-3xl font-bold text-orange-600">127</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded border">
          <h3 className="text-xl font-bold mb-4">Restaurantes Aguardando Aprovação</h3>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="flex justify-between items-center p-4 border bg-yellow-50">
                <div>
                  <p className="font-semibold">Restaurante #{1000 + i}</p>
                  <p className="text-sm text-gray-600">Cadastrado em: 22/03/2026</p>
                </div>
                <div className="flex gap-2">
                  <button className="bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700">
                    Aprovar
                  </button>
                  <button className="bg-red-600 text-white px-4 py-1 rounded text-sm hover:bg-red-700">
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
