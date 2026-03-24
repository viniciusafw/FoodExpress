import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// GET - Listar itens do cardápio
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const restauranteId = searchParams.get('restauranteId')
    const categoria = searchParams.get('categoria')

    let sql = 'SELECT * FROM cardapio WHERE disponivel = 1'
    const args: any[] = []

    if (restauranteId) {
      sql += ' AND restaurante_id = ?'
      args.push(restauranteId)
    }

    if (categoria) {
      sql += ' AND categoria = ?'
      args.push(categoria)
    }

    sql += ' ORDER BY destaque DESC, nome ASC'

    const itens = await db.execute({
      sql,
      args
    })

    return NextResponse.json(itens.rows)
  } catch (error) {
    console.error('Erro ao listar cardápio:', error)
    return NextResponse.json(
      { erro: 'Erro ao listar cardápio' },
      { status: 500 }
    )
  }
}

// POST - Criar item no cardápio
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
    const { restauranteId, nome, preco, categoria, descricao, imagem, tempo_preparo } = body

    if (!restauranteId || !nome || !preco || !categoria) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    const resultado = await db.execute({
      sql: `INSERT INTO cardapio
            (restaurante_id, nome, preco, categoria, descricao, imagem, tempo_preparo, disponivel)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [restauranteId, nome, preco, categoria, descricao || '', imagem || '', tempo_preparo || 30]
    })

    return NextResponse.json(
      {
        mensagem: 'Item adicionado ao cardápio',
        id: resultado.lastInsertRowid
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar item:', error)
    return NextResponse.json(
      { erro: 'Erro ao criar item' },
      { status: 500 }
    )
  }
}
