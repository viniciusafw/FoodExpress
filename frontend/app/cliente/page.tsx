'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ClientePage() {
  const [nomeUsuario] = useState('João Silva')
  const [abaSelecionada, setAbaSelecionada] = useState<'pedidos' | 'restaurantes'>('restaurantes')
  const [pedidos] = useState([
    { id: 1, status: 'entregue', total: 45.90, restaurante: 'Pizzaria do João', created_at: new Date() },
    { id: 2, status: 'preparando', total: 32.50, restaurante: 'Burger King', created_at: new Date() },
  ])
  const [restaurantes] = useState([
    { id: 1, nome: 'Pizzaria do João', categoria: 'Pizzas', avaliacao_media: 4.8 },
    { id: 2, nome: 'Burger King', categoria: 'Hamburgers', avaliacao_media: 4.5 },
    { id: 3, nome: 'Sushi Express', categoria: 'Japonesa', avaliacao_media: 4.9 },
  ])

  const obterCor = (status: string) => {
    switch (status) {
      case 'entregue': return 'bg-green-100 text-green-800'
      case 'preparando': return 'bg-orange-100 text-orange-800'
      case 'entregando': return 'bg-purple-100 text-purple-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-orange-600">🍕 FoodExpress</Link>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">{nomeUsuario}</p>
              <p className="text-sm text-gray-600">Cliente</p>
            </div>
            <div className="flex gap-2">
              <Link href="/perfil" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium" title="Perfil">
                👤
              </Link>
              <Link href="/suporte" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium" title="Suporte">
                💬
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 flex gap-4">
          <button
            onClick={() => setAbaSelecionada('pedidos')}
            className={`py-4 px-4 border-b-2 font-medium ${
              abaSelecionada === 'pedidos'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600'
            }`}
          >
            Meus Pedidos
          </button>
          <button
            onClick={() => setAbaSelecionada('restaurantes')}
            className={`py-4 px-4 border-b-2 font-medium ${
              abaSelecionada === 'restaurantes'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600'
            }`}
          >
            Restaurantes
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {abaSelecionada === 'pedidos' ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Meus Pedidos</h2>
            <div className="space-y-4">
              {pedidos.map(pedido => (
                <div key={pedido.id} className="bg-white p-6 rounded-lg border hover:shadow-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Pedido #{pedido.id}</p>
                      <p className="font-semibold text-lg">{pedido.restaurante}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${obterCor(pedido.status)}`}>
                      {pedido.status}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-orange-600 mb-4">R$ {pedido.total.toFixed(2)}</p>
                  <Link
                    href={`/cliente/pedidos/${pedido.id}`}
                    className="inline-block bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700 transition-colors"
                  >
                    Ver Detalhes
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-6">Restaurantes Disponíveis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurantes.map(r => (
                <div key={r.id} className="bg-white rounded-lg overflow-hidden hover:shadow-lg border">
                  <div className="h-40 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                    <span className="text-4xl">🍽️</span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{r.nome}</h3>
                    <p className="text-sm text-gray-600 mb-3">{r.categoria}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">⭐</span>
                        <span className="font-medium">{r.avaliacao_media}</span>
                      </div>
                      <button className="bg-orange-600 text-white px-4 py-1 rounded text-sm hover:bg-orange-700">
                        Pedir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
