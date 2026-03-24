import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// GET - Buscar restaurante por ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const restaurante = await db.execute({
      sql: 'SELECT * FROM restaurantes WHERE id = ?',
      args: [params.id]
    })

    if (restaurante.rows.length === 0) {
      return NextResponse.json(
        { erro: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(restaurante.rows[0])
  } catch (error) {
    console.error('Erro ao buscar restaurante:', error)
    return NextResponse.json(
      { erro: 'Erro ao buscar restaurante' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar restaurante
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
    const { nome, email, telefone, endereco, categoria, status, taxa_comissao } = body

    let sql = 'UPDATE restaurantes SET updated_at = current_timestamp'
    const args: any[] = []

    if (nome) {
      sql += ', nome = ?'
      args.push(nome)
    }

    if (email) {
      sql += ', email = ?'
      args.push(email)
    }

    if (telefone) {
      sql += ', telefone = ?'
      args.push(telefone)
    }

    if (endereco) {
      sql += ', endereco = ?'
      args.push(endereco)
    }

    if (categoria) {
      sql += ', categoria = ?'
      args.push(categoria)
    }

    if (status) {
      sql += ', status = ?'
      args.push(status)
    }

    if (taxa_comissao !== undefined) {
      sql += ', taxa_comissao = ?'
      args.push(taxa_comissao)
    }

    sql += ' WHERE id = ?'
    args.push(params.id)

    await db.execute({
      sql,
      args
    })

    return NextResponse.json({
      mensagem: 'Restaurante atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar restaurante:', error)
    return NextResponse.json(
      { erro: 'Erro ao atualizar restaurante' },
      { status: 500 }
    )
  }
}

// DELETE - Desativar restaurante
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
      sql: 'UPDATE restaurantes SET status = ? WHERE id = ?',
      args: ['inativo', params.id]
    })

    return NextResponse.json({
      mensagem: 'Restaurante desativado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao desativar restaurante:', error)
    return NextResponse.json(
      { erro: 'Erro ao desativar restaurante' },
      { status: 500 }
    )
  }
}
