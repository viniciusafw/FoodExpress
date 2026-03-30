import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth, currentUser } from '@clerk/nextjs/server'

// GET - Buscar dados do cliente logado
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const resultado = await db.execute({
      sql: 'SELECT * FROM clientes WHERE user_id = ?',
      args: [userId],
    })

    if (resultado.rows.length === 0) {
      return NextResponse.json({ erro: 'Cliente não encontrado' }, { status: 404 })
    }

    return NextResponse.json(resultado.rows[0])
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return NextResponse.json({ erro: 'Erro ao buscar cliente' }, { status: 500 })
  }
}

// POST - Criar cliente no banco ao selecionar role
export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    // Verifica se já existe
    const existente = await db.execute({
      sql: 'SELECT id FROM clientes WHERE user_id = ?',
      args: [userId],
    })

    if (existente.rows.length > 0) {
      return NextResponse.json(existente.rows[0])
    }

    // Busca dados do Clerk
    const user = await currentUser()
    const nome = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Usuário'
    const email = user?.emailAddresses[0]?.emailAddress || ''
    const id = `cli_${userId}`

    await db.execute({
      sql: `INSERT INTO clientes (id, user_id, nome, email, total_pedidos)
            VALUES (?, ?, ?, ?, 0)`,
      args: [id, userId, nome, email],
    })

    return NextResponse.json({ id, nome, email }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    return NextResponse.json({ erro: 'Erro ao criar cliente' }, { status: 500 })
  }
}