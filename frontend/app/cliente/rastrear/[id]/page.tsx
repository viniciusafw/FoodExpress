'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Importar dinamicamente para evitar erro de SSR
const MapComponent = dynamic(
  () => import('@/components/Map'),
  { ssr: false, loading: () => <div className="h-96 bg-gray-200 rounded flex items-center justify-center">Carregando mapa...</div> }
)

interface Rota {
  latitude: number
  longitude: number
  tempo_restante: number
  distancia_km: number
}

interface Pedido {
  id: number
  status: string
  total: number
  restaurante_nome: string
  entregador_nome: string
  endereco_entrega: string
  latitude: number
  longitude: number
}

export default function RastreamentoPage({ params }: { params: { id: string } }) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [rota, setRota] = useState<Rota | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarPedido()
    // Simular atualização a cada 5 segundos
    const intervalo = setInterval(carregarPedido, 5000)
    return () => clearInterval(intervalo)
  }, [])

  const carregarPedido = () => {
    // Dados mockados
    setPedido({
      id: parseInt(params.id),
      status: 'entregando',
      total: 52.90,
      restaurante_nome: 'Pizzaria do João',
      entregador_nome: 'Maria Silva',
      endereco_entrega: 'Rua das Flores, 123',
      latitude: -23.5505,
      longitude: -46.6333
    })

    setRota({
      latitude: -23.5480,
      longitude: -46.6300,
      tempo_restante: 8,
      distancia_km: 2.3
    })

    setCarregando(false)
  }

  if (carregando || !pedido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🍕</div>
          <p className="text-gray-600">Carregando rastreamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/cliente" className="text-orange-600 text-sm hover:text-orange-700">
            ← Voltar
          </Link>
          <h1 className="text-3xl font-bold mt-2">Rastrear Pedido #{pedido.id}</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Mapa */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border overflow-hidden">
              <MapComponent
                pedidoLat={pedido.latitude}
                pedidoLng={pedido.longitude}
                entregadorLat={rota?.latitude || -23.5505}
                entregadorLng={rota?.longitude || -46.6333}
              />
            </div>
          </div>

          {/* Informações */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-bold text-lg mb-4">Status da Entrega</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 rounded-full bg-orange-500 animate-pulse"></div>
                <span className="font-semibold capitalize">{pedido.status}</span>
              </div>
              {rota && (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <p className="text-gray-600">Tempo restante:</p>
                      <p className="font-bold text-orange-600">{rota.tempo_restante} min</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-gray-600">Distância:</p>
                      <p className="font-bold">{rota.distancia_km} km</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Entregador */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-bold text-lg mb-4">🚗 Entregador</h3>
              <p className="text-gray-700 mb-2">{pedido.entregador_nome}</p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">Disponível agora</span>
              </div>
              <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold text-sm">
                💬 Enviar Mensagem
              </button>
            </div>

            {/* Restaurante */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-bold text-lg mb-4">🍽️ Restaurante</h3>
              <p className="text-gray-700 mb-3">{pedido.restaurante_nome}</p>
              <p className="text-sm text-gray-600 mb-2">Seu pedido será entregue em:</p>
              <p className="text-gray-700 font-semibold">{pedido.endereco_entrega}</p>
            </div>

            {/* Contato de Emergência */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="font-bold text-lg text-red-800 mb-3">🆘 Precisa de Ajuda?</h3>
              <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded font-semibold text-sm">
                📞 Ligar para Entregador
              </button>
              <button className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-semibold text-sm">
                🆘 Reportar Problema
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
