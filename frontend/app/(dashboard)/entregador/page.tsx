'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

interface Pedido {
  id: number
  cliente_id: number
  restaurante_id: number
  status: string
  total: number
  endereco_entrega: string
  latitude: number
  longitude: number
  created_at: string
}

export default function EntregadorDashboard() {
  const { user, isLoaded } = useUser()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [statusAtual, setStatusAtual] = useState<'disponivel' | 'ocupado'>('disponivel')
  const [carregando, setCarregando] = useState(true)
  const [localizacao, setLocalizacao] = useState<{ latitude: number; longitude: number } | null>(null)

  useEffect(() => {
    if (isLoaded && user) {
      carregarDados()
      iniciarRastreamento()
    }
  }, [isLoaded, user])

  const carregarDados = async () => {
    try {
      setCarregando(true)
      // Buscar pedidos atribuídos a este entregador
      const resPedidos = await fetch(`/api/pedidos?entregadorId=${user?.id}`)
      if (resPedidos.ok) {
        const dados = await resPedidos.json()
        setPedidos(dados.filter((p: Pedido) => p.status !== 'entregue'))
      }
    } catch (erro) {
      console.error('Erro ao carregar pedidos:', erro)
    } finally {
      setCarregando(false)
    }
  }

  const iniciarRastreamento = () => {
    // Solicitar permissão de geolocalização
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setLocalizacao({ latitude, longitude })

          // Atualizar localização no servidor
          fetch(`/api/entregadores/${user?.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude, status: statusAtual })
          }).catch(erro => console.error('Erro ao atualizar localização:', erro))
        },
        (erro) => console.error('Erro ao obter localização:', erro),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    }
  }

  const aceitarPedido = async (pedidoId: number) => {
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/atribuir-entregador`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entregadorId: user?.id,
          latitude: localizacao?.latitude || 0,
          longitude: localizacao?.longitude || 0
        })
      })

      if (res.ok) {
        setStatusAtual('ocupado')
        carregarDados()
      }
    } catch (erro) {
      console.error('Erro ao aceitar pedido:', erro)
    }
  }

  const confirmarEntrega = async (pedidoId: number) => {
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'entregue' })
      })

      if (res.ok) {
        carregarDados()
        setStatusAtual('disponivel')
      }
    } catch (erro) {
      console.error('Erro ao confirmar entrega:', erro)
    }
  }

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
          <h1 className="text-2xl font-bold text-orange-600">🚗 FoodExpress Entrega</h1>
          <div className="flex gap-4 items-center">
            <div className="text-right">
              <p className="font-semibold">{user.firstName}</p>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${statusAtual === 'disponivel' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium capitalize">{statusAtual}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Localização */}
      {localizacao && (
        <div className="bg-blue-50 border-b border-blue-200 max-w-6xl mx-auto">
          <div className="px-4 py-3 text-center text-sm text-blue-800">
            📍 Localização: {localizacao.latitude.toFixed(4)}, {localizacao.longitude.toFixed(4)}
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">
          {pedidos.filter(p => p.status === 'entregando').length > 0
            ? 'Entrega em Andamento'
            : 'Pedidos Disponíveis'}
        </h2>

        {carregando ? (
          <div className="text-center py-12">Carregando...</div>
        ) : pedidos.length === 0 ? (
          <div className="bg-white p-12 rounded-lg text-center border">
            <p className="text-gray-600 mb-4">Nenhum pedido para você no momento</p>
            <p className="text-sm text-gray-500">Fique pronto para receber novas solicitações</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidos.map(pedido => (
              <div key={pedido.id} className="bg-white p-6 rounded-lg border hover:shadow-lg transition-shadow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Pedido #{pedido.id}</p>
                    <p className="text-lg font-semibold text-orange-600">R$ {pedido.total.toFixed(2)}</p>
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                      pedido.status === 'entregando' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {pedido.status === 'entregando' ? '📍 Em entrega' : '⏳ Aguardando'}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Endereço de Entrega</p>
                    <p className="font-semibold text-gray-800">{pedido.endereco_entrega}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      📍 {pedido.latitude.toFixed(4)}, {pedido.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-3">Tempo do pedido: {
                    Math.round((Date.now() - new Date(pedido.created_at).getTime()) / 1000 / 60)
                  } min</p>

                  {pedido.status === 'preparando' ? (
                    <button
                      onClick={() => aceitarPedido(pedido.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded transition-colors"
                    >
                      ✅ Aceitar e Buscar Pedido
                    </button>
                  ) : pedido.status === 'entregando' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmarEntrega(pedido.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded transition-colors"
                      >
                        ✓ Confirmar Entrega
                      </button>
                      <a
                        href={`https://maps.google.com/?q=${pedido.latitude},${pedido.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded transition-colors text-center"
                      >
                        🗺️ Google Maps
                      </a>
                    </div>
                  ) : (
                    <button
                      onClick={() => aceitarPedido(pedido.id)}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 rounded transition-colors"
                    >
                      📍 Ver Detalhes
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
