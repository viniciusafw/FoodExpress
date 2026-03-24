import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// Calcular distância entre dois pontos usando Haversine (mais preciso)
function calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distância em km
}

// POST - Atribuir entregador automaticamente por proximidade
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Buscar o pedido para obter localização de entrega
    const pedido = await db.execute({
      sql: `SELECT p.*, r.latitude as rest_lat, r.longitude as rest_lng
            FROM pedidos p
            JOIN restaurantes r ON p.restaurante_id = r.id
            WHERE p.id = ?`,
      args: [params.id]
    })

    if (pedido.rows.length === 0) {
      return NextResponse.json(
        { erro: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    const pedido_info = pedido.rows[0]

    // Verificar se pedido já tem entregador
    if (pedido_info.entregador_id) {
      return NextResponse.json(
        { erro: 'Pedido já tem entregador atribuído' },
        { status: 400 }
      )
    }

    // Buscar entregadores disponíveis (status = 'disponivel')
    const entregadores_disponiveis = await db.execute({
      sql: `SELECT * FROM entregadores 
            WHERE status = 'disponivel' 
            ORDER BY ultima_atualizacao DESC 
            LIMIT 20`,
      args: []
    })

    if (entregadores_disponiveis.rows.length === 0) {
      return NextResponse.json(
        { erro: 'Nenhum entregador disponível no momento' },
        { status: 503 }
      )
    }

    // Calcular distância para cada entregador e ordenar pelo mais próximo
    const entregadores_com_distancia = entregadores_disponiveis.rows.map((entregador: any) => {
      const distancia = calcularDistancia(
        pedido_info.rest_lat,
        pedido_info.rest_lng,
        entregador.latitude,
        entregador.longitude
      )
      return {
        ...entregador,
        distancia_calculada: distancia
      }
    })

    // Ordenar por distância (mais próximo primeiro)
    entregadores_com_distancia.sort((a: any, b: any) => a.distancia_calculada - b.distancia_calculada)

    // Pegar o mais próximo
    const entregador_atribuido = entregadores_com_distancia[0]

    // Atualizar pedido com entregador
    await db.execute({
      sql: `UPDATE pedidos 
            SET entregador_id = ?, 
                status = 'entregando',
                tempo_entrega_estimado = ?,
                distancia_km = ?
            WHERE id = ?`,
      args: [
        entregador_atribuido.id,
        Math.ceil(entregador_atribuido.distancia_calculada * 3), // Estimar ~3 min por km
        entregador_atribuido.distancia_calculada,
        params.id
      ]
    })

    return NextResponse.json({
      mensagem: 'Entregador atribuído com sucesso',
      entregador_id: entregador_atribuido.id,
      entregador_nome: entregador_atribuido.nome,
      distancia_km: entregador_atribuido.distancia_calculada.toFixed(2),
      tempo_estimado_minutos: Math.ceil(entregador_atribuido.distancia_calculada * 3)
    })
  } catch (error) {
    console.error('Erro ao atribuir entregador:', error)
    return NextResponse.json(
      { erro: 'Erro ao atribuir entregador' },
      { status: 500 }
    )
  }
}
