import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// GET - Buscar entregador por ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const entregador = await db.execute({
      sql: 'SELECT * FROM entregadores WHERE id = ?',
      args: [params.id]
    })

    if (entregador.rows.length === 0) {
      return NextResponse.json(
        { erro: 'Entregador não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(entregador.rows[0])
  } catch (error) {
    console.error('Erro ao buscar entregador:', error)
    return NextResponse.json(
      { erro: 'Erro ao buscar entregador' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar entregador (status, localização, etc)
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
    const { status, latitude, longitude, avaliacao_media } = body

    let sql = 'UPDATE entregadores SET updated_at = current_timestamp'
    const args: any[] = []

    if (status) {
      sql += ', status = ?'
      args.push(status)
    }

    if (latitude !== undefined) {
      sql += ', latitude = ?'
      args.push(latitude)
    }

    if (longitude !== undefined) {
      sql += ', longitude = ?'
      args.push(longitude)
    }

    if (avaliacao_media !== undefined) {
      sql += ', avaliacao_media = ?'
      args.push(avaliacao_media)
    }

    // Atualizar ultima_atualizacao para rastreamento de GPS
    sql += ', ultima_atualizacao = CURRENT_TIMESTAMP'

    sql += ' WHERE id = ?'
    args.push(params.id)

    await db.execute({
      sql,
      args
    })

    return NextResponse.json({
      mensagem: 'Entregador atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar entregador:', error)
    return NextResponse.json(
      { erro: 'Erro ao atualizar entregador' },
      { status: 500 }
    )
  }
}

// DELETE - Desativar entregador (soft delete)
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

    await db.execute({
      sql: 'UPDATE entregadores SET status = ? WHERE id = ?',
      args: ['inativo', params.id]
    })

    return NextResponse.json({
      mensagem: 'Entregador desativado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao desativar entregador:', error)
    return NextResponse.json(
      { erro: 'Erro ao desativar entregador' },
      { status: 500 }
    )
  }
}
