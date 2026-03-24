import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// GET - Detalhe de uma disputa específica
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const disputa = await db.execute({
      sql: 'SELECT * FROM disputas WHERE id = ?',
      args: [params.id]
    })

    if (disputa.rows.length === 0) {
      return NextResponse.json({ erro: 'Disputa não encontrada' }, { status: 404 })
    }

    return NextResponse.json(disputa.rows[0])
  } catch (error) {
    console.error('Erro ao buscar disputa:', error)
    return NextResponse.json(
      { erro: 'Erro ao buscar disputa' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar disputa (adicionar resposta, resolver)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { resposta_outra_parte, status, resolucao, resultado, motivo_resolucao } = body

    // Buscar disputa existente
    const disputa = await db.execute({
      sql: 'SELECT * FROM disputas WHERE id = ?',
      args: [params.id]
    })

    if (disputa.rows.length === 0) {
      return NextResponse.json({ erro: 'Disputa não encontrada' }, { status: 404 })
    }

    const disputa_atual = disputa.rows[0]

    // Construir UPDATE dinâmico
    let campos_update = []
    let valores_update = []

    if (resposta_outra_parte !== undefined) {
      campos_update.push('resposta_outra_parte = ?')
      valores_update.push(resposta_outra_parte)
      campos_update.push('status = ?')
      valores_update.push('aguardando_resolucao')
      campos_update.push('respondido_em = CURRENT_TIMESTAMP')
    }

    if (status && ['aberta', 'aguardando_resposta', 'aguardando_resolucao', 'resolvida'].includes(status)) {
      campos_update.push('status = ?')
      valores_update.push(status)
    }

    if (resolucao !== undefined) {
      campos_update.push('resolucao = ?')
      valores_update.push(resolucao)
      campos_update.push('resultado = ?')
      valores_update.push(resultado !== undefined ? resultado : null)
      
      if (motivo_resolucao) {
        campos_update.push('motivo_resolucao = ?')
        valores_update.push(motivo_resolucao)
      }
      
      campos_update.push('status = ?')
      valores_update.push('resolvida')
      campos_update.push('resolvido_em = CURRENT_TIMESTAMP')
    }

    if (campos_update.length === 0) {
      return NextResponse.json(
        { erro: 'Nenhum campo para atualizar' },
        { status: 400 }
      )
    }

    valores_update.push(params.id)

    const sql = `UPDATE disputas SET ${campos_update.join(', ')} WHERE id = ?`

    await db.execute({
      sql,
      args: valores_update
    })

    return NextResponse.json({ mensagem: 'Disputa atualizada com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar disputa:', error)
    return NextResponse.json(
      { erro: 'Erro ao atualizar disputa' },
      { status: 500 }
    )
  }
}

// DELETE - Fechar/Cancelar disputa (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    // Verificar se disputa existe
    const disputa = await db.execute({
      sql: 'SELECT * FROM disputas WHERE id = ?',
      args: [params.id]
    })

    if (disputa.rows.length === 0) {
      return NextResponse.json({ erro: 'Disputa não encontrada' }, { status: 404 })
    }

    // Apenas permitir fechar se estiver aberta
    if (disputa.rows[0].status !== 'aberta') {
      return NextResponse.json(
        { erro: 'Disputa já foi respondida ou resolvida' },
        { status: 400 }
      )
    }

    // Marcar como cancelada
    await db.execute({
      sql: 'UPDATE disputas SET status = ? WHERE id = ?',
      args: ['cancelada', params.id]
    })

    return NextResponse.json({ mensagem: 'Disputa cancelada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar disputa:', error)
    return NextResponse.json(
      { erro: 'Erro ao deletar disputa' },
      { status: 500 }
    )
  }
}
