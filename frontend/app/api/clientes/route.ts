import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { verificarLimiteRota } from '@/lib/rateLimit'
import type { NextRequest } from 'next/server'

// GET - Listar clientes (apenas admin/operador)
export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limite = parseInt(searchParams.get('limite') || '50')

    const clientes = await db.execute({
      sql: 'SELECT id, user_id, nome, email, total_pedidos, created_at FROM clientes ORDER BY created_at DESC LIMIT ?',
      args: [limite]
    })

    return NextResponse.json(clientes.rows)
  } catch (error) {
    console.error('Erro ao listar clientes:', error)
    return NextResponse.json(
      { erro: 'Erro ao listar clientes' },
      { status: 500 }
    )
  }
}

// POST - Criar ou atualizar perfil de cliente
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Aplicar rate limiting
    const ip = (request as any).ip || 'unknown'
    if (!verificarLimiteRota(ip, '/api/clientes', 'POST')) {
      return NextResponse.json(
        { erro: 'Muitas requisições. Tente novamente em alguns minutos' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }

    const body = await request.json()
    const { nome, email, telefone, endereco_principal, latitude, longitude } = body

    // Verificar se cliente já existe
    const existente = await db.execute({
      sql: 'SELECT id FROM clientes WHERE user_id = ?',
      args: [userId]
    })

    if (existente.rows.length > 0) {
      // Atualizar
      await db.execute({
        sql: `UPDATE clientes
              SET nome = ?, email = ?, telefone = ?, endereco_principal = ?,
                  latitude = ?, longitude = ?, updated_at = current_timestamp
              WHERE user_id = ?`,
        args: [nome || '', email || '', telefone || '', endereco_principal || '', latitude || 0, longitude || 0, userId]
      })

      return NextResponse.json({
        mensagem: 'Perfil atualizado'
      })
    } else {
      // Criar novo
      const resultado = await db.execute({
        sql: `INSERT INTO clientes
              (user_id, nome, email, telefone, endereco_principal, latitude, longitude, total_pedidos)
              VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        args: [userId, nome || '', email || '', telefone || '', endereco_principal || '', latitude || 0, longitude || 0]
      })

      return NextResponse.json(
        {
          mensagem: 'Perfil criado com sucesso',
          id: resultado.lastInsertRowid
        },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error('Erro ao criar/atualizar cliente:', error)
    return NextResponse.json(
      { erro: 'Erro ao processar cliente' },
      { status: 500 }
    )
  }
}
