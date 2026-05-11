// @ts-nocheck
import { Router, Response } from 'express'
import { db } from '../lib/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/avaliacoes
router.get('/', async (req, res: Response) => {
  try {
    const { restauranteId, entregadorId, tipo } = req.query
    let sql = 'SELECT * FROM avaliacoes WHERE 1=1'
    const args: any[] = []
    if (restauranteId && tipo === 'restaurante') { sql += ' AND restaurante_id = ?'; args.push(restauranteId) }
    if (entregadorId && tipo === 'entregador') { sql += ' AND entregador_id = ?'; args.push(entregadorId) }
    sql += ' ORDER BY created_at DESC LIMIT 50'
    const result = await db.execute({ sql, args })
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao listar avaliações' })
  }
})

// POST /api/avaliacoes
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { pedidoId, restauranteId, entregadorId, comentario } = req.body
    const estrelas = Number(req.body.estrelas ?? req.body.avaliacao)
    const tipo = req.body.tipo || (entregadorId ? 'entregador' : 'restaurante')

    if (!pedidoId || !tipo || !Number.isInteger(estrelas) || estrelas < 1 || estrelas > 5) {
      return res.status(400).json({ erro: 'Dados inválidos' }) as any
    }

    const jaAvaliado = await db.execute({
      sql: 'SELECT id FROM avaliacoes WHERE pedido_id = ? AND cliente_id = ? AND tipo = ?',
      args: [pedidoId, req.userId, tipo]
    })
    if (jaAvaliado.rows.length) return res.status(409).json({ erro: 'Você já avaliou este pedido' }) as any

    const result = await db.execute({
      sql: `INSERT INTO avaliacoes (id, cliente_id, pedido_id, restaurante_id, entregador_id, estrelas, comentario, tipo)
            VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)`,
      args: [req.userId, pedidoId, restauranteId || null, entregadorId || null, estrelas, comentario || '', tipo]
    })

    if (restauranteId) {
      const media = await db.execute({ sql: 'SELECT AVG(CAST(estrelas AS FLOAT)) as media FROM avaliacoes WHERE restaurante_id = ?', args: [restauranteId] })
      await db.execute({ sql: 'UPDATE restaurantes SET avaliacao_media = ? WHERE id = ?', args: [(media.rows[0] as any).media || 5.0, restauranteId] })
      await db.execute({ sql: 'UPDATE pedidos SET avaliacao_restaurante = ?, comentario = ? WHERE id = ?', args: [estrelas, comentario || '', pedidoId] })
    }
    if (entregadorId) {
      const media = await db.execute({ sql: 'SELECT AVG(CAST(estrelas AS FLOAT)) as media FROM avaliacoes WHERE entregador_id = ?', args: [entregadorId] })
      await db.execute({ sql: 'UPDATE entregadores SET avaliacao_media = ? WHERE id = ?', args: [(media.rows[0] as any).media || 5.0, entregadorId] })
      await db.execute({ sql: 'UPDATE pedidos SET avaliacao_entregador = ? WHERE id = ?', args: [estrelas, pedidoId] })
    }

    res.status(201).json({ mensagem: 'Avaliação registrada com sucesso', id: result.lastInsertRowid })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar avaliação' })
  }
})

export default router
