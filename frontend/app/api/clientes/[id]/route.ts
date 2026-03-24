import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// GET - Buscar cliente por ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cliente = await db.execute({
      sql: 'SELECT * FROM clientes WHERE id = ?',
      args: [params.id]
    })

    if (cliente.rows.length === 0) {
      return NextResponse.json(
        { erro: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(cliente.rows[0])
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return NextResponse.json(
      { erro: 'Erro ao buscar cliente' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar perfil do cliente
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
    const { nome, email, telefone, endereco_principal, latitude, longitude } = body

    let sql = 'UPDATE clientes SET updated_at = current_timestamp'
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

    if (endereco_principal) {
      sql += ', endereco_principal = ?'
      args.push(endereco_principal)
    }

    if (latitude !== undefined) {
      sql += ', latitude = ?'
      args.push(latitude)
    }

    if (longitude !== undefined) {
      sql += ', longitude = ?'
      args.push(longitude)
    }

    sql += ' WHERE id = ?'
    args.push(params.id)

    await db.execute({
      sql,
      args
    })

    return NextResponse.json({
      mensagem: 'Cliente atualizado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    return NextResponse.json(
      { erro: 'Erro ao atualizar cliente' },
      { status: 500 }
    )
  }
}
