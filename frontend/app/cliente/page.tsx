'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

interface Pedido {
  id: string
  status: string
  total: number
  restaurante_id: string
  created_at: string
}

interface Restaurante {
  id: string
  nome: string
  categoria: string
  avaliacao_media: number
  tempo_medio_preparo: number
}

export default function ClientePage() {
  const { user } = useUser()
  const [abaSelecionada, setAbaSelecionada] = useState<'pedidos' | 'restaurantes'>('restaurantes')
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([])
  const [clienteId, setClienteId] = useState<string>('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Busca dados do cliente
        const resCliente = await fetch('/api/clientes')
        if (resCliente.ok) {
          const cliente = await resCliente.json()
          setClienteId(cliente.id)

          // Busca pedidos do cliente
          const resPedidos = await fetch(`/api/pedidos?clienteId=${cliente.id}`)
          if (resPedidos.ok) {
            const dadosPedidos = await resPedidos.json()
            setPedidos(dadosPedidos)
          }
        }

        // Busca restaurantes disponíveis
        const resRestaurantes = await fetch('/api/restaurantes')
        if (resRestaurantes.ok) {
          const dadosRestaurantes = await resRestaurantes.json()
          setRestaurantes(dadosRestaurantes)
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
        setErro('Erro ao carregar dados. Tente novamente.')
      } finally {
        setCarregando(false)
      }
    }

    carregarDados()
  }, [])

  const obterCor = (status: string) => {
    switch (status) {
      case 'entregue': return 'bg-green-100 text-green-800'
      case 'preparando': return 'bg-orange-100 text-orange-800'
      case 'entregando': return 'bg-purple-100 text-purple-800'
      case 'pendente': return 'bg-blue-100 text-blue-800'
      case 'cancelado': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const obterLabelStatus = (status: string) => {
    const labels: Record<string, string> = {
      pendente: 'Pendente',
      confirmado: 'Confirmado',
      preparando: 'Preparando',
      pronto: 'Pronto',
      entregando: 'A caminho',
      entregue: 'Entregue',
      cancelado: 'Cancelado',
    }
    return labels[status] || status
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🍕</div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-orange-600">🍕 FoodExpress</Link>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-gray-600">Cliente</p>
            </div>
            <div className="flex gap-2">
              <Link href="/perfil" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm" title="Perfil">👤</Link>
              <Link href="/suporte" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm" title="Suporte">💬</Link>
              <Link href="/selecionar-role" className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm" title="Trocar perfil">🔄</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 flex gap-4">
          <button
            onClick={() => setAbaSelecionada('restaurantes')}
            className={`py-4 px-4 border-b-2 font-medium ${
              abaSelecionada === 'restaurantes'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            🍽️ Restaurantes
          </button>
          <button
            onClick={() => setAbaSelecionada('pedidos')}
            className={`py-4 px-4 border-b-2 font-medium ${
              abaSelecionada === 'pedidos'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            📦 Meus Pedidos {pedidos.length > 0 && <span className="ml-1 bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full">{pedidos.length}</span>}
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {erro}
          </div>
        )}

        {abaSelecionada === 'restaurantes' ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Restaurantes Disponíveis</h2>
            {restaurantes.length === 0 ? (
              <div className="bg-white p-12 rounded-lg border text-center">
                <div className="text-4xl mb-4">🍽️</div>
                <p className="text-gray-600">Nenhum restaurante disponível no momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurantes.map((r) => (
                  <div key={r.id} className="bg-white rounded-lg overflow-hidden hover:shadow-lg border transition-shadow">
                    <div className="h-40 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                      <span className="text-4xl">🍽️</span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1">{r.nome}</h3>
                      <p className="text-sm text-gray-600 mb-1">{r.categoria}</p>
                      {r.tempo_medio_preparo && (
                        <p className="text-sm text-gray-500 mb-3">⏱️ {r.tempo_medio_preparo} min</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">⭐</span>
                          <span className="font-medium">{Number(r.avaliacao_media).toFixed(1)}</span>
                        </div>
                        <Link
                          href={`/cliente/restaurante/${r.id}`}
                          className="bg-orange-600 text-white px-4 py-1 rounded text-sm hover:bg-orange-700 transition-colors"
                        >
                          Ver Cardápio
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-6">Meus Pedidos</h2>
            {pedidos.length === 0 ? (
              <div className="bg-white p-12 rounded-lg border text-center">
                <div className="text-4xl mb-4">📦</div>
                <p className="text-gray-600 mb-4">Você ainda não fez nenhum pedido.</p>
                <button
                  onClick={() => setAbaSelecionada('restaurantes')}
                  className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700"
                >
                  Ver Restaurantes
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {pedidos.map((pedido) => (
                  <div key={pedido.id} className="bg-white p-6 rounded-lg border hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm text-gray-500">Pedido #{pedido.id.slice(-6)}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${obterCor(pedido.status)}`}>
                        {obterLabelStatus(pedido.status)}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-orange-600 mb-4">
                      R$ {Number(pedido.total).toFixed(2)}
                    </p>
                    <div className="flex gap-2">
                      <Link
                        href={`/cliente/pedidos/${pedido.id}`}
                        className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700"
                      >
                        Ver Detalhes
                      </Link>
                      {['preparando', 'pronto', 'entregando'].includes(pedido.status) && (
                        <Link
                          href={`/cliente/rastrear/${pedido.id}`}
                          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                        >
                          📍 Rastrear
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}