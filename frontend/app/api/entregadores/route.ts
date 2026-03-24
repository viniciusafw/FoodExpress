import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// GET - Listar entregadores com filtros
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limite = parseInt(searchParams.get('limite') || '50')

    let sql = 'SELECT * FROM entregadores'
    const params: any[] = []

    if (status) {
      sql += ' WHERE status = ?'
      params.push(status)
    }

    sql += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limite)

    const entregadores = await db.execute({
      sql,
      args: params
    })

    return NextResponse.json(entregadores.rows)
  } catch (error) {
    console.error('Erro ao listar entregadores:', error)
    return NextResponse.json(
      { erro: 'Erro ao listar entregadores' },
      { status: 500 }
    )
  }
}

// POST - Criar novo entregador
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
    const { nome, cpf, telefone, veiculo_tipo, placa_veiculo } = body

    // Validar campos obrigatórios
    if (!nome || !cpf || !veiculo_tipo) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    // Verificar se entregador já existe
    const existente = await db.execute({
      sql: 'SELECT id FROM entregadores WHERE cpf = ?',
      args: [cpf]
    })

    if (existente.rows.length > 0) {
      return NextResponse.json(
        { erro: 'CPF já cadastrado' },
        { status: 409 }
      )
    }

    // Criar novo entregador
    const resultado = await db.execute({
      sql: `INSERT INTO entregadores (user_id, nome, cpf, telefone, veiculo_tipo, placa_veiculo, status, latitude, longitude, avaliacao_media, total_entregas)
            VALUES (?, ?, ?, ?, ?, ?, 'disponivel', 0, 0, 5.0, 0)`,
      args: [userId, nome, cpf, telefone, veiculo_tipo, placa_veiculo]
    })

    return NextResponse.json(
      {
        mensagem: 'Entregador criado com sucesso',
        id: resultado.lastInsertRowid
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar entregador:', error)
    return NextResponse.json(
      { erro: 'Erro ao criar entregador' },
      { status: 500 }
    )
  }
}
