import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// GET - Listar avaliações
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const restauranteId = searchParams.get('restauranteId')
    const entregadorId = searchParams.get('entregadorId')
    const tipo = searchParams.get('tipo') // 'restaurante' ou 'entregador'

    let sql = 'SELECT * FROM avaliacoes WHERE 1=1'
    const args: any[] = []

    if (restauranteId && tipo === 'restaurante') {
      sql += ' AND restaurante_id = ?'
      args.push(restauranteId)
    }

    if (entregadorId && tipo === 'entregador') {
      sql += ' AND entregador_id = ?'
      args.push(entregadorId)
    }

    sql += ' ORDER BY created_at DESC LIMIT 50'

    const avaliacoes = await db.execute({
      sql,
      args
    })

    return NextResponse.json(avaliacoes.rows)
  } catch (erro) {
    console.error('Erro ao listar avaliações:', erro)
    return NextResponse.json(
      { erro: 'Erro ao listar avaliações' },
      { status: 500 }
    )
  }
}

// POST - Criar avaliação
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { pedidoId, restauranteId, entregadorId, estrelas, comentario, tipo } = body

    // Validar campos
    if (!tipo || !estrelas || (estrelas < 1 || estrelas > 5)) {
      return NextResponse.json(
        { erro: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Verificar se cliente já avaliou este pedido
    const jaAvaliado = await db.execute({
      sql: 'SELECT id FROM avaliacoes WHERE pedido_id = ? AND cliente_id = ?',
      args: [pedidoId, userId]
    })

    if (jaAvaliado.rows.length > 0) {
      return NextResponse.json(
        { erro: 'Você já avaliou este pedido' },
        { status: 409 }
      )
    }

    // Inserir avaliação
    const resultado = await db.execute({
      sql: `INSERT INTO avaliacoes
            (cliente_id, pedido_id, restaurante_id, entregador_id, estrelas, comentario, tipo)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [userId, pedidoId, restauranteId || null, entregadorId || null, estrelas, comentario || '', tipo]
    })

    // Atualizar média de avaliações
    if (restauranteId) {
      const mediaRes = await db.execute({
        sql: 'SELECT AVG(CAST(estrelas AS FLOAT)) as media FROM avaliacoes WHERE restaurante_id = ?',
        args: [restauranteId]
      })
      const media = mediaRes.rows[0]?.media || 5.0

      await db.execute({
        sql: 'UPDATE restaurantes SET avaliacao_media = ? WHERE id = ?',
        args: [media, restauranteId]
      })
    }

    if (entregadorId) {
      const mediaRes = await db.execute({
        sql: 'SELECT AVG(CAST(estrelas AS FLOAT)) as media FROM avaliacoes WHERE entregador_id = ?',
        args: [entregadorId]
      })
      const media = mediaRes.rows[0]?.media || 5.0

      await db.execute({
        sql: 'UPDATE entregadores SET avaliacao_media = ? WHERE id = ?',
        args: [media, entregadorId]
      })
    }

    return NextResponse.json(
      {
        mensagem: 'Avaliação registrada com sucesso',
        id: resultado.lastInsertRowid
      },
      { status: 201 }
    )
  } catch (erro) {
    console.error('Erro ao criar avaliação:', erro)
    return NextResponse.json(
      { erro: 'Erro ao criar avaliação' },
      { status: 500 }
    )
  }
}
