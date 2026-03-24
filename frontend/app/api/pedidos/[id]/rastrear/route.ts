import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// Função para calcular distância usando Haversine
function calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// GET - Obter dados de rastreamento completos do pedido (UC012)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Buscar pedido com detalhes de entrega
    const pedido = await db.execute({
      sql: `SELECT 
              p.*,
              r.nome as restaurante_nome, r.latitude as rest_lat, r.longitude as rest_lng,
              e.nome as entregador_nome, e.latitude as entregador_lat, e.longitude as entregador_lng,
              c.nome as cliente_nome
            FROM pedidos p
            LEFT JOIN restaurantes r ON p.restaurante_id = r.id
            LEFT JOIN entregadores e ON p.entregador_id = e.id
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE p.id = ?`,
      args: [params.id]
    })

    if (pedido.rows.length === 0) {
      return NextResponse.json(
        { erro: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    const p = pedido.rows[0]

    // Se não tiver entregador, retornar status
    if (!p.entregador_id) {
      return NextResponse.json({
        pedido_id: p.id,
        status: p.status,
        mensagem: 'Aguardando atribuição de entregador'
      })
    }

    // Calcular distância entre entregador e destino
    const distancia_atual = calcularDistancia(
      p.entregador_lat,
      p.entregador_lng,
      p.latitude_entrega,
      p.longitude_entrega
    )

    // Estimar tempo (25 km/h média)
    const tempo_estimado = Math.ceil((distancia_atual / 25) * 60)

    return NextResponse.json({
      pedido_id: p.id,
      status: p.status,
      cliente: {
        nome: p.cliente_nome
      },
      restaurante: {
        nome: p.restaurante_nome,
        localizacao: {
          lat: p.rest_lat,
          lng: p.rest_lng
        }
      },
      entregador: {
        id: p.entregador_id,
        nome: p.entregador_nome,
        localizacao_atual: {
          lat: p.entregador_lat,
          lng: p.entregador_lng
        }
      },
      destino: {
        endereco: p.endereco_entrega,
        localizacao: {
          lat: p.latitude_entrega,
          lng: p.longitude_entrega
        }
      },
      rota: {
        distancia_atual_km: Math.round(distancia_atual * 100) / 100,
        tempo_estimado_minutos: tempo_estimado,
        distancia_total_km: p.distancia_km,
        progresso_percentual: Math.round(((p.distancia_km - distancia_atual) / p.distancia_km) * 100)
      },
      timeline: {
        confirmado_em: p.confirmado_em,
        pronto_em: p.pronto_em,
        entregue_em: p.entregue_em
      }
    })
  } catch (error) {
    console.error('Erro ao buscar rastreamento:', error)
    return NextResponse.json(
      { erro: 'Erro ao buscar rastreamento' },
      { status: 500 }
    )
  }
}
