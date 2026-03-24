'use client'

import { useEffect, useState, useCallback } from 'react'
import io, { Socket } from 'socket.io-client'

interface NotificacaoProps {
  tipo: 'pedido' | 'entrega' | 'restaurante' | 'sistema'
  titulo: string
  mensagem: string
  acoes?: {
    label: string
    onClick: () => void
  }[]
}

export function usePushNotificacoes(usuarioId: string | undefined) {
  const [notificacoes, setNotificacoes] = useState<NotificacaoProps[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    if (!usuarioId) return

    // Conectar ao servidor WebSocket
    const novoSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      auth: {
        usuarioId
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    // Ouvir notificações
    novoSocket.on('notificacao', (data: NotificacaoProps) => {
      setNotificacoes(prev => [...prev, data])
      
      // Remover notificação após 5 segundos
      setTimeout(() => {
        setNotificacoes(prev => prev.slice(1))
      }, 5000)

      // Mostrar notificação do browser se permitido
      if (Notification.permission === 'granted') {
        new Notification(data.titulo, {
          body: data.mensagem,
          icon: '/logo.png'
        })
      }
    })

    // Ouvir atualizações de pedidos
    novoSocket.on('pedido:atualizado', (pedido) => {
      setNotificacoes(prev => [...prev, {
        tipo: 'pedido',
        titulo: `Pedido ${pedido.id} atualizado`,
        mensagem: `Status: ${pedido.status}`
      }])
    })

    // Ouvir atualizações de entrega
    novoSocket.on('entrega:localizado', (dados) => {
      setNotificacoes(prev => [...prev, {
        tipo: 'entrega',
        titulo: 'Entregador se aproximando',
        mensagem: `Distância: ${dados.distancia}km`
      }])
    })

    setSocket(novoSocket)

    return () => {
      novoSocket.disconnect()
    }
  }, [usuarioId])

  // Solicitar permissão de notificações
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  const enviarNotificacao = useCallback((notif: NotificacaoProps) => {
    if (socket) {
      socket.emit('notificacao:pessoal', notif)
    }
  }, [socket])

  return { notificacoes, socket, enviarNotificacao }
}

// Componente de exibição de notificações
export function NotificacoesContainer({ notificacoes }: { notificacoes: NotificacaoProps[] }) {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {notificacoes.map((notif, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-lg shadow-lg text-white max-w-sm animate-slide-in ${
            notif.tipo === 'pedido' ? 'bg-blue-500' :
            notif.tipo === 'entrega' ? 'bg-green-500' :
            notif.tipo === 'restaurante' ? 'bg-orange-500' :
            'bg-gray-500'
          }`}
        >
          <h4 className="font-bold">{notif.titulo}</h4>
          <p className="text-sm">{notif.mensagem}</p>
          {notif.acoes && (
            <div className="flex gap-2 mt-2">
              {notif.acoes.map((acao, i) => (
                <button
                  key={i}
                  onClick={acao.onClick}
                  className="text-xs bg-white text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
                >
                  {acao.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Hook para atualizar posição GPS em tempo real
export function useGPSRastreamento(pedidoId: string | undefined, entregadorId: string | undefined) {
  const [localizacao, setLocalizacao] = useState<{ lat: number; lng: number } | null>(null)
  const [socket] = usePushNotificacoes(pedidoId)

  useEffect(() => {
    if (!pedidoId || !entregadorId) return

    // Obter posição GPS
    const obterLocalizacao = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            setLocalizacao({ lat: latitude, lng: longitude })

            // Emitir localização via WebSocket
            socket?.emit('entregador:localizacao', {
              pedido_id: pedidoId,
              entregador_id: entregadorId,
              latitude,
              longitude,
              timestamp: new Date()
            })
          },
          (error) => {
            console.error('Erro ao obter localização:', error)
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
          }
        )
      }
    }

    obterLocalizacao()
  }, [pedidoId, entregadorId, socket])

  return localizacao
}
