import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// GET - Buscar item do cardápio por ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const item = await db.execute({
      sql: 'SELECT * FROM cardapio WHERE id = ?',
      args: [params.id]
    })

    if (item.rows.length === 0) {
      return NextResponse.json(
        { erro: 'Item não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(item.rows[0])
  } catch (error) {
    console.error('Erro ao buscar item:', error)
    return NextResponse.json(
      { erro: 'Erro ao buscar item' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar item do cardápio
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
    const { nome, preco, categoria, descricao, disponivel, destaque } = body

    let sql = 'UPDATE cardapio SET updated_at = current_timestamp'
    const args: any[] = []

    if (nome) {
      sql += ', nome = ?'
      args.push(nome)
    }

    if (preco !== undefined) {
      sql += ', preco = ?'
      args.push(preco)
    }

    if (categoria) {
      sql += ', categoria = ?'
      args.push(categoria)
    }

    if (descricao !== undefined) {
      sql += ', descricao = ?'
      args.push(descricao)
    }

    if (disponivel !== undefined) {
      sql += ', disponivel = ?'
      args.push(disponivel ? 1 : 0)
    }

    if (destaque !== undefined) {
      sql += ', destaque = ?'
      args.push(destaque ? 1 : 0)
    }

    sql += ' WHERE id = ?'
    args.push(params.id)

    await db.execute({
      sql,
      args
    })

    return NextResponse.json({
      mensagem: 'Item atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar item:', error)
    return NextResponse.json(
      { erro: 'Erro ao atualizar item' },
      { status: 500 }
    )
  }
}

// DELETE - Remover item do cardápio
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
      sql: 'UPDATE cardapio SET disponivel = 0 WHERE id = ?',
      args: [params.id]
    })

    return NextResponse.json({
      mensagem: 'Item removido do cardápio'
    })
  } catch (error) {
    console.error('Erro ao remover item:', error)
    return NextResponse.json(
      { erro: 'Erro ao remover item' },
      { status: 500 }
    )
  }
}
