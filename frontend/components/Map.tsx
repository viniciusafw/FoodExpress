'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'

interface MapProps {
  pedidoLat: number
  pedidoLng: number
  entregadorLat: number
  entregadorLng: number
}

export default function MapComponent({ pedidoLat, pedidoLng, entregadorLat, entregadorLng }: MapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Criar mapa
    const map = L.map(mapContainerRef.current).setView(
      [(pedidoLat + entregadorLat) / 2, (pedidoLng + entregadorLng) / 2],
      14
    )

    // Adicionar tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)

    // Ícone do pedido (destino)
    const destineIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiNGRjZCMzUiIHJ4PSI0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmb250LXNpemU9IjIwIiBmaWxsPSJ3aGl0ZSI+8J+OqDwvdGV4dD48L3N2Zz4=',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    })

    // Ícone do entregador
    const deliveryIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMwMENBNDgiIHJ4PSI0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmb250LXNpemU9IjIwIiBmaWxsPSJ3aGl0ZSI+8J+QuDwvdGV4dD48L3N2Zz4=',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    })

    // Adicionar marcadores
    L.marker([pedidoLat, pedidoLng], { icon: destineIcon })
      .addTo(map)
      .bindPopup('📍 Seu Pedido')
      .openPopup()

    L.marker([entregadorLat, entregadorLng], { icon: deliveryIcon })
      .addTo(map)
      .bindPopup('🚗 Entregador')

    // Desenhar linha entre os dois pontos
    L.polyline([[entregadorLat, entregadorLng], [pedidoLat, pedidoLng]], {
      color: '#FF6B35',
      weight: 3,
      opacity: 0.7,
      dashArray: '5, 10',
    }).addTo(map)

    // Ajustar zoom para caber ambos os pontos
    const group = new L.FeatureGroup([
      L.marker([pedidoLat, pedidoLng]),
      L.marker([entregadorLat, entregadorLng]),
    ])
    map.fitBounds(group.getBounds().pad(0.1))

    mapRef.current = map

    return () => {
      map.remove()
    }
  }, [pedidoLat, pedidoLng, entregadorLat, entregadorLng])

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '400px',
      }}
      className="rounded-lg"
    />
  )
}
