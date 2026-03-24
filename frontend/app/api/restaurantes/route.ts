import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { validarCNPJ } from '@/lib/validacoes'

// GET - Listar restaurantes com filtros
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get('categoria')
    const ordenar = searchParams.get('ordenar') || 'created_at'
    const limite = parseInt(searchParams.get('limite') || '50')

    let sql = 'SELECT * FROM restaurantes WHERE status = ?'
    const args: any[] = ['ativo']

    if (categoria) {
      sql += ' AND categoria = ?'
      args.push(categoria)
    }

    sql += ' ORDER BY ' + (ordenar === 'avaliacao' ? 'avaliacao_media' : 'created_at') + ' DESC LIMIT ?'
    args.push(limite)

    const restaurantes = await db.execute({
      sql,
      args
    })

    return NextResponse.json(restaurantes.rows)
  } catch (error) {
    console.error('Erro ao listar restaurantes:', error)
    return NextResponse.json(
      { erro: 'Erro ao listar restaurantes' },
      { status: 500 }
    )
  }
}

// POST - Criar novo restaurante (apenas gerentes)
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
    const { nome, cnpj, email, telefone, endereco, categoria, latitude, longitude } = body

    // Validar campos obrigatórios
    if (!nome || !cnpj || !email || !endereco) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    // Validar CNPJ (RN002: Validação de CNPJ)
    if (!validarCNPJ(cnpj)) {
      return NextResponse.json(
        { erro: 'CNPJ inválido. Verifique o número' },
        { status: 400 }
      )
    }

    // Verificar se restaurante já existe
    const existente = await db.execute({
      sql: 'SELECT id FROM restaurantes WHERE cnpj = ?',
      args: [cnpj]
    })

    if (existente.rows.length > 0) {
      return NextResponse.json(
        { erro: 'CNPJ já cadastrado' },
        { status: 409 }
      )
    }

    // RN001: Gerente terá acesso a todas as funcionalidades
    // RN003: Taxa padrão 15% (comissão da plataforma)
    const resultado = await db.execute({
      sql: `INSERT INTO restaurantes
            (user_id, nome, cnpj, email, telefone, endereco, categoria, latitude, longitude,
             taxa_comissao, avaliacao_media, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [userId, nome, cnpj, email, telefone, endereco, categoria, latitude || 0, longitude || 0, 15, 5.0, 'pendente']
    })

    return NextResponse.json(
      {
        mensagem: 'Restaurante criado e aguardando aprovação',
        id: resultado.lastInsertRowid
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar restaurante:', error)
    return NextResponse.json(
      { erro: 'Erro ao criar restaurante' },
      { status: 500 }
    )
  }
}
