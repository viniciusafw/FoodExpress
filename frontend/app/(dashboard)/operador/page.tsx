'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

interface Restaurante {
  id: number
  nome: string
  status: string
  created_at: string
  avaliacao_media: number
}

interface Pedido {
  id: number
  status: string
  total: number
  created_at: string
}

export default function OperadorDashboard() {
  const { user, isLoaded } = useUser()
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [abaSelecionada, setAbaSelecionada] = useState<'restaurantes' | 'pedidos'>('restaurantes')
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<string>('')

  useEffect(() => {
    if (isLoaded && user) {
      carregarDados()
    }
  }, [isLoaded, user])

  const carregarDados = async () => {
    try {
      setCarregando(true)

      // Buscar restaurantes
      const resRest = await fetch('/api/restaurantes?limite=200')
      if (resRest.ok) {
        const dados = await resRest.json()
        setRestaurantes(dados)
      }

      // Buscar todos os pedidos
      const resPedidos = await fetch('/api/pedidos?limite=200')
      if (resPedidos.ok) {
        const dados = await resPedidos.json()
        setPedidos(dados)
      }
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro)
    } finally {
      setCarregando(false)
    }
  }

  const aprovarRestaurante = async (restauranteId: number) => {
    try {
      const res = await fetch(`/api/restaurantes/${restauranteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ativo' })
      })

      if (res.ok) {
        carregarDados()
      }
    } catch (erro) {
      console.error('Erro ao aprovar restaurante:', erro)
    }
  }

  const rejeitarRestaurante = async (restauranteId: number) => {
    try {
      const res = await fetch(`/api/restaurantes/${restauranteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejeitado' })
      })

      if (res.ok) {
        carregarDados()
      }
    } catch (erro) {
      console.error('Erro ao rejeitar restaurante:', erro)
    }
  }

  const restauranteFiltrados = filtroStatus
    ? restaurantes.filter(r => r.status === filtroStatus)
    : restaurantes

  if (!isLoaded) {
    return <div className="p-4 text-center">Carregando...</div>
  }

  if (!user) {
    return <div className="p-4 text-center">Faça login para continuar</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-orange-600">⚙️ Painel do Operador</h1>
          <div className="text-right">
            <p className="font-semibold">{user.firstName}</p>
            <p className="text-sm text-gray-600">Operador</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b max-w-6xl mx-auto">
        <div className="flex gap-4 px-4">
          <button
            onClick={() => setAbaSelecionada('restaurantes')}
            className={`py-4 px-4 border-b-2 font-medium transition-colors ${
              abaSelecionada === 'restaurantes'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-orange-600'
            }`}
          >
            Restaurantes ({restaurantes.length})
          </button>
          <button
            onClick={() => setAbaSelecionada('pedidos')}
            className={`py-4 px-4 border-b-2 font-medium transition-colors ${
              abaSelecionada === 'pedidos'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-orange-600'
            }`}
          >
            Pedidos ({pedidos.length})
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {carregando ? (
          <div className="text-center py-12">Carregando...</div>
        ) : abaSelecionada === 'restaurantes' ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Gerenciamento de Restaurantes</h2>

            {/* Filtros */}
            <div className="mb-6 flex gap-2 flex-wrap">
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
              {['pendente', 'ativo', 'rejeitado', 'inativo'].map(status => (
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

            {/* Lista de Restaurantes */}
            {restauranteFiltrados.length === 0 ? (
              <div className="text-center py-12 bg-gray-100 rounded">
                <p className="text-gray-600">Nenhum restaurante encontrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {restauranteFiltrados.map(restaurante => (
                  <div key={restaurante.id} className="bg-white p-6 rounded-lg border hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">ID: {restaurante.id}</p>
                        <h3 className="text-xl font-semibold text-gray-800">{restaurante.nome}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                            restaurante.status === 'ativo' ? 'bg-green-100 text-green-800' :
                            restaurante.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                            restaurante.status === 'rejeitado' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {restaurante.status}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">⭐</span>
                            <span className="font-medium">{restaurante.avaliacao_media.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 text-right">
                        Cadastrado: {new Date(restaurante.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    {restaurante.status === 'pendente' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => aprovarRestaurante(restaurante.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded transition-colors"
                        >
                          ✅ Aprovar
                        </button>
                        <button
                          onClick={() => rejeitarRestaurante(restaurante.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded transition-colors"
                        >
                          ❌ Rejeitar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-6">Monitoramento de Pedidos</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-gray-600 text-sm mb-2">Total de Pedidos</p>
                <p className="text-3xl font-bold text-orange-600">{pedidos.length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-gray-600 text-sm mb-2">Faturamento Total</p>
                <p className="text-3xl font-bold text-green-600">R$ {pedidos.reduce((a, p) => a + p.total, 0).toFixed(2)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-gray-600 text-sm mb-2">Pedidos Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600">{pedidos.filter(p => p.status === 'pendente').length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-gray-600 text-sm mb-2">Pedidos Entregues</p>
                <p className="text-3xl font-bold text-green-600">{pedidos.filter(p => p.status === 'entregue').length}</p>
              </div>
            </div>

            {/* Lista de Pedidos */}
            <div className="space-y-2">
              {pedidos.slice(0, 20).map(pedido => (
                <div key={pedido.id} className="bg-white p-4 rounded border flex justify-between items-center hover:shadow transition-shadow">
                  <div>
                    <p className="font-semibold">Pedido #{pedido.id}</p>
                    <p className="text-sm text-gray-600">{new Date(pedido.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-orange-600">R$ {pedido.total.toFixed(2)}</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                      pedido.status === 'entregue' ? 'bg-green-100 text-green-800' :
                      pedido.status === 'preparando' ? 'bg-orange-100 text-orange-800' :
                      pedido.status === 'entregando' ? 'bg-purple-100 text-purple-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {pedido.status}
                    </span>
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
