// @ts-nocheck
import { Router, Response } from 'express'
import { randomUUID } from 'crypto'
import { db } from '../lib/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

function ehOperador(req: AuthRequest) {
  return String(req.userRole || '').toLowerCase() === 'operador'
}

// GET /api/tickets
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query
    let sql = `SELECT t.*,
                      COALESCE(c.nome, t.solicitante_nome) AS cliente_nome,
                      COALESCE(c.email, t.solicitante_email) AS cliente_email
               FROM tickets t
               LEFT JOIN clientes c ON c.id = t.cliente_id
               WHERE 1=1`
    const args: any[] = []
    if (!ehOperador(req)) {
      sql += ' AND COALESCE(t.solicitante_id, t.cliente_id) = ?'
      args.push(req.userId)
    }
    if (status) { sql += ' AND status = ?'; args.push(status) }
    sql += ' ORDER BY t.created_at DESC LIMIT 100'
    const result = await db.execute({ sql, args })
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao listar tickets' })
  }
})

// POST /api/tickets
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { titulo, descricao, categoria, pedidoId } = req.body
    if (!titulo || !descricao || !categoria) return res.status(400).json({ erro: 'Campos obrigatórios faltando' }) as any
    const id = randomUUID()
    const perfil = String(req.userRole || 'cliente').toLowerCase()
    const clienteId = perfil === 'cliente' ? req.userId : null
    await db.execute({
      sql: `INSERT INTO tickets
            (id, cliente_id, solicitante_id, solicitante_tipo, solicitante_nome, solicitante_email,
             titulo, descricao, categoria, pedido_id, status, prioridade, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        clienteId,
        req.userId,
        perfil,
        req.userName || '',
        req.userEmail || '',
        titulo,
        descricao,
        categoria,
        pedidoId || null,
        'aberto',
        'normal',
        new Date().toISOString(),
      ]
    })
    const criado = await db.execute({ sql: 'SELECT * FROM tickets WHERE id = ?', args: [id] })
    res.status(201).json(criado.rows[0] || { mensagem: 'Ticket criado com sucesso', id })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar ticket' })
  }
})

// GET /api/tickets/:id — buscar ticket por ID
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = req.params.id
    const result = await db.execute({
      sql: `SELECT * FROM tickets WHERE id = ?${ehOperador(req) ? '' : ' AND COALESCE(solicitante_id, cliente_id) = ?'}`,
      args: ehOperador(req) ? [ticketId] : [ticketId, req.userId]
    })
    if (!result.rows.length) {
      return res.status(404).json({ erro: 'Ticket não encontrado' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Erro ao buscar ticket:', error)
    res.status(500).json({ erro: 'Erro ao buscar ticket' })
  }
})

// PUT /api/tickets/:id — atualizar ticket (adicionar resposta, mudar status)
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = req.params.id
    const { status, resposta } = req.body

    const ticketAtual = await db.execute({
      sql: `SELECT * FROM tickets WHERE id = ?${ehOperador(req) ? '' : ' AND COALESCE(solicitante_id, cliente_id) = ?'}`,
      args: ehOperador(req) ? [ticketId] : [ticketId, req.userId]
    })
    if (!ticketAtual.rows.length) {
      return res.status(404).json({ erro: 'Ticket não encontrado' })
    }

    const atualizacoes: string[] = ['updated_at = ?']
    const args: any[] = [new Date().toISOString()]

    if (status && ['aberto', 'em_analise', 'resolvido', 'fechado'].includes(status)) {
      atualizacoes.push('status = ?')
      args.push(status)
    }

    if (resposta !== undefined) {
      atualizacoes.push('resposta = ?')
      args.push(resposta || '')
    }

    if (atualizacoes.length === 1) {
      return res.status(400).json({ erro: 'Nenhum campo para atualizar' })
    }

    args.push(ticketId)
    await db.execute({
      sql: `UPDATE tickets SET ${atualizacoes.join(', ')} WHERE id = ?`,
      args
    })

    const atualizado = await db.execute({
      sql: 'SELECT * FROM tickets WHERE id = ?',
      args: [ticketId]
    })
    res.json(atualizado.rows[0] || { mensagem: 'Ticket atualizado com sucesso' })
  } catch (error) {
    console.error('Erro ao atualizar ticket:', error)
    res.status(500).json({ erro: 'Erro ao atualizar ticket' })
  }
})

// DELETE /api/tickets/:id — remover/fechar ticket
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = req.params.id
    const ticketAtual = await db.execute({
      sql: `SELECT * FROM tickets WHERE id = ?${ehOperador(req) ? '' : ' AND COALESCE(solicitante_id, cliente_id) = ?'}`,
      args: ehOperador(req) ? [ticketId] : [ticketId, req.userId]
    })
    if (!ticketAtual.rows.length) {
      return res.status(404).json({ erro: 'Ticket não encontrado' })
    }

    // Soft delete: apenas mudar status para fechado
    await db.execute({
      sql: 'UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?',
      args: ['fechado', new Date().toISOString(), ticketId]
    })

    res.json({ mensagem: 'Ticket fechado com sucesso' })
  } catch (error) {
    console.error('Erro ao fechar ticket:', error)
    res.status(500).json({ erro: 'Erro ao fechar ticket' })
  }
})

export default router
