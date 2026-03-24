import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

// POST - Toggle de disponibilidade (UC013 - Online/Offline)
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
    const { disponivel } = body

    if (typeof disponivel !== 'boolean') {
      return NextResponse.json(
        { erro: 'Campo disponivel deve ser booleano' },
        { status: 400 }
      )
    }

    // Buscar entregador
    const entregador = await db.execute({
      sql: 'SELECT * FROM entregadores WHERE id = ?',
      args: [params.id]
    })

    if (entregador.rows.length === 0) {
      return NextResponse.json(
        { erro: 'Entregador não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar status de disponibilidade
    const novo_status = disponivel ? 'disponivel' : 'ausente'

    await db.execute({
      sql: `UPDATE entregadores 
            SET status = ?, 
                ultima_atualizacao = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [novo_status, params.id]
    })

    return NextResponse.json({
      mensagem: `Entregador marcado como ${novo_status}`,
      disponivel: disponivel,
      status: novo_status
    })
  } catch (error) {
    console.error('Erro ao atualizar disponibilidade:', error)
    return NextResponse.json(
      { erro: 'Erro ao atualizar disponibilidade' },
      { status: 500 }
    )
  }
}
