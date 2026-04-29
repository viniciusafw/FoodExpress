import { Router, Response } from 'express'
import { db } from '../lib/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tipo = String(req.query.tipo || 'vendas')
    const dataInicio = String(req.query.inicio || new Date(Date.now() - 30 * 86400_000).toISOString())
    const dataFim = String(req.query.fim || new Date().toISOString())

    let dados: any = null

    switch (tipo) {
      case 'vendas': {
        const r = await db.execute({ sql: 'SELECT COUNT(*) as total_pedidos, SUM(total) as faturamento, AVG(total) as ticket_medio FROM pedidos WHERE created_at BETWEEN ? AND ?', args: [dataInicio, dataFim] })
        dados = r.rows[0]; break
      }
      case 'desempenho-restaurantes': {
        const r = await db.execute({ sql: `SELECT r.id, r.nome, COUNT(p.id) as total_vendas, AVG(p.total) as ticket_medio, r.avaliacao_media FROM restaurantes r LEFT JOIN pedidos p ON r.id = p.restaurante_id AND p.created_at BETWEEN ? AND ? GROUP BY r.id ORDER BY total_vendas DESC`, args: [dataInicio, dataFim] })
        dados = r.rows; break
      }
      case 'eficiencia-entregadores': {
        const r = await db.execute({ sql: `SELECT e.id, e.nome, COUNT(ro.id) as entregas_realizadas, AVG(ro.distancia_km) as distancia_media, e.avaliacao_media FROM entregadores e LEFT JOIN rotas ro ON e.id = ro.entregador_id GROUP BY e.id ORDER BY entregas_realizadas DESC`, args: [] })
        dados = r.rows; break
      }
      case 'mapa-calor': {
        const r = await db.execute({ sql: "SELECT strftime('%H', created_at) as hora, COUNT(*) as quantidade FROM pedidos WHERE created_at BETWEEN ? AND ? GROUP BY hora ORDER BY hora", args: [dataInicio, dataFim] })
        dados = r.rows; break
      }
      case 'taxa-cancelamento': {
        const r = await db.execute({ sql: `SELECT COUNT(*) as total_pedidos, SUM(CASE WHEN status='cancelado' THEN 1 ELSE 0 END) as cancelados, ROUND(100.0*SUM(CASE WHEN status='cancelado' THEN 1 ELSE 0 END)/COUNT(*),2) as percentual_cancelamento, SUM(CASE WHEN status='cancelado' THEN total ELSE 0 END) as valor_cancelado FROM pedidos WHERE created_at BETWEEN ? AND ?`, args: [dataInicio, dataFim] })
        dados = r.rows[0]; break
      }
      case 'satisfacao-cliente': {
        const r = await db.execute({ sql: 'SELECT AVG(avaliacao_media) as nps_medio FROM restaurantes', args: [] })
        dados = r.rows[0]; break
      }
      case 'financeiro-comissoes': {
        const r = await db.execute({ sql: `SELECT SUM(p.total*r.taxa_comissao/100) as comissao_total, SUM(p.total) as faturamento_total, COUNT(DISTINCT r.id) as restaurantes_ativos FROM pedidos p JOIN restaurantes r ON p.restaurante_id=r.id WHERE p.status='entregue' AND p.created_at BETWEEN ? AND ?`, args: [dataInicio, dataFim] })
        dados = r.rows[0]; break
      }
      case 'produtos-top': {
        const r = await db.execute({ sql: 'SELECT id, nome, categoria, preco FROM cardapio ORDER BY id DESC LIMIT 20', args: [] })
        dados = r.rows; break
      }
      case 'tempo-entrega': {
        const r = await db.execute({ sql: 'SELECT AVG(duracao_estimada) as tempo_medio_minutos, MIN(duracao_estimada) as tempo_minimo, MAX(duracao_estimada) as tempo_maximo FROM rotas', args: [] })
        dados = r.rows[0]; break
      }
      case 'fidelizacao': {
        const r = await db.execute({ sql: `SELECT COUNT(*) as total_clientes, SUM(CASE WHEN total_pedidos>5 THEN 1 ELSE 0 END) as clientes_vip, ROUND(100.0*SUM(CASE WHEN total_pedidos>5 THEN 1 ELSE 0 END)/COUNT(*),2) as percentual_vip, AVG(total_pedidos) as pedidos_medio FROM clientes`, args: [] })
        dados = r.rows[0]; break
      }
      case 'cancelamentos-reembolsos': {
        const r = await db.execute({ sql: "SELECT COUNT(*) as total_cancelados, SUM(total) as valor_total, AVG(total) as valor_medio FROM pedidos WHERE status='cancelado' AND created_at BETWEEN ? AND ?", args: [dataInicio, dataFim] })
        dados = r.rows[0]; break
      }
      case 'crescimento-base': {
        const r = await db.execute({ sql: "SELECT 'restaurantes' as tipo, COUNT(*) as quantidade FROM restaurantes UNION ALL SELECT 'entregadores', COUNT(*) FROM entregadores UNION ALL SELECT 'clientes', COUNT(*) FROM clientes", args: [] })
        dados = r.rows; break
      }
      default:
        return res.status(400).json({ erro: 'Tipo de relatório inválido' }) as any
    }

    res.json({ tipo, dataInicio, dataFim, dados })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao gerar relatório' })
  }
})

export default router
