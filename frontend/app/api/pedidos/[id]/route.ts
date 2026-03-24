import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// GET - Buscar pedido por ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const pedido = await db.execute({
      sql: 'SELECT * FROM pedidos WHERE id = ?',
      args: [params.id]
    })

    if (pedido.rows.length === 0) {
      return NextResponse.json(
        { erro: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(pedido.rows[0])
  } catch (error) {
    console.error('Erro ao buscar pedido:', error)
    return NextResponse.json(
      { erro: 'Erro ao buscar pedido' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar pedido
export async function PUT(
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

    const body = await request.json()
    const { status, tempo_preparo_estimado } = body

    let sql = 'UPDATE pedidos SET updated_at = current_timestamp'
    const args: any[] = []

    if (status) {
      sql += ', status = ?'
      args.push(status)
    }

    if (tempo_preparo_estimado !== undefined) {
      sql += ', tempo_preparo_estimado = ?'
      args.push(tempo_preparo_estimado)
    }

    sql += ' WHERE id = ?'
    args.push(params.id)

    await db.execute({
      sql,
      args
    })

    return NextResponse.json({
      mensagem: 'Pedido atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error)
    return NextResponse.json(
      { erro: 'Erro ao atualizar pedido' },
      { status: 500 }
    )
  }
}

// DELETE - Cancelar pedido (soft delete)
export async function DELETE(
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

    // RN006: Cancelamento após 5 minutos gera multa de 50% do valor
    const pedido = await db.execute({
      sql: 'SELECT created_at, total FROM pedidos WHERE id = ?',
      args: [params.id]
    })

    if (pedido.rows.length === 0) {
      return NextResponse.json(
        { erro: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Calcular tempo decorrido
    const tempoDecorrido = (Date.now() - new Date(pedido.rows[0].created_at).getTime()) / 1000 / 60

    await db.execute({
      sql: 'UPDATE pedidos SET status = ? WHERE id = ?',
      args: ['cancelado', params.id]
    })

    const multa = tempoDecorrido > 5 ? pedido.rows[0].total * 0.5 : 0

    return NextResponse.json({
      mensagem: 'Pedido cancelado',
      multa
    })
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error)
    return NextResponse.json(
      { erro: 'Erro ao cancelar pedido' },
      { status: 500 }
    )
  }
}
