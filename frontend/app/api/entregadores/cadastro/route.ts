import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth, currentUser } from '@clerk/nextjs/server'

// POST - Criar registro inicial ao selecionar role
export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    // Verifica se já existe
    const existente = await db.execute({
      sql: 'SELECT id FROM entregadores WHERE user_id = ?',
      args: [userId],
    })

    if (existente.rows.length > 0) {
      return NextResponse.json(existente.rows[0])
    }

    const user = await currentUser()
    const nome = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Entregador'
    const email = user?.emailAddresses[0]?.emailAddress || ''
    const id = `ent_${userId}`

    await db.execute({
      sql: `INSERT INTO entregadores
            (id, user_id, nome, email, telefone, cpf, veiculo_tipo, status, latitude, longitude, avaliacao_media, total_entregas)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, nome, email, '', '000.000.000-00', 'moto', 'disponivel', 0, 0, 0, 0],
    })

    return NextResponse.json({ id, nome, email }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar entregador:', error)
    return NextResponse.json({ erro: 'Erro ao criar entregador' }, { status: 500 })
  }
}

// GET - Buscar entregador do usuário logado
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const resultado = await db.execute({
      sql: 'SELECT * FROM entregadores WHERE user_id = ?',
      args: [userId],
    })

    if (resultado.rows.length === 0) {
      return NextResponse.json({ erro: 'Entregador não encontrado' }, { status: 404 })
    }

    return NextResponse.json(resultado.rows[0])
  } catch (error) {
    console.error('Erro ao buscar entregador:', error)
    return NextResponse.json({ erro: 'Erro ao buscar entregador' }, { status: 500 })
  }
}