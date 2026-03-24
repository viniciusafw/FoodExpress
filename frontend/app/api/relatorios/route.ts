import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || 'vendas'
    const dataInicio = searchParams.get('inicio') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const dataFim = searchParams.get('fim') || new Date().toISOString()

    let dados: any = null

    switch (tipo) {
      // REL001: Vendas por período
      case 'vendas': {
        const pedidos = await db.execute({
          sql: `SELECT COUNT(*) as total_pedidos, SUM(total) as faturamento, AVG(total) as ticket_medio
                FROM pedidos WHERE created_at BETWEEN ? AND ?`,
          args: [dataInicio, dataFim]
        })
        dados = pedidos.rows[0] || {}
        break
      }

      // REL002: Desempenho por restaurante
      case 'desempenho-restaurantes': {
        const resultado = await db.execute({
          sql: `SELECT r.id, r.nome, COUNT(p.id) as total_vendas, AVG(p.total) as ticket_medio,
                       r.avaliacao_media, AVG(CAST((julianday(p.updated_at) - julianday(p.created_at)) * 24 * 60 AS INTEGER)) as tempo_medio_minutos
                FROM restaurantes r
                LEFT JOIN pedidos p ON r.id = p.restaurante_id AND p.created_at BETWEEN ? AND ?
                GROUP BY r.id ORDER BY total_vendas DESC`,
          args: [dataInicio, dataFim]
        })
        dados = resultado.rows
        break
      }

      // REL003: Eficiência de entregadores
      case 'eficiencia-entregadores': {
        const resultado = await db.execute({
          sql: `SELECT e.id, e.nome, COUNT(r.id) as entregas_realizadas,
                       AVG(r.distancia_km) as distancia_media, e.avaliacao_media
                FROM entregadores e
                LEFT JOIN rotas r ON e.id = r.entregador_id
                GROUP BY e.id ORDER BY entregas_realizadas DESC`,
          args: []
        })
        dados = resultado.rows
        break
      }

      // REL004: Mapa de calor de pedidos (agregado por hora)
      case 'mapa-calor': {
        const resultado = await db.execute({
          sql: `SELECT strftime('%H', created_at) as hora, COUNT(*) as quantidade
                FROM pedidos WHERE created_at BETWEEN ? AND ?
                GROUP BY hora ORDER BY hora`,
          args: [dataInicio, dataFim]
        })
        dados = resultado.rows
        break
      }

      // REL005: Taxa de cancelamento
      case 'taxa-cancelamento': {
        const resultado = await db.execute({
          sql: `SELECT COUNT(*) as total_pedidos,
                       SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) as cancelados,
                       ROUND(100.0 * SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) / COUNT(*), 2) as percentual_cancelamento,
                       SUM(CASE WHEN status = 'cancelado' THEN total ELSE 0 END) as valor_cancelado
                FROM pedidos WHERE created_at BETWEEN ? AND ?`,
          args: [dataInicio, dataFim]
        })
        dados = resultado.rows[0] || {}
        break
      }

      // REL006: Satisfação do cliente (baseado em avaliações)
      case 'satisfacao-cliente': {
        const resultado = await db.execute({
          sql: `SELECT AVG(r.avaliacao_media) as nps_medio, COUNT(DISTINCT c.id) as total_clientes
                FROM restaurantes r, clientes c
                LIMIT 1`,
          args: []
        })
        dados = resultado.rows[0] || {}
        break
      }

      // REL007: Financeiro - Comissões
      case 'financeiro-comissoes': {
        const resultado = await db.execute({
          sql: `SELECT SUM(p.total * r.taxa_comissao / 100) as comissao_total,
                       SUM(p.total) as faturamento_total,
                       COUNT(DISTINCT r.id) as restaurantes_ativos
                FROM pedidos p
                JOIN restaurantes r ON p.restaurante_id = r.id
                WHERE p.status = 'entregue' AND p.created_at BETWEEN ? AND ?`,
          args: [dataInicio, dataFim]
        })
        dados = resultado.rows[0] || {}
        break
      }

      // REL008: Produtos mais vendidos
      case 'produtos-top': {
        // Nota: Precisaria de uma tabela separada de itens vendidos para agregação correta
        const resultado = await db.execute({
          sql: `SELECT id, nome, categoria, preco FROM cardapio ORDER BY id DESC LIMIT 20`,
          args: []
        })
        dados = resultado.rows
        break
      }

      // REL009: Tempo de entrega
      case 'tempo-entrega': {
        const resultado = await db.execute({
          sql: `SELECT AVG(duracao_estimada) as tempo_medio_minutos,
                       MIN(duracao_estimada) as tempo_minimo,
                       MAX(duracao_estimada) as tempo_maximo
                FROM rotas`,
          args: []
        })
        dados = resultado.rows[0] || {}
        break
      }

      // REL010: Fidelização de clientes
      case 'fidelizacao': {
        const resultado = await db.execute({
          sql: `SELECT COUNT(*) as total_clientes,
                       SUM(CASE WHEN total_pedidos > 5 THEN 1 ELSE 0 END) as clientes_vip,
                       ROUND(100.0 * SUM(CASE WHEN total_pedidos > 5 THEN 1 ELSE 0 END) / COUNT(*), 2) as percentual_vip,
                       AVG(total_pedidos) as pedidos_medio
                FROM clientes`,
          args: []
        })
        dados = resultado.rows[0] || {}
        break
      }

      // REL011: Cancelamentos e reembolsos
      case 'cancelamentos-reembolsos': {
        const resultado = await db.execute({
          sql: `SELECT COUNT(*) as total_cancelados,
                       SUM(total) as valor_total,
                       AVG(total) as valor_medio
                FROM pedidos WHERE status = 'cancelado' AND created_at BETWEEN ? AND ?`,
          args: [dataInicio, dataFim]
        })
        dados = resultado.rows[0] || {}
        break
      }

      // REL012: Crescimento de base
      case 'crescimento-base': {
        const resultado = await db.execute({
          sql: `SELECT 'restaurantes' as tipo, COUNT(*) as quantidade FROM restaurantes
                UNION ALL
                SELECT 'entregadores' as tipo, COUNT(*) as quantidade FROM entregadores
                UNION ALL
                SELECT 'clientes' as tipo, COUNT(*) as quantidade FROM clientes`,
          args: []
        })
        dados = resultado.rows
        break
      }

      default:
        return NextResponse.json(
          { erro: 'Tipo de relatório inválido' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      tipo,
      dataInicio,
      dataFim,
      dados
    })
  } catch (erro) {
    console.error('Erro ao gerar relatório:', erro)
    return NextResponse.json(
      { erro: 'Erro ao gerar relatório' },
      { status: 500 }
    )
  }
}
