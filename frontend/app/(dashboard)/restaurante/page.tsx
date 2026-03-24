'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

interface Pedido {
  id: number
  cliente_id: number
  status: string
  itens: string
  created_at: string
}

interface CardapioItem {
  id: number
  nome: string
  preco: number
  categoria: string
  disponivel: number
}

export default function RestauranteDashboard() {
  const { user, isLoaded } = useUser()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cardapio, setCardapio] = useState<CardapioItem[]>([])
  const [abaSelecionada, setAbaSelecionada] = useState<'pedidos' | 'cardapio'>('pedidos')
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [novoItem, setNovoItem] = useState({
    nome: '',
    preco: '',
    categoria: 'principal'
  })

  useEffect(() => {
    if (isLoaded && user) {
      carregarDados()
    }
  }, [isLoaded, user])

  const carregarDados = async () => {
    try {
      setCarregando(true)

      // Buscar pedidos do restaurante
      // Nota: Isto é um exemplo simplificado, idealmente você teria restaurante_id do usuário
      const resPedidos = await fetch('/api/pedidos?limite=100')
      if (resPedidos.ok) {
        const dados = await resPedidos.json()
        setPedidos(dados)
      }

      // Buscar cardápio
      const resCard = await fetch('/api/cardapio')
      if (resCard.ok) {
        const dados = await resCard.json()
        setCardapio(dados)
      }
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro)
    } finally {
      setCarregando(false)
    }
  }

  const adicionarItem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/cardapio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restauranteId: 1, // Deveria ser o ID real do restaurante do usuário
          ...novoItem,
          preco: parseFloat(novoItem.preco)
        })
      })

      if (res.ok) {
        setNovoItem({ nome: '', preco: '', categoria: 'principal' })
        carregarDados()
      }
    } catch (erro) {
      console.error('Erro ao adicionar item:', erro)
    }
  }

  const alterarStatusPedido = async (pedidoId: number, novoStatus: string) => {
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      })

      if (res.ok) {
        carregarDados()
      }
    } catch (erro) {
      console.error('Erro ao atualizar status:', erro)
    }
  }

  const pedidosFiltrados = filtroStatus
    ? pedidos.filter(p => p.status === filtroStatus)
    : pedidos

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
          <h1 className="text-2xl font-bold text-orange-600">🍽️ Painel do Restaurante</h1>
          <div className="text-right">
            <p className="font-semibold">{user.firstName}</p>
            <p className="text-sm text-gray-600">Gerenciador</p>
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
            Pedidos ({pedidos.length})
          </button>
          <button
            onClick={() => setAbaSelecionada('cardapio')}
            className={`py-4 px-4 border-b-2 font-medium transition-colors ${
              abaSelecionada === 'cardapio'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600 hover:text-orange-600'
            }`}
          >
            Cardápio ({cardapio.length})
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {carregando ? (
          <div className="text-center py-12">Carregando...</div>
        ) : abaSelecionada === 'pedidos' ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Gerenciamento de Pedidos</h2>

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
                <p className="text-gray-600">Nenhum pedido encontrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pedidosFiltrados.map(pedido => (
                  <div key={pedido.id} className="bg-white p-6 rounded-lg border hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Pedido #{pedido.id}</p>
                        <p className="text-lg font-semibold text-gray-800">Cliente ID: {pedido.cliente_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-2">Status Atual</p>
                        <select
                          value={pedido.status}
                          onChange={(e) => alterarStatusPedido(pedido.id, e.target.value)}
                          className={`px-3 py-1 rounded font-medium border cursor-pointer ${
                            pedido.status === 'pendente' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
                            pedido.status === 'confirmado' ? 'bg-blue-50 border-blue-300 text-blue-800' :
                            pedido.status === 'preparando' ? 'bg-orange-50 border-orange-300 text-orange-800' :
                            pedido.status === 'entregando' ? 'bg-purple-50 border-purple-300 text-purple-800' :
                            'bg-green-50 border-green-300 text-green-800'
                          }`}
                        >
                          <option value="pendente">⏳ Pendente</option>
                          <option value="confirmado">✓ Confirmado</option>
                          <option value="preparando">👨‍🍳 Preparando</option>
                          <option value="entregando">🚗 Entregando</option>
                          <option value="entregue">✅ Entregue</option>
                        </select>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600">
                      {new Date(pedido.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-6">Gerenciamento de Cardápio</h2>

            {/* Formulário para Adicionar Item */}
            <form onSubmit={adicionarItem} className="bg-white p-6 rounded-lg border mb-8">
              <h3 className="font-semibold text-lg mb-4">Adicionar Novo Item</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Nome do item"
                  value={novoItem.nome}
                  onChange={(e) => setNovoItem({ ...novoItem, nome: e.target.value })}
                  className="border rounded px-3 py-2"
                  required
                />
                <input
                  type="number"
                  placeholder="Preço"
                  step="0.01"
                  value={novoItem.preco}
                  onChange={(e) => setNovoItem({ ...novoItem, preco: e.target.value })}
                  className="border rounded px-3 py-2"
                  required
                />
                <select
                  value={novoItem.categoria}
                  onChange={(e) => setNovoItem({ ...novoItem, categoria: e.target.value })}
                  className="border rounded px-3 py-2"
                >
                  <option value="principal">Prato Principal</option>
                  <option value="bebida">Bebida</option>
                  <option value="sobremesa">Sobremesa</option>
                  <option value="entrada">Entrada</option>
                </select>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 rounded transition-colors"
                >
                  + Adicionar
                </button>
              </div>
            </form>

            {/* Lista de Itens */}
            {cardapio.length === 0 ? (
              <div className="text-center py-12 bg-gray-100 rounded">
                <p className="text-gray-600">Nenhum item no cardápio ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cardapio.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-lg border hover:shadow transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-800">{item.nome}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.disponivel ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.disponivel ? 'Disponível' : 'Indisponível'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Categoria: {item.categoria}</p>
                    <p className="text-lg font-bold text-orange-600">R$ {item.preco.toFixed(2)}</p>
                    <div className="mt-4 flex gap-2">
                      <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 rounded transition-colors">
                        ✏️ Editar
                      </button>
                      <button className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-1 rounded transition-colors">
                        🗑️ Remover
                      </button>
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
