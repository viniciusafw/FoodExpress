// frontend/lib/socket.ts
import { io } from 'socket.io-client'

export const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
  autoConnect: false
})

// Função para atualizar localização do entregador
export async function updateEntregadorLocation(entregadorId: string, lat: number, lng: number) {
  await fetch('/api/entregadores/localizacao', {
    method: 'POST',
    body: JSON.stringify({ entregadorId, lat, lng })
  })
  
  // Emitir via WebSocket
  socket.emit('entregador:location', { entregadorId, lat, lng })
}

// Componente de rastreamento
export function RastreamentoPedido({ pedidoId }: { pedidoId: string }) {
  useEffect(() => {
    socket.connect()
    
    socket.on(`pedido:${pedidoId}:location`, (data) => {
      // Atualizar mapa com nova localização
      updateMap(data.lat, data.lng)
    })

    return () => {
      socket.off(`pedido:${pedidoId}:location`)
      socket.disconnect()
    }
  }, [pedidoId])

  return (
    <div id="map" className="h-96 w-full">
      {/* Mapa com Leaflet/Mapbox */}
    </div>
  )
}