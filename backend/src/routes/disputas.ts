import { Router, Response } from 'express'
import { randomUUID } from 'crypto'
import { db } from '../lib/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const CATEGORIAS_VALIDAS = ['pedido_incorreto', 'entrega_atrasada', 'quantidade_incorreta', 'qualidade', 'outro']

// GET /api/disputas
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, tipo, filtro } = req.query
    let sql = 'SELECT * FROM disputas'
    const args: any[] = []
    const where: string[] = []
    if (filtro === 'minhas') { where.push('criador_id = ?'); args.push(req.userId) }
    if (status) { where.push('status = ?'); args.push(status) }
    if (tipo) { where.push('categoria = ?'); args.push(tipo) }
    if (where.length) sql += ' WHERE ' + where.join(' AND ')
    sql += ' ORDER BY criado_em DESC'
    const result = await db.execute({ sql, args })
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao listar disputas' })
  }
})

// GET /api/disputas/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM disputas WHERE id = ?', args: [req.params.id] })
    if (!result.rows.length) return res.status(404).json({ erro: 'Disputa não encontrada' }) as any
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar disputa' })
  }
})

// POST /api/disputas
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { pedido_id, tipo_reclamante, categoria, descricao, evidencias } = req.body
    if (!pedido_id || !tipo_reclamante || !categoria || !descricao) return res.status(400).json({ erro: 'Campos obrigatórios faltando' }) as any
    if (!CATEGORIAS_VALIDAS.includes(categoria)) return res.status(400).json({ erro: 'Categoria inválida' }) as any

    const pedido = await db.execute({ sql: 'SELECT id FROM pedidos WHERE id = ?', args: [pedido_id] })
    if (!pedido.rows.length) return res.status(404).json({ erro: 'Pedido não encontrado' }) as any

    const existente = await db.execute({ sql: "SELECT id FROM disputas WHERE pedido_id = ? AND status IN ('aberta','aguardando_resposta')", args: [pedido_id] })
    if (existente.rows.length) return res.status(409).json({ erro: 'Já existe uma disputa aberta para este pedido' }) as any

    const id = randomUUID()
    await db.execute({
      sql: 'INSERT INTO disputas (id, pedido_id, criador_id, tipo_reclamante, categoria, descricao, evidencias, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [id, pedido_id, req.userId, tipo_reclamante, categoria, descricao, evidencias || null, 'aberta']
    })
    res.status(201).json({ mensagem: 'Disputa criada com sucesso', id })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar disputa' })
  }
})

// PUT /api/disputas/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { resposta_outra_parte, status, resolucao, resultado, motivo_resolucao } = req.body
    const sets: string[] = []
    const args: any[] = []

    if (resposta_outra_parte !== undefined) {
      sets.push('resposta_outra_parte = ?', 'status = ?', 'respondido_em = CURRENT_TIMESTAMP')
      args.push(resposta_outra_parte, 'aguardando_resolucao')
    }
    if (status && ['aberta', 'aguardando_resposta', 'aguardando_resolucao', 'resolvida'].includes(status)) {
      sets.push('status = ?'); args.push(status)
    }
    if (resolucao !== undefined) {
      sets.push('resolucao = ?', 'resultado = ?', 'status = ?', 'resolvido_em = CURRENT_TIMESTAMP')
      args.push(resolucao, resultado ?? null, 'resolvida')
      if (motivo_resolucao) { sets.push('motivo_resolucao = ?'); args.push(motivo_resolucao) }
    }
    if (!sets.length) return res.status(400).json({ erro: 'Nenhum campo para atualizar' }) as any

    args.push(req.params.id)
    await db.execute({ sql: `UPDATE disputas SET ${sets.join(', ')} WHERE id = ?`, args })
    res.json({ mensagem: 'Disputa atualizada com sucesso' })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar disputa' })
  }
})

// DELETE /api/disputas/:id — cancelar
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const disputa = await db.execute({ sql: 'SELECT status FROM disputas WHERE id = ?', args: [req.params.id] })
    if (!disputa.rows.length) return res.status(404).json({ erro: 'Disputa não encontrada' }) as any
    if ((disputa.rows[0] as any).status !== 'aberta') return res.status(400).json({ erro: 'Disputa já foi respondida ou resolvida' }) as any
    await db.execute({ sql: "UPDATE disputas SET status = 'cancelada' WHERE id = ?", args: [req.params.id] })
    res.json({ mensagem: 'Disputa cancelada com sucesso' })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao cancelar disputa' })
  }
})

export default router
