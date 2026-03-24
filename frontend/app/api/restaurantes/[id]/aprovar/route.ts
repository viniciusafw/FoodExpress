import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// POST - Aprovar restaurante (UC002 - Operador/Gerente)
export async function POST(
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
    const { acao, motivo_rejeicao, taxa_comissao = 15 } = body

    // Validar ação
    if (!['aprovar', 'rejeitar'].includes(acao)) {
      return NextResponse.json(
        { erro: 'Ação deve ser "aprovar" ou "rejeitar"' },
        { status: 400 }
      )
    }

    // Buscar restaurante
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

    const rest = restaurante.rows[0]

    // Verificar se já foi processado
    if (rest.status !== 'pendente') {
      return NextResponse.json(
        { erro: `Restaurante já foi ${rest.status}` },
        { status: 400 }
      )
    }

    // Atualizar status
    let novo_status = acao === 'aprovar' ? 'ativo' : 'rejeitado'
    let observacao_rejeicao = null

    if (acao === 'rejeitar') {
      if (!motivo_rejeicao) {
        return NextResponse.json(
          { erro: 'Motivo da rejeição é obrigatório' },
          { status: 400 }
        )
      }
      observacao_rejeicao = motivo_rejeicao
    }

    // Update restaurante
    const update_sql = acao === 'aprovar'
      ? `UPDATE restaurantes 
         SET status = ?, taxa_comissao = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      : `UPDATE restaurantes 
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`

    const update_args = acao === 'aprovar'
      ? [novo_status, taxa_comissao, params.id]
      : [novo_status, params.id]

    await db.execute({
      sql: update_sql,
      args: update_args
    })

    return NextResponse.json({
      mensagem: `Restaurante ${acao === 'aprovar' ? 'aprovado' : 'rejeitado'} com sucesso`,
      id: params.id,
      status: novo_status,
      taxa_comissao: acao === 'aprovar' ? taxa_comissao : undefined,
      motivo_rejeicao: observacao_rejeicao
    })
  } catch (error) {
    console.error('Erro ao processar aprovação:', error)
    return NextResponse.json(
      { erro: 'Erro ao processar aprovação' },
      { status: 500 }
    )
  }
}
