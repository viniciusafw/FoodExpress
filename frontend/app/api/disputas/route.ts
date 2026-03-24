import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import crypto from 'crypto'

// GET - Listar disputas com filtros
export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tipo = searchParams.get('tipo')
    const filtro = searchParams.get('filtro') // 'minhas' ou 'todas'

    let sql = 'SELECT * FROM disputas'
    const args: any[] = []

    // Se escolher 'minhas', filtra por criador_id
    if (filtro === 'minhas') {
      sql += ' WHERE criador_id = ?'
      args.push(userId)
    }

    // Filtrar por status
    if (status) {
      sql += args.length > 0 ? ' AND' : ' WHERE'
      sql += ' status = ?'
      args.push(status)
    }

    // Filtrar por tipo
    if (tipo) {
      sql += args.length > 0 ? ' AND' : ' WHERE'
      sql += ' categoria = ?'
      args.push(tipo)
    }

    sql += ' ORDER BY criado_em DESC'

    const disputas = await db.execute({
      sql,
      args
    })

    return NextResponse.json(disputas.rows)
  } catch (error) {
    console.error('Erro ao listar disputas:', error)
    return NextResponse.json(
      { erro: 'Erro ao listar disputas' },
      { status: 500 }
    )
  }
}

// POST - Criar nova disputa (UC014)
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { pedido_id, tipo_reclamante, categoria, descricao, evidencias } = body

    // Validar campos obrigatórios
    if (!pedido_id || !tipo_reclamante || !categoria || !descricao) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    // Validar categoria
    const categorias_validas = ['pedido_incorreto', 'entrega_atrasada', 'quantidade_incorreta', 'qualidade', 'outro']
    if (!categorias_validas.includes(categoria)) {
      return NextResponse.json(
        { erro: 'Categoria inválida' },
        { status: 400 }
      )
    }

    // Validar se pedido existe
    const pedido = await db.execute({
      sql: 'SELECT id FROM pedidos WHERE id = ?',
      args: [pedido_id]
    })

    if (pedido.rows.length === 0) {
      return NextResponse.json(
        { erro: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já existe disputa aberta para este pedido
    const disputa_existente = await db.execute({
      sql: 'SELECT id FROM disputas WHERE pedido_id = ? AND status IN (?, ?)',
      args: [pedido_id, 'aberta', 'aguardando_resposta']
    })

    if (disputa_existente.rows.length > 0) {
      return NextResponse.json(
        { erro: 'Já existe uma disputa aberta para este pedido' },
        { status: 409 }
      )
    }

    // Criar disputa
    const id = crypto.randomUUID()
    const resultado = await db.execute({
      sql: `INSERT INTO disputas 
            (id, pedido_id, criador_id, tipo_reclamante, categoria, descricao, evidencias, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, pedido_id, userId, tipo_reclamante, categoria, descricao, evidencias || null, 'aberta']
    })

    return NextResponse.json(
      {
        mensagem: 'Disputa criada com sucesso',
        id
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar disputa:', error)
    return NextResponse.json(
      { erro: 'Erro ao criar disputa' },
      { status: 500 }
    )
  }
}
