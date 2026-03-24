'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Pedido {
  id: number
  status: string
  total: number
  subtotal: number
  taxa_entrega: number
  endereco_entrega: string
  created_at: string
  restaurante_id: number
  entregador_id?: number
  itens?: string
}

interface Avaliacao {
  estrelas: number
  comentario: string
}

export default function DetalhesPedidoPage({ params }: { params: { id: string } }) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [avaliacao, setAvaliacao] = useState<Avaliacao>({ estrelas: 5, comentario: '' })
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false)

  useEffect(() => {
    carregarPedido()
  }, [])

  const carregarPedido = async () => {
    try {
      setCarregando(true)
      // Simular dados
      setPedido({
        id: parseInt(params.id),
        status: 'entregue',
        total: 52.90,
        subtotal: 45.90,
        taxa_entrega: 7.00,
        endereco_entrega: 'Rua das Flores, 123 - São Paulo',
        created_at: new Date().toISOString(),
        restaurante_id: 1,
        entregador_id: 1,
        itens: JSON.stringify([
          { nome: 'Pizza Grande', preco: 35.90, quantidade: 1 },
          { nome: 'Refrigerante 2L', preco: 10.00, quantidade: 1 }
        ])
      })
      setCarregando(false)
    } catch (erro) {
      console.error('Erro:', erro)
      setCarregando(false)
    }
  }

  const enviarAvaliacao = async () => {
    try {
      const res = await fetch('/api/avaliacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId: pedido?.id,
          restauranteId: pedido?.restaurante_id,
          entregadorId: pedido?.entregador_id,
          ...avaliacao,
          tipo: 'restaurante'
        })
      })

      if (res.ok) {
        setAvaliacaoEnviada(true)
      } else {
        alert('Erro ao enviar avaliação')
      }
    } catch (erro) {
      console.error('Erro:', erro)
    }
  }

  if (carregando) {
    return <div className="p-4 text-center">Carregando...</div>
  }

  if (!pedido) {
    return <div className="p-4 text-center">Pedido não encontrado</div>
  }

  const status_timeline = [
    { label: 'Pedido Recebido', icon: '📱', step: 'pendente' },
    { label: 'Confirmado', icon: '✓', step: 'confirmado' },
    { label: 'Preparando', icon: '👨‍🍳', step: 'preparando' },
    { label: 'Entregando', icon: '🚗', step: 'entregando' },
    { label: 'Entregue', icon: '✅', step: 'entregue' }
  ]

  const steps_order = ['pendente', 'confirmado', 'preparando', 'entregando', 'entregue']
  const current_index = steps_order.indexOf(pedido.status)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/cliente" className="text-orange-600 hover:text-orange-700 text-sm font-medium">
            ← Voltar para Pedidos
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 mt-2">Pedido #{pedido.id}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Timeline */}
        <div className="bg-white rounded-lg border p-8 mb-8">
          <h2 className="text-2xl font-bold mb-8">Andamento do Pedido</h2>
          <div className="space-y-6">
            {status_timeline.map((item, idx) => (
              <div key={item.step} className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    idx <= current_index
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {item.icon}
                </div>
                <div className="flex-1 pt-2">
                  <p
                    className={`font-semibold text-lg ${
                      idx <= current_index ? 'text-gray-800' : 'text-gray-400'
                    }`}
                  >
                    {item.label}
                  </p>
                  {idx === current_index && (
                    <p className="text-sm text-orange-600 mt-1">Em progresso...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detalhes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Endereço */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-xl font-bold mb-4">📍 Endereço de Entrega</h3>
            <p className="text-gray-800 font-semibold mb-2">{pedido.endereco_entrega}</p>
            <p className="text-sm text-gray-600">
              Horário: {new Date(pedido.created_at).toLocaleTimeString('pt-BR')}
            </p>
          </div>

          {/* Resumo Financeiro */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-xl font-bold mb-4">💰 Resumo do Pedido</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <p>Subtotal:</p>
                <p className="font-semibold">R$ {pedido.subtotal.toFixed(2)}</p>
              </div>
              <div className="flex justify-between">
                <p>Taxa de Entrega:</p>
                <p className="font-semibold">R$ {pedido.taxa_entrega.toFixed(2)}</p>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg">
                <p className="font-bold">Total:</p>
                <p className="font-bold text-orange-600">R$ {pedido.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Itens */}
        {pedido.itens && (
          <div className="bg-white rounded-lg border p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">📋 Itens do Pedido</h3>
            <div className="space-y-3">
              {JSON.parse(pedido.itens).map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-3 border-b pb-3">
                  <div>
                    <p className="font-semibold">{item.nome}</p>
                    <p className="text-sm text-gray-600">Qtd: {item.quantidade}</p>
                  </div>
                  <p className="font-bold">R$ {(item.preco * item.quantidade).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avaliação */}
        {pedido.status === 'entregue' && !avaliacaoEnviada && (
          <div className="bg-white rounded-lg border p-8">
            <h3 className="text-2xl font-bold mb-6">⭐ Avaliar Pedido</h3>

            <div className="mb-6">
              <label className="block text-lg font-semibold mb-3">Sua Avaliação</label>
              <div className="flex gap-3 mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setAvaliacao({ ...avaliacao, estrelas: star })}
                    className={`text-5xl transition-transform hover:scale-110 ${
                      star <= avaliacao.estrelas ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="text-gray-600">{avaliacao.estrelas} de 5 estrelas</p>
            </div>

            <div className="mb-6">
              <label className="block text-lg font-semibold mb-3">Comentário (Opcional)</label>
              <textarea
                value={avaliacao.comentario}
                onChange={(e) => setAvaliacao({ ...avaliacao, comentario: e.target.value })}
                placeholder="Compartilhe sua experiência..."
                className="w-full border rounded px-4 py-3 h-32 resize-none"
              />
            </div>

            <button
              onClick={enviarAvaliacao}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded transition-colors"
            >
              Enviar Avaliação
            </button>
          </div>
        )}

        {avaliacaoEnviada && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <p className="text-2xl font-bold text-green-800 mb-2">✅ Obrigado!</p>
            <p className="text-green-700">Sua avaliação foi registrada com sucesso</p>
          </div>
        )}

        {pedido.status !== 'entregue' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-blue-800">Você poderá avaliar este pedido após a entrega</p>
          </div>
        )}
      </main>
    </div>
  )
}
