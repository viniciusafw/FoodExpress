// @ts-nocheck
import { Router, Response } from 'express'
import { randomUUID } from 'crypto'
import { db } from '../lib/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/tickets
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query
    let sql = 'SELECT * FROM tickets WHERE cliente_id = ?'
    const args: any[] = [req.userId]
    if (status) { sql += ' AND status = ?'; args.push(status) }
    sql += ' ORDER BY created_at DESC LIMIT 50'
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
    await db.execute({
      sql: 'INSERT INTO tickets (id, cliente_id, titulo, descricao, categoria, pedido_id, status, prioridade, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [id, req.userId, titulo, descricao, categoria, pedidoId || null, 'aberto', 'normal', new Date().toISOString()]
    })
    res.status(201).json({ mensagem: 'Ticket criado com sucesso', id })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar ticket' })
  }
})

export default router
