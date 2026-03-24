// frontend/app/api/pedidos/[id]/atribuir-entregador/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/frontend/lib/db'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { entregadorId } = body

    // Verificar se entregador está disponível
    const entregador = await db.execute({
      sql: 'SELECT * FROM entregadores WHERE id = ? AND status = "disponivel"',
      args: [entregadorId]
    })

    if (!entregador.rows.length) {
      return NextResponse.json(
        { error: 'Entregador não disponível' },
        { status: 400 }
      )
    }

    // Atribuir entregador ao pedido (UC006)
    await db.execute({
      sql: 'UPDATE pedidos SET entregador_id = ?, status = "entregando" WHERE id = ?',
      args: [entregadorId, params.id]
    })

    // Atualizar status do entregador
    await db.execute({
      sql: 'UPDATE entregadores SET status = "ocupado" WHERE id = ?',
      args: [entregadorId]
    })

    // Criar rota de entrega (UC007)
    const pedido = await db.execute({
      sql: 'SELECT * FROM pedidos WHERE id = ?',
      args: [params.id]
    })

    const restaurante = await db.execute({
      sql: 'SELECT latitude, longitude FROM restaurantes WHERE id = ?',
      args: [pedido.rows[0].restaurante_id]
    })

    const rotaId = crypto.randomUUID()
    await db.execute({
      sql: `
        INSERT INTO rotas (
          id, pedido_id, entregador_id,
          origem_lat, origem_lng,
          destino_lat, destino_lng
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        rotaId,
        params.id,
        entregadorId,
        restaurante.rows[0].latitude,
        restaurante.rows[0].longitude,
        pedido.rows[0].latitude_entrega,
        pedido.rows[0].longitude_entrega
      ]
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao atribuir entregador:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}