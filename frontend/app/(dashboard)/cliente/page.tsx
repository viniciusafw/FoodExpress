'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Pedido {
  id: number
  restaurante_id: number
  status: string
  total: number
  created_at: string
  entregador_id?: number
}

interface Restaurante {
  id: number
  nome: string
  categoria: string
  avaliacao_media: number
}

export default function ClienteDashboard() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([])
  const [abaSelecionada, setAbaSelecionada] = useState<'pedidos' | 'explorar'>('explorar')
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [nomeUsuario] = useState('João Silva')

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setCarregando(true)
      // Simular dados mock
      setPedidos([
        { id: 1, restaurante_id: 1, status: 'entregue', total: 45.90, created_at: new Date().toISOString(), entregador_id: 1 },
        { id: 2, restaurante_id: 2, status: 'preparando', total: 32.50, created_at: new Date().toISOString(), entregador_id: 2 },
      ])
      setRestaurantes([
        { id: 1, nome: 'Pizzaria do João', categoria: 'Pizzas', avaliacao_media: 4.8 },
        { id: 2, nome: 'Burger King', categoria: 'Hamburgers', avaliacao_media: 4.5 },
        { id: 3, nome: 'Sushi Express', categoria: 'Japonesa', avaliacao_media: 4.9 },
        { id: 4, nome: 'Restaurante Árabe', categoria: 'Árabe', avaliacao_media: 4.6 },
      ])
      setCarregando(false)
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro)
      setCarregando(false)
    }
  }

  const obterCor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmado':
        return 'bg-blue-100 text-blue-800'
      case 'preparando':
        return 'bg-orange-100 text-orange-800'
      case 'entregando':
        return 'bg-purple-100 text-purple-800'
      case 'entregue':
        return 'bg-green-100 text-green-800'
      case 'cancelado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const pedidosFiltrados = filtroStatus
    ? pedidos.filter(p => p.status === filtroStatus)
    : pedidos

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-orange-600 hover:text-orange-700">🍕 FoodExpress</Link>
          <div className="text-right">
            <p className="font-semibold">{nomeUsuario}</p>
            <p className="text-sm text-gray-600">Cliente</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b max-w-6xl mx-auto">
        <div className="flex gap-4 px-4">
          <button
            onClick={() => setAbaSelecionada('pedidos')}
            className={`py-4 px-4 border-b-2 font-medium transition-colors ${
              abaSelecionada === 'pedidos'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-orange-600'
            }`}
          >
            Meus Pedidos
          </button>
          <button
            onClick={() => setAbaSelecionada('explorar')}
            className={`py-4 px-4 border-b-2 font-medium transition-colors ${
              abaSelecionada === 'explorar'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-orange-600'
            }`}
          >
            Explorar Restaurantes
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {carregando ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">🍕</div>
            <p className="text-gray-600">Carregando...</p>
          </div>
        ) : abaSelecionada === 'pedidos' ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Meus Pedidos</h2>

            {/* Filtros */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setFiltroStatus('')}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  filtroStatus === ''
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                Todos
              </button>
              {['pendente', 'confirmado', 'preparando', 'entregando', 'entregue'].map(status => (
                <button
                  key={status}
                  onClick={() => setFiltroStatus(status)}
                  className={`px-4 py-2 rounded font-medium transition-colors capitalize ${
                    filtroStatus === status
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Lista de Pedidos */}
            {pedidosFiltrados.length === 0 ? (
              <div className="text-center py-12 bg-gray-100 rounded">
                <p className="text-gray-600 mb-4">Nenhum pedido encontrado</p>
                <button
                  onClick={() => setAbaSelecionada('explorar')}
                  className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700 transition-colors"
                >
                  Fazer um Pedido
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {pedidosFiltrados.map(pedido => (
                  <div key={pedido.id} className="bg-white p-6 rounded-lg border hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Pedido #{pedido.id}</p>
                        <p className="text-lg font-semibold">R$ {pedido.total.toFixed(2)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${obterCor(pedido.status)}`}>
                        {pedido.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {new Date(pedido.created_at).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <div className="flex gap-2">
                      <button className="flex-1 bg-orange-600 text-white py-2 rounded text-center hover:bg-orange-700 transition-colors">
                        Ver Detalhes
                      </button>
                      {pedido.entregador_id && pedido.status !== 'entregue' && (
                        <button className="flex-1 bg-blue-600 text-white py-2 rounded text-center hover:bg-blue-700 transition-colors">
                          Rastrear
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-6">Restaurantes Disponíveis</h2>

            {restaurantes.length === 0 ? (
              <div className="text-center py-12 bg-gray-100 rounded">
                <p className="text-gray-600">Nenhum restaurante disponível no momento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurantes.map(restaurante => (
                  <div
                    key={restaurante.id}
                    className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow border hover:border-orange-300"
                  >
                    <div className="h-40 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                      <span className="text-4xl">🍽️</span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{restaurante.nome}</h3>
                      <p className="text-sm text-gray-600 mb-3">{restaurante.categoria}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">⭐</span>
                          <span className="font-medium">{restaurante.avaliacao_media.toFixed(1)}</span>
                        </div>
                        <button className="bg-orange-600 text-white px-4 py-1 rounded text-sm hover:bg-orange-700 transition-colors">
                          Explorar
                        </button>
                      </div>
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
