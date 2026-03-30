import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth, currentUser } from '@clerk/nextjs/server'

// POST - Criar registro inicial do restaurante ao selecionar role
export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    // Verifica se já existe
    const existente = await db.execute({
      sql: 'SELECT id FROM restaurantes WHERE email = (SELECT email_addresses FROM usuarios WHERE user_id = ?)',
      args: [userId],
    })

    // Busca dados do Clerk
    const user = await currentUser()
    const email = user?.emailAddresses[0]?.emailAddress || ''
    const nome = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Meu Restaurante'

    // Verifica por email
    const existentePorEmail = await db.execute({
      sql: 'SELECT id FROM restaurantes WHERE email = ?',
      args: [email],
    })

    if (existentePorEmail.rows.length > 0) {
      return NextResponse.json(existentePorEmail.rows[0])
    }

    const id = `rest_${userId}`

    await db.execute({
      sql: `INSERT INTO restaurantes
            (id, nome, cnpj, email, telefone, endereco, categoria, latitude, longitude,
             taxa_comissao, avaliacao_media, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, nome, '00.000.000/0000-00', email, '', '', 'Geral', 0, 0, 15, 0, 'pendente'],
    })

    return NextResponse.json({ id, nome, email }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar restaurante:', error)
    return NextResponse.json({ erro: 'Erro ao criar restaurante' }, { status: 500 })
  }
}

// GET - Buscar restaurante do usuário logado
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const user = await currentUser()
    const email = user?.emailAddresses[0]?.emailAddress || ''

    const resultado = await db.execute({
      sql: 'SELECT * FROM restaurantes WHERE email = ?',
      args: [email],
    })

    if (resultado.rows.length === 0) {
      return NextResponse.json({ erro: 'Restaurante não encontrado' }, { status: 404 })
    }

    return NextResponse.json(resultado.rows[0])
  } catch (error) {
    console.error('Erro ao buscar restaurante:', error)
    return NextResponse.json({ erro: 'Erro ao buscar restaurante' }, { status: 500 })
  }
}