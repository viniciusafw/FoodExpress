// @ts-nocheck
import { Router, Response } from 'express'
import { db } from '../lib/db'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/resumo', requireAuth, requireRole('operador'), async (_req: AuthRequest, res: Response) => {
  try {
    const [
      restaurantes,
      pedidos,
      entregadores,
      clientes,
      tickets,
      denuncias,
      pedidosRecentes,
    ] = await Promise.all([
      db.execute({
        sql: `SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pendentes,
                SUM(CASE WHEN status IN ('ativo', 'fechado') THEN 1 ELSE 0 END) AS publicados
              FROM restaurantes`,
      }),
      db.execute({
        sql: `SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 ELSE 0 END) AS hoje,
                SUM(CASE WHEN status IN ('pendente', 'confirmado', 'preparando', 'pronto', 'entregando') THEN 1 ELSE 0 END) AS ativos,
                COALESCE(SUM(CASE WHEN status = 'entregue' THEN total ELSE 0 END), 0) AS faturamento
              FROM pedidos`,
      }),
      db.execute({
        sql: `SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'disponivel'
                          AND ultima_atualizacao >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 MINUTE)
                         THEN 1 ELSE 0 END) AS online,
                SUM(CASE WHEN status = 'ocupado' THEN 1 ELSE 0 END) AS ocupados
              FROM entregadores`,
      }),
      db.execute({
        sql: `SELECT COUNT(*) AS total FROM clientes WHERE deletado_em IS NULL`,
      }),
      db.execute({
        sql: `SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status IN ('aberto', 'em_atendimento', 'em_analise') THEN 1 ELSE 0 END) AS abertos
              FROM tickets`,
      }),
      db.execute({
        sql: `SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status IN ('aberta', 'em_analise') THEN 1 ELSE 0 END) AS abertas
              FROM denuncias_produtos`,
      }),
      db.execute({
        sql: `SELECT p.id, p.status, p.total, p.created_at,
                     r.nome AS restaurante_nome, c.nome AS cliente_nome
              FROM pedidos p
              LEFT JOIN restaurantes r ON r.id = p.restaurante_id
              LEFT JOIN clientes c ON c.id = p.cliente_id
              ORDER BY p.created_at DESC
              LIMIT 8`,
      }),
    ])

    res.json({
      restaurantes: restaurantes.rows[0] || {},
      pedidos: pedidos.rows[0] || {},
      entregadores: entregadores.rows[0] || {},
      clientes: clientes.rows[0] || {},
      tickets: tickets.rows[0] || {},
      denuncias: denuncias.rows[0] || {},
      pedidosRecentes: pedidosRecentes.rows || [],
    })
  } catch (error) {
    console.error('Erro ao carregar resumo administrativo:', error)
    res.status(500).json({ erro: 'Não foi possível carregar o resumo administrativo.' })
  }
})

export default router
