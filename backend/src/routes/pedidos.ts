// @ts-nocheck
import { Router, Response } from 'express'
import Stripe from 'stripe'
import crypto from 'crypto'
import { db } from '../lib/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { buscarRestauranteDoUsuario } from '../lib/schema'

const router = Router()

type TipoCupom = 'percentual' | 'fixo' | 'frete_gratis'

const CUPONS_ESTATICOS: Record<string, { desconto: number; tipo: TipoCupom; minimo: number; data_expiracao?: string | null; uso_unico?: boolean }> = {
  BEMVINDO10: { desconto: 10, tipo: 'percentual', minimo: 35, uso_unico: true },
  PRIMEIRA_VEZ: { desconto: 15, tipo: 'percentual', minimo: 45, uso_unico: true },
}

function normalizarTipoCupom(tipo: any): TipoCupom {
  const valor = String(tipo || 'percentual').toLowerCase()
  if (valor === 'valor') return 'fixo'
  if (valor === 'fixo' || valor === 'frete_gratis') return valor
  return 'percentual'
}

function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Number.POSITIVE_INFINITY
  if ((lat1 === 0 && lon1 === 0) || (lat2 === 0 && lon2 === 0)) return Number.POSITIVE_INFINITY
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function numeroOuNull(valor: any) {
  const numero = Number(valor)
  if (!Number.isFinite(numero) || numero === 0) return null
  return numero
}

function normalizarTexto(valor: any) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function lerLista(valor: any) {
  if (Array.isArray(valor)) return valor
  if (!valor) return []
  try {
    const lista = JSON.parse(valor)
    return Array.isArray(lista) ? lista : []
  } catch {
    return String(valor).split(',').map(item => item.trim()).filter(Boolean)
  }
}

function lojaRecebePedidosAgora(restaurante: any) {
  if (String(restaurante?.status || '').toLowerCase() !== 'ativo') return false
  if (!restaurante?.horario_abertura || !restaurante?.horario_fechamento) return true

  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const valorParte = (tipo: string) => partes.find(parte => parte.type === tipo)?.value || ''
  const diaAtual = normalizarTexto(valorParte('weekday'))
  const diasAbertos = lerLista(restaurante.dias_aberto).map(normalizarTexto)
  if (diasAbertos.length && !diasAbertos.some((dia: string) => dia.startsWith(diaAtual) || diaAtual.startsWith(dia))) {
    return false
  }

  const paraMinutos = (horario: any) => {
    const [hora, minuto] = String(horario).split(':').map(Number)
    return hora * 60 + minuto
  }
  const minutosAgora = Number(valorParte('hour')) * 60 + Number(valorParte('minute'))
  const abertura = paraMinutos(restaurante.horario_abertura)
  const fechamento = paraMinutos(restaurante.horario_fechamento)
  if (![minutosAgora, abertura, fechamento].every(Number.isFinite)) return true
  if (fechamento < abertura) return minutosAgora >= abertura || minutosAgora <= fechamento
  return minutosAgora >= abertura && minutosAgora <= fechamento
}

function ehOperador(req: AuthRequest) {
  return String(req.userRole || '').toLowerCase() === 'operador'
}

async function restauranteDoUsuario(req: AuthRequest) {
  if (!['gerente', 'restaurante'].includes(String(req.userRole || '').toLowerCase())) return null
  return buscarRestauranteDoUsuario(req.userId, req.userEmail, req.userName)
}

async function entregadorDoUsuario(req: AuthRequest) {
  if (String(req.userRole || '').toLowerCase() !== 'entregador') return null
  const result = await db.execute({
    sql: `SELECT id FROM entregadores
          WHERE id = ? OR user_id = ? OR (email != '' AND lower(email) = ?)
          ORDER BY created_at DESC LIMIT 1`,
    args: [req.userId, req.userId, String(req.userEmail || '').toLowerCase()]
  })
  return result.rows[0] as any
}

async function podeAcessarPedido(req: AuthRequest, pedido: any) {
  if (ehOperador(req)) return true
  const role = String(req.userRole || '').toLowerCase()
  const userId = String(req.userId || '')
  if (role === 'cliente') return String(pedido.cliente_id || '') === userId
  if (role === 'entregador') {
    const ent = await entregadorDoUsuario(req)
    return Boolean(ent?.id && String(pedido.entregador_id || '') === String(ent.id))
  }
  if (['gerente', 'restaurante'].includes(role)) {
    const rest = await restauranteDoUsuario(req)
    return Boolean(rest?.id && String(rest.id) === String(pedido.restaurante_id || ''))
  }
  return false
}

function deveProcessarComStripe(formaPagamento: string): boolean {
  return ['stripe', 'cartao_online', 'credito_online', 'debito_online'].includes(
    String(formaPagamento || '').toLowerCase()
  )
}

function chaveStripeValida(chave?: string): boolean {
  return /^sk_(test|live)_[A-Za-z0-9]+/.test(String(chave || '').trim())
}

function calcularGanhoEntregador(taxaEntrega: number, total: number, distanciaKm: number) {
  if (Number.isFinite(taxaEntrega) && taxaEntrega > 0) return Number(taxaEntrega.toFixed(2))
  if (Number.isFinite(distanciaKm)) {
    const porDistancia = distanciaKm > 5 ? 12 : distanciaKm > 3 ? 8 : 5
    return Number(porDistancia.toFixed(2))
  }
  return Number(Math.max(5, total * 0.12).toFixed(2))
}

async function expirarOfertas(tx: any) {
  await tx.execute({
    sql: `UPDATE ofertas_entrega
          SET status = 'expirada', respondida_em = CURRENT_TIMESTAMP
          WHERE status = 'ofertada' AND expira_em <= CURRENT_TIMESTAMP`,
    args: []
  })
  await tx.execute({
    sql: `UPDATE pedidos
          SET oferta_entregador_id = NULL,
              oferta_enviada_em = NULL,
              oferta_expira_em = NULL
          WHERE oferta_expira_em IS NOT NULL
            AND oferta_expira_em <= CURRENT_TIMESTAMP
            AND (entregador_id IS NULL OR entregador_id = '')`,
    args: []
  })
}

async function buscarOfertaCompleta(tx: any, pedidoId: string, entregadorId: string) {
  const result = await tx.execute({
    sql: `SELECT p.*,
                 r.nome AS restaurante_nome,
                 r.endereco AS restaurante_endereco,
                 r.latitude AS restaurante_latitude,
                 r.longitude AS restaurante_longitude,
                 e.latitude AS entregador_latitude,
                 e.longitude AS entregador_longitude,
                 c.nome AS cliente_nome,
                 c.telefone AS cliente_telefone,
                 UNIX_TIMESTAMP(p.oferta_expira_em) * 1000 AS oferta_expira_em_epoch,
                 UNIX_TIMESTAMP(CURRENT_TIMESTAMP) * 1000 AS servidor_agora_epoch
          FROM pedidos p
          LEFT JOIN restaurantes r ON r.id = p.restaurante_id
          LEFT JOIN entregadores e ON e.id = ?
          LEFT JOIN clientes c ON c.id = p.cliente_id
          WHERE p.id = ?
            AND p.oferta_entregador_id = ?
            AND p.oferta_expira_em > CURRENT_TIMESTAMP
          LIMIT 1`,
    args: [entregadorId, pedidoId, entregadorId]
  })
  const pedido = result.rows[0] as any
  if (!pedido) return null
  const ateRestaurante = calcularDistancia(
    Number(pedido.entregador_latitude),
    Number(pedido.entregador_longitude),
    Number(pedido.restaurante_latitude),
    Number(pedido.restaurante_longitude)
  )
  const ateCliente = calcularDistancia(
    Number(pedido.restaurante_latitude),
    Number(pedido.restaurante_longitude),
    Number(pedido.latitude_entrega),
    Number(pedido.longitude_entrega)
  )
  const distanciaCalculada = [ateRestaurante, ateCliente].filter(Number.isFinite).reduce((total, valor) => total + valor, 0)
  const distancia = distanciaCalculada > 0 ? distanciaCalculada : Number(pedido.distancia_km)
  const ganho = Number(pedido.ganho_entregador || 0) ||
    calcularGanhoEntregador(Number(pedido.taxa_entrega || 0), Number(pedido.total || 0), distancia)
  return {
    ...pedido,
    ganho_entregador: ganho,
    distancia_oferta_km: Number.isFinite(distancia) ? Number(distancia.toFixed(2)) : null,
    tempo_oferta_minutos: Number.isFinite(distancia) ? Math.max(8, Math.ceil(distancia * 3)) : null,
    oferta_expira_em_epoch: Number(pedido.oferta_expira_em_epoch || 0),
    servidor_agora_epoch: Number(pedido.servidor_agora_epoch || 0),
  }
}

async function calcularDescontoDoCupom(codigoInformado: any, subtotal: number, taxaEntrega: number) {
  const codigo = String(codigoInformado || '').trim().toUpperCase()
  if (!codigo) return 0

  const dbCupom = await db.execute({
    sql: 'SELECT * FROM cupons WHERE codigo = ? AND ativo = 1',
    args: [codigo],
  }).catch(() => null)

  const cupomDb = dbCupom?.rows?.[0] as any
  const cupom = cupomDb
    ? {
        desconto: Number(cupomDb.desconto || 0),
        tipo: normalizarTipoCupom(cupomDb.tipo),
        minimo: Number(cupomDb.minimo || 0),
        data_expiracao: cupomDb.data_expiracao || null,
      }
    : CUPONS_ESTATICOS[codigo]

  if (!cupom) throw new Error('Cupom inválido')
  if (subtotal < Number(cupom.minimo || 0)) throw new Error(`Valor mínimo do cupom é R$ ${Number(cupom.minimo || 0).toFixed(2)}`)
  if (cupom.data_expiracao && new Date(cupom.data_expiracao).getTime() < Date.now()) throw new Error('Cupom expirado')

  let desconto = 0
  if (cupom.tipo === 'percentual') desconto = subtotal * (Number(cupom.desconto || 0) / 100)
  if (cupom.tipo === 'fixo') desconto = Number(cupom.desconto || 0)
  if (cupom.tipo === 'frete_gratis') desconto = Number(taxaEntrega || 0)
  return Number(Math.max(0, Math.min(desconto, subtotal + taxaEntrega)).toFixed(2))
}

async function validarCupomNaoUsado(clienteId: any, codigoInformado: any) {
  const codigo = String(codigoInformado || '').trim().toUpperCase()
  const id = String(clienteId || '').trim()
  if (!codigo || !id) return

  const uso = await db.execute({
    sql: 'SELECT id FROM cupom_usos WHERE cliente_id = ? AND cupom_codigo = ? LIMIT 1',
    args: [id, codigo],
  }).catch(() => null)
  if (uso?.rows?.length) throw new Error('Você já usou este cupom.')
}

async function registrarUsoCupom(clienteId: any, codigoInformado: any, pedidoId: string) {
  const codigo = String(codigoInformado || '').trim().toUpperCase()
  const idCliente = String(clienteId || '').trim()
  if (!codigo || !idCliente || !pedidoId) return

  await db.execute({
    sql: `INSERT INTO cupom_usos (id, cupom_codigo, cliente_id, pedido_id)
          VALUES (?, ?, ?, ?)`,
    args: [`cupom_uso_${crypto.randomUUID().slice(0, 16)}`, codigo, idCliente, pedidoId],
  }).catch((error) => {
    if (String(error?.message || '').toLowerCase().includes('duplicate')) throw new Error('Você já usou este cupom.')
    throw error
  })
}

// GET /api/pedidos
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, clienteId, entregadorId } = req.query
    let { restauranteId } = req.query

    const role = String(req.userRole || '').toLowerCase()
    if (!restauranteId && ['gerente', 'restaurante'].includes(role)) {
      const restaurante = await buscarRestauranteDoUsuario(req.userId, req.userEmail, req.userName)
      if (!restaurante?.id) return res.json([]) as any
      restauranteId = restaurante.id
    }

    let sql = `SELECT p.*,
                      r.nome as restaurante_nome,
                      r.endereco as restaurante_endereco,
                      r.latitude as restaurante_latitude,
                      r.longitude as restaurante_longitude,
                      c.nome as cliente_nome,
                      c.telefone as cliente_telefone
               FROM pedidos p
               LEFT JOIN restaurantes r ON r.id = p.restaurante_id
               LEFT JOIN clientes c ON c.id = p.cliente_id
               WHERE 1=1`
    const args: any[] = []
    if (role === 'cliente') {
      sql += ' AND p.cliente_id = ?'; args.push(req.userId)
    } else if (clienteId && ehOperador(req)) {
      sql += ' AND p.cliente_id = ?'; args.push(clienteId)
    }
    if (status) { sql += ' AND p.status = ?'; args.push(status) }
    if (restauranteId) { sql += ' AND p.restaurante_id = ?'; args.push(restauranteId) }
    if (role === 'entregador') {
      const ent = await entregadorDoUsuario(req)
      if (!ent?.id) return res.json([]) as any
      sql += ' AND p.entregador_id = ?'; args.push(ent.id)
    } else if (entregadorId) {
      if (!ehOperador(req) && !['gerente', 'restaurante'].includes(role)) return res.status(403).json({ erro: 'Você não pode filtrar por entregador' }) as any
      sql += ' AND p.entregador_id = ?'; args.push(entregadorId)
    }
    sql += ' ORDER BY p.created_at DESC LIMIT 100'
    const result = await db.execute({ sql, args })
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao listar pedidos' })
  }
})


// POST /api/pedidos/oferta/solicitar — reserva uma corrida para um único entregador
router.post('/oferta/solicitar', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (String(req.userRole || '').toLowerCase() !== 'entregador') {
      return res.status(403).json({ erro: 'Apenas entregadores podem receber ofertas' }) as any
    }
    const vinculado = await entregadorDoUsuario(req)
    if (!vinculado?.id) return res.status(404).json({ erro: 'Entregador não encontrado' }) as any

    await expirarOfertas(db)
    const oferta = await db.transaction(async (tx: any) => {
      const entregadorResult = await tx.execute({
        sql: `SELECT *,
                     ultima_atualizacao >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 MINUTE) AS localizacao_recente
              FROM entregadores
              WHERE id = ?
              FOR UPDATE`,
        args: [vinculado.id]
      })
      const entregador = entregadorResult.rows[0] as any
      if (!entregador || entregador.status !== 'disponivel') return null
      if (!entregador.localizacao_recente ||
          !Number.isFinite(Number(entregador.latitude)) ||
          !Number.isFinite(Number(entregador.longitude)) ||
          (Number(entregador.latitude) === 0 && Number(entregador.longitude) === 0)) {
        return null
      }

      const entregaAtiva = await tx.execute({
        sql: `SELECT id FROM pedidos
              WHERE entregador_id = ? AND status = 'entregando'
              LIMIT 1`,
        args: [entregador.id]
      })
      if (entregaAtiva.rows.length) return null

      const ofertaAtual = await tx.execute({
        sql: `SELECT id FROM pedidos
              WHERE oferta_entregador_id = ?
                AND oferta_expira_em > CURRENT_TIMESTAMP
                AND (entregador_id IS NULL OR entregador_id = '')
                AND status = 'pronto'
              LIMIT 1 FOR UPDATE`,
        args: [entregador.id]
      })
      if (ofertaAtual.rows.length) {
        return buscarOfertaCompleta(tx, String((ofertaAtual.rows[0] as any).id), String(entregador.id))
      }

      const candidatos = await tx.execute({
        sql: `SELECT p.id, p.created_at,
                     r.latitude AS restaurante_latitude,
                     r.longitude AS restaurante_longitude
              FROM pedidos p
              LEFT JOIN restaurantes r ON r.id = p.restaurante_id
              WHERE (p.entregador_id IS NULL OR p.entregador_id = '')
                AND p.status = 'pronto'
                AND (p.oferta_entregador_id IS NULL OR p.oferta_expira_em <= CURRENT_TIMESTAMP)
                AND NOT EXISTS (
                  SELECT 1 FROM ofertas_entrega oe
                  WHERE oe.pedido_id = p.id
                    AND oe.entregador_id = ?
                    AND (
                      oe.status IN ('ofertada', 'aceita')
                      OR COALESCE(oe.respondida_em, oe.created_at) > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)
                    )
                )
              ORDER BY p.created_at ASC
              LIMIT 30`,
        args: [entregador.id]
      })

      const latitude = Number(entregador.latitude)
      const longitude = Number(entregador.longitude)
      const ordenados = (candidatos.rows as any[])
        .map(pedido => ({
          ...pedido,
          distanciaOferta: calcularDistancia(
            latitude,
            longitude,
            Number(pedido.restaurante_latitude),
            Number(pedido.restaurante_longitude)
          )
        }))
        .sort((a, b) => {
          const distanciaA = Number.isFinite(a.distanciaOferta) ? a.distanciaOferta : Number.POSITIVE_INFINITY
          const distanciaB = Number.isFinite(b.distanciaOferta) ? b.distanciaOferta : Number.POSITIVE_INFINITY
          if (distanciaA !== distanciaB) return distanciaA - distanciaB
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })

      for (const candidato of ordenados) {
        const bloqueado = await tx.execute({
          sql: `SELECT id FROM pedidos
                WHERE id = ?
                  AND (entregador_id IS NULL OR entregador_id = '')
                  AND status = 'pronto'
                  AND (oferta_entregador_id IS NULL OR oferta_expira_em <= CURRENT_TIMESTAMP)
                FOR UPDATE`,
          args: [candidato.id]
        })
        if (!bloqueado.rows.length) continue

        const ofertaId = `ofe_${crypto.randomUUID().slice(0, 16)}`
        await tx.execute({
          sql: `INSERT INTO ofertas_entrega
                  (id, pedido_id, entregador_id, status, expira_em)
                VALUES (?, ?, ?, 'ofertada', DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 SECOND))
                ON DUPLICATE KEY UPDATE
                  id = VALUES(id),
                  status = 'ofertada',
                  expira_em = VALUES(expira_em),
                  respondida_em = NULL,
                  created_at = CURRENT_TIMESTAMP`,
          args: [ofertaId, candidato.id, entregador.id]
        })
        await tx.execute({
          sql: `UPDATE pedidos
                SET oferta_entregador_id = ?,
                    oferta_enviada_em = CURRENT_TIMESTAMP,
                    oferta_expira_em = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 SECOND)
                WHERE id = ?`,
          args: [entregador.id, candidato.id]
        })
        return buscarOfertaCompleta(tx, String(candidato.id), String(entregador.id))
      }

      return null
    })

    res.json({ oferta })
  } catch (error) {
    console.error('Erro ao despachar oferta:', error)
    res.status(500).json({ erro: 'Erro ao buscar nova oferta' })
  }
})

// POST /api/pedidos/oferta/:id/aceitar
router.post('/oferta/:id/aceitar', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (String(req.userRole || '').toLowerCase() !== 'entregador') {
      return res.status(403).json({ erro: 'Apenas entregadores podem aceitar ofertas' }) as any
    }
    const vinculado = await entregadorDoUsuario(req)
    if (!vinculado?.id) return res.status(404).json({ erro: 'Entregador não encontrado' }) as any

    await expirarOfertas(db)
    const pedidoAceito = await db.transaction(async (tx: any) => {
      const entregadorResult = await tx.execute({
        sql: 'SELECT * FROM entregadores WHERE id = ? FOR UPDATE',
        args: [vinculado.id]
      })
      const entregador = entregadorResult.rows[0] as any
      if (!entregador || entregador.status !== 'disponivel') {
        const erro: any = new Error('Entregador não está disponível')
        erro.status = 409
        throw erro
      }

      const pedidoResult = await tx.execute({
        sql: `SELECT p.*, r.latitude AS restaurante_latitude, r.longitude AS restaurante_longitude
              FROM pedidos p
              LEFT JOIN restaurantes r ON r.id = p.restaurante_id
              WHERE p.id = ?
                AND p.oferta_entregador_id = ?
                AND p.oferta_expira_em > CURRENT_TIMESTAMP
                AND p.status = 'pronto'
              FOR UPDATE`,
        args: [req.params.id, entregador.id]
      })
      const pedido = pedidoResult.rows[0] as any
      if (!pedido ||
          String(pedido.oferta_entregador_id || '') !== String(entregador.id) ||
          !pedido.oferta_expira_em ||
          pedido.entregador_id) {
        const erro: any = new Error('A oferta expirou ou já foi enviada para outro entregador')
        erro.status = 409
        throw erro
      }

      const distancia = Number(pedido.distancia_km)
      const tempoEstimado = Number(pedido.tempo_entrega_estimado || 0) ||
        (Number.isFinite(distancia) ? Math.max(8, Math.ceil(distancia * 3)) : null)
      const ganho = Number(pedido.ganho_entregador || 0) ||
        calcularGanhoEntregador(Number(pedido.taxa_entrega || 0), Number(pedido.total || 0), distancia)
      await tx.execute({
        sql: `UPDATE pedidos
              SET entregador_id = ?,
                  status = 'entregando',
                  ganho_entregador = ?,
                  tempo_entrega_estimado = ?,
                  oferta_entregador_id = NULL,
                  oferta_enviada_em = NULL,
                  oferta_expira_em = NULL
              WHERE id = ?`,
        args: [entregador.id, ganho, tempoEstimado, pedido.id]
      })
      await tx.execute({
        sql: `UPDATE ofertas_entrega
              SET status = 'aceita', respondida_em = CURRENT_TIMESTAMP
              WHERE pedido_id = ? AND entregador_id = ? AND status = 'ofertada'`,
        args: [pedido.id, entregador.id]
      })
      await tx.execute({
        sql: "UPDATE entregadores SET status = 'ocupado', ultima_atualizacao = CURRENT_TIMESTAMP WHERE id = ?",
        args: [entregador.id]
      })

      const rotaExistente = await tx.execute({
        sql: 'SELECT id FROM rotas WHERE pedido_id = ? LIMIT 1',
        args: [pedido.id]
      })
      if (!rotaExistente.rows.length) {
        await tx.execute({
          sql: `INSERT INTO rotas
                  (id, pedido_id, entregador_id, origem_lat, origem_lng, destino_lat, destino_lng, distancia_km)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `rota_${crypto.randomUUID().slice(0, 12)}`,
            pedido.id,
            entregador.id,
            Number(pedido.restaurante_latitude || 0),
            Number(pedido.restaurante_longitude || 0),
            Number(pedido.latitude_entrega || 0),
            Number(pedido.longitude_entrega || 0),
            Number.isFinite(distancia) ? distancia : null,
          ]
        })
      }
      return pedido.id
    })

    const atualizado = await db.execute({
      sql: `SELECT p.*,
                   r.nome AS restaurante_nome,
                   r.endereco AS restaurante_endereco,
                   r.latitude AS restaurante_latitude,
                   r.longitude AS restaurante_longitude,
                   c.nome AS cliente_nome,
                   c.telefone AS cliente_telefone
            FROM pedidos p
            LEFT JOIN restaurantes r ON r.id = p.restaurante_id
            LEFT JOIN clientes c ON c.id = p.cliente_id
            WHERE p.id = ?`,
      args: [pedidoAceito]
    })
    res.json({ pedido: atualizado.rows[0] })
  } catch (error: any) {
    console.error('Erro ao aceitar oferta:', error)
    res.status(error.status || 500).json({ erro: error.message || 'Erro ao aceitar oferta' })
  }
})

// POST /api/pedidos/oferta/:id/recusar
router.post('/oferta/:id/recusar', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (String(req.userRole || '').toLowerCase() !== 'entregador') {
      return res.status(403).json({ erro: 'Apenas entregadores podem recusar ofertas' }) as any
    }
    const vinculado = await entregadorDoUsuario(req)
    if (!vinculado?.id) return res.status(404).json({ erro: 'Entregador não encontrado' }) as any

    await db.transaction(async (tx: any) => {
      const pedidoResult = await tx.execute({
        sql: 'SELECT * FROM pedidos WHERE id = ? FOR UPDATE',
        args: [req.params.id]
      })
      const pedido = pedidoResult.rows[0] as any
      if (!pedido || String(pedido.oferta_entregador_id || '') !== String(vinculado.id)) return

      await tx.execute({
        sql: `UPDATE ofertas_entrega
              SET status = 'recusada', respondida_em = CURRENT_TIMESTAMP
              WHERE pedido_id = ? AND entregador_id = ? AND status = 'ofertada'`,
        args: [pedido.id, vinculado.id]
      })
      await tx.execute({
        sql: `UPDATE pedidos
              SET oferta_entregador_id = NULL,
                  oferta_enviada_em = NULL,
                  oferta_expira_em = NULL
              WHERE id = ? AND oferta_entregador_id = ?`,
        args: [pedido.id, vinculado.id]
      })
    })

    res.json({ recusada: true })
  } catch (error) {
    console.error('Erro ao recusar oferta:', error)
    res.status(500).json({ erro: 'Erro ao recusar oferta' })
  }
})

// Rota legada mantida apenas para operadores; entregadores recebem uma oferta exclusiva.
router.get('/disponiveis', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!ehOperador(req)) {
      return res.status(403).json({ erro: 'Pedidos são distribuídos individualmente pelo despacho automático' }) as any
    }
    const result = await db.execute({
      sql: `SELECT p.*, r.nome as restaurante_nome, r.endereco as restaurante_endereco,
                   r.latitude as restaurante_latitude, r.longitude as restaurante_longitude,
                   c.nome as cliente_nome,
                   c.telefone as cliente_telefone
            FROM pedidos p
            LEFT JOIN restaurantes r ON r.id = p.restaurante_id
            LEFT JOIN clientes c ON c.id = p.cliente_id
            WHERE (p.entregador_id IS NULL OR p.entregador_id = '')
              AND p.status IN ('pendente', 'preparando', 'pronto')
            ORDER BY p.created_at ASC
            LIMIT 30`,
      args: []
    })
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao listar pedidos disponíveis' })
  }
})

// GET /api/pedidos/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: `SELECT p.*,
                   r.nome as restaurante_nome,
                   r.endereco as restaurante_endereco,
                   c.nome as cliente_nome,
                   c.telefone as cliente_telefone,
                   e.nome as entregador_nome,
                   e.telefone as entregador_telefone
            FROM pedidos p
            LEFT JOIN restaurantes r ON r.id = p.restaurante_id
            LEFT JOIN clientes c ON c.id = p.cliente_id
            LEFT JOIN entregadores e ON e.id = p.entregador_id
            WHERE p.id = ?`,
      args: [req.params.id]
    })
    if (!result.rows.length) return res.status(404).json({ erro: 'Pedido não encontrado' }) as any
    if (!(await podeAcessarPedido(req, result.rows[0]))) return res.status(403).json({ erro: 'Você não pode acessar este pedido' }) as any
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar pedido' })
  }
})

// POST /api/pedidos
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      clienteId,
      restauranteId,
      itens,
      endereco_entrega,
      latitude,
      longitude,
      forma_pagamento = 'cartao',
      taxa_entrega: taxaEntregaInformada,
      desconto: descontoInformado,
      cupom_codigo,
      troco: trocoInformado = 0,
    } = req.body
    const role = String(req.userRole || '').toLowerCase()
    const clienteFinal = role === 'cliente' ? req.userId : clienteId
    if (role !== 'cliente' && !ehOperador(req)) return res.status(403).json({ erro: 'Apenas clientes podem criar pedidos' }) as any
    if (!clienteFinal || !restauranteId || !itens?.length) return res.status(400).json({ erro: 'Dados obrigatórios faltando' }) as any
    if (!String(endereco_entrega || '').trim()) {
      return res.status(400).json({ erro: 'Endereço de entrega é obrigatório' }) as any
    }

    const restaurante = await db.execute({ sql: 'SELECT * FROM restaurantes WHERE id = ?', args: [restauranteId] })
    if (!restaurante.rows.length) return res.status(404).json({ erro: 'Restaurante não encontrado' }) as any
    if (!lojaRecebePedidosAgora(restaurante.rows[0])) {
      return res.status(409).json({ erro: 'Esta loja está fechada e não pode receber pedidos agora.' }) as any
    }

    let subtotal = 0
    const restaurantesDosItens = new Set<string>()
    for (const item of itens) {
      const cardapioId = item.cardapioId || item.produtoId || item.cardapio_id || item.id
      if (!cardapioId) return res.status(400).json({ erro: 'Há um item inválido no carrinho.' }) as any
      const cardapioItem = await db.execute({
        sql: 'SELECT preco, restaurante_id FROM cardapio WHERE id = ? AND COALESCE(disponivel, 1) = 1',
        args: [cardapioId]
      })
      if (!cardapioItem.rows.length) {
        return res.status(409).json({ erro: 'Um item do carrinho não está mais disponível. Atualize o carrinho e tente novamente.' }) as any
      }
      const row = cardapioItem.rows[0] as any
      const quantidade = Number(item.quantidade)
      if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 99) {
        return res.status(400).json({ erro: 'Quantidade inválida em um item do pedido.' }) as any
      }
      restaurantesDosItens.add(String(row.restaurante_id))
      subtotal += Number(row.preco) * quantidade
    }
    if (restaurantesDosItens.size > 1 || (restaurantesDosItens.size === 1 && !restaurantesDosItens.has(String(restauranteId)))) {
      return res.status(400).json({ erro: 'O pedido só pode conter itens de um restaurante.' }) as any
    }

    const dist = calcularDistancia(
      Number(restaurante.rows[0].latitude), Number(restaurante.rows[0].longitude),
      Number(latitude || 0), Number(longitude || 0)
    )
    const taxaCalculada = subtotal >= 50 ? 0 : 5.99
    const taxaInformada = Number(taxaEntregaInformada)
    const taxa_entrega = ehOperador(req) && Number.isFinite(taxaInformada) && taxaInformada >= 0
      ? Number(taxaInformada.toFixed(2))
      : taxaCalculada
    const descontoSolicitado = Number(descontoInformado || 0)
    let desconto = 0
    try {
      await validarCupomNaoUsado(clienteFinal, cupom_codigo)
      desconto = await calcularDescontoDoCupom(cupom_codigo, subtotal, taxa_entrega)
    } catch (cupomErro: any) {
      return res.status(400).json({ erro: cupomErro.message || 'Cupom inválido' }) as any
    }
    if (ehOperador(req) && !cupom_codigo && Number.isFinite(descontoSolicitado)) {
      desconto = Math.max(0, Math.min(descontoSolicitado, subtotal + taxa_entrega))
    }
    const total = Number(Math.max(0, subtotal + taxa_entrega - desconto).toFixed(2))
    const ganho_entregador = calcularGanhoEntregador(taxa_entrega, total, dist)

    const trocoSolicitado = Number(trocoInformado || 0)
    const troco = Number.isFinite(trocoSolicitado) && trocoSolicitado > 0 ? trocoSolicitado : 0
    if (String(forma_pagamento).toLowerCase() === 'dinheiro' && troco > 0 && troco < total) {
      return res.status(400).json({ erro: 'O valor do troco deve ser maior ou igual ao valor total do pedido.' }) as any
    }

    let pagamento_id = null
    let clientSecret = null

    if (deveProcessarComStripe(forma_pagamento)) {
      if (chaveStripeValida(process.env.STRIPE_SECRET_KEY)) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())
        const intent = await stripe.paymentIntents.create({
          amount: Math.round(total * 100),
          currency: 'brl',
          description: `Pedido - ${restaurante.rows[0].nome}`
        })
        pagamento_id = intent.id
        clientSecret = intent.client_secret
      } else {
        console.warn('Stripe ignorado: STRIPE_SECRET_KEY ausente ou inválida para pagamento online.')
      }
    }

    const pedidoId = `ped_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`
    await db.execute({
      sql: `INSERT INTO pedidos
            (id, cliente_id, restaurante_id, status, itens, endereco_entrega, latitude_entrega, longitude_entrega,
             subtotal, taxa_entrega, desconto, troco, total, forma_pagamento, pagamento_id, pagamento_status,
             ganho_entregador, repasse_entregador_status)
            VALUES (?, ?, ?, 'pendente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, 'pendente')`,
      args: [pedidoId, clienteFinal, restauranteId, JSON.stringify(itens), endereco_entrega || '', latitude || 0, longitude || 0,
             subtotal, taxa_entrega, desconto, troco, total, forma_pagamento, pagamento_id, ganho_entregador]
    })
    if (cupom_codigo && desconto > 0) {
      await registrarUsoCupom(clienteFinal, cupom_codigo, pedidoId)
    }

    res.status(201).json({ mensagem: 'Pedido criado com sucesso', id: pedidoId, clientSecret, subtotal, taxa_entrega, desconto, total, ganho_entregador })
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao criar pedido' })
  }
})

// PUT /api/pedidos/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, tempo_preparo_estimado } = req.body
    const pedidoAntes = await db.execute({
      sql: 'SELECT status, entregador_id, cliente_id, restaurante_id, ganho_entregador, taxa_entrega, total, distancia_km, repasse_entregador_status FROM pedidos WHERE id = ?',
      args: [req.params.id]
    })
    if (!pedidoAntes.rows.length) return res.status(404).json({ erro: 'Pedido não encontrado' }) as any
    if (!(await podeAcessarPedido(req, pedidoAntes.rows[0]))) return res.status(403).json({ erro: 'Você não pode alterar este pedido' }) as any
    const role = String(req.userRole || '').toLowerCase()
    const statusPermitidosCliente = ['cancelado']
    const statusPermitidosEntregador = ['entregando', 'entregue']
    const statusPermitidosGerente = ['confirmado', 'preparando', 'pronto', 'cancelado']
    if (status && !ehOperador(req)) {
      const permitidos = role === 'cliente'
        ? statusPermitidosCliente
        : role === 'entregador'
          ? statusPermitidosEntregador
          : statusPermitidosGerente
      if (!permitidos.includes(String(status))) return res.status(403).json({ erro: 'Status não permitido para este perfil' }) as any
    }
    const statusAnterior = (pedidoAntes.rows[0] as any)?.status
    let ganhoCreditado = 0
    const sets: string[] = ['updated_at = current_timestamp']
    const args: any[] = []
    if (status) {
      sets.push('status = ?'); args.push(status)
      if (status === 'confirmado') sets.push('confirmado_em = COALESCE(confirmado_em, CURRENT_TIMESTAMP)')
      if (status === 'pronto') sets.push('pronto_em = COALESCE(pronto_em, CURRENT_TIMESTAMP)')
      if (status === 'entregue') sets.push('entregue_em = COALESCE(entregue_em, CURRENT_TIMESTAMP)')
      if (status === 'cancelado') sets.push('cancelado_em = COALESCE(cancelado_em, CURRENT_TIMESTAMP)')
    }
    if (tempo_preparo_estimado !== undefined) { sets.push('tempo_preparo_estimado = ?'); args.push(tempo_preparo_estimado) }
    args.push(req.params.id)
    await db.execute({ sql: `UPDATE pedidos SET ${sets.join(', ')} WHERE id = ?`, args })
    if (status === 'entregue' && statusAnterior !== 'entregue') {
      const pedido = pedidoAntes.rows[0] as any
      const entregadorId = pedido?.entregador_id
      const jaCreditado = String(pedido?.repasse_entregador_status || '').toLowerCase() === 'pago'
      if (entregadorId && !jaCreditado) {
        const ganho = Number(pedido.ganho_entregador || 0) > 0
          ? Number(pedido.ganho_entregador)
          : calcularGanhoEntregador(Number(pedido.taxa_entrega || 0), Number(pedido.total || 0), Number(pedido.distancia_km))
        ganhoCreditado = ganho
        await db.execute({
          sql: `UPDATE entregadores
                SET total_entregas = COALESCE(total_entregas, 0) + 1,
                    saldo_disponivel = COALESCE(saldo_disponivel, 0) + ?,
                    saldo_total = COALESCE(saldo_total, 0) + ?,
                    status = 'disponivel',
                    ultima_atualizacao = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [ganho, ganho, entregadorId]
        })
        await db.execute({
          sql: `UPDATE pedidos
                SET ganho_entregador = ?,
                    repasse_entregador_status = 'pago',
                    repasse_entregador_em = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [ganho, req.params.id]
        })
      }
    }
    res.json({ mensagem: 'Pedido atualizado com sucesso', ganho_entregador_creditado: ganhoCreditado })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar pedido' })
  }
})

// DELETE /api/pedidos/:id — cancelar
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const pedido = await db.execute({ sql: 'SELECT created_at, total, cliente_id, restaurante_id, entregador_id FROM pedidos WHERE id = ?', args: [req.params.id] })
    if (!pedido.rows.length) return res.status(404).json({ erro: 'Pedido não encontrado' }) as any
    if (!(await podeAcessarPedido(req, pedido.rows[0]))) return res.status(403).json({ erro: 'Você não pode cancelar este pedido' }) as any
    const tempoDecorrido = (Date.now() - new Date(String(pedido.rows[0].created_at).replace(' ', 'T') + 'Z').getTime()) / 60000
    await db.execute({ sql: "UPDATE pedidos SET status = 'cancelado' WHERE id = ?", args: [req.params.id] })
    const multa = tempoDecorrido > 5 ? Number(pedido.rows[0].total) * 0.5 : 0
    res.json({ mensagem: 'Pedido cancelado', multa })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao cancelar pedido' })
  }
})

// POST /api/pedidos/:id/coletar — registra a retirada sem perder o status de entrega ativa
router.post('/:id/coletar', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (String(req.userRole || '').toLowerCase() !== 'entregador') {
      return res.status(403).json({ erro: 'Apenas o entregador pode confirmar a retirada' }) as any
    }
    const entregador = await entregadorDoUsuario(req)
    if (!entregador?.id) return res.status(404).json({ erro: 'Entregador não encontrado' }) as any

    const atualizado = await db.execute({
      sql: `UPDATE pedidos
            SET coletado_em = COALESCE(coletado_em, CURRENT_TIMESTAMP),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND entregador_id = ?
              AND status = 'entregando'`,
      args: [req.params.id, entregador.id]
    })
    if (!atualizado.rowsAffected) {
      return res.status(409).json({ erro: 'Este pedido não está disponível para retirada' }) as any
    }
    res.json({ coletado: true })
  } catch (error) {
    console.error('Erro ao confirmar retirada:', error)
    res.status(500).json({ erro: 'Erro ao confirmar retirada' })
  }
})

// GET /api/pedidos/:id/rastrear
router.get('/:id/rastrear', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: `SELECT p.*,
              r.nome as restaurante_nome, r.endereco as restaurante_endereco,
              r.latitude as rest_lat, r.longitude as rest_lng,
              e.nome as entregador_nome, e.telefone as entregador_telefone, e.latitude as entregador_lat, e.longitude as entregador_lng,
              c.nome as cliente_nome, c.telefone as cliente_telefone
            FROM pedidos p
            LEFT JOIN restaurantes r ON p.restaurante_id = r.id
            LEFT JOIN entregadores e ON p.entregador_id = e.id
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE p.id = ?`,
      args: [req.params.id]
    })
    if (!result.rows.length) return res.status(404).json({ erro: 'Pedido não encontrado' }) as any
    const p = result.rows[0] as any
    if (!(await podeAcessarPedido(req, p))) return res.status(403).json({ erro: 'Você não pode rastrear este pedido' }) as any
    if (!p.entregador_id) {
      return res.json({
        pedido_id: p.id,
        status: p.status,
        mensagem: 'Aguardando entregador',
        avaliacao_restaurante: p.avaliacao_restaurante,
        avaliacao_entregador: p.avaliacao_entregador,
        restaurante: { id: p.restaurante_id, nome: p.restaurante_nome }
      }) as any
    }

    const coletado = Boolean(p.coletado_em)
    const destinoAtual = coletado
      ? {
          tipo: 'cliente',
          endereco: p.endereco_entrega,
          lat: numeroOuNull(p.latitude_entrega),
          lng: numeroOuNull(p.longitude_entrega),
        }
      : {
          tipo: 'restaurante',
          endereco: p.restaurante_endereco || p.restaurante_nome,
          lat: numeroOuNull(p.rest_lat),
          lng: numeroOuNull(p.rest_lng),
        }
    const dist = calcularDistancia(
      Number(p.entregador_lat),
      Number(p.entregador_lng),
      Number(destinoAtual.lat),
      Number(destinoAtual.lng)
    )
    const distanciaValida = Number.isFinite(dist)
    const distanciaTotal = coletado && Number.isFinite(Number(p.distancia_km))
      ? Number(p.distancia_km)
      : null
    const progresso = coletado && distanciaValida && distanciaTotal && distanciaTotal > 0
      ? Math.max(0, Math.min(100, Math.round(((distanciaTotal - dist) / distanciaTotal) * 100)))
      : 0
    res.json({
      pedido_id: p.id,
      status: p.status,
      etapa: coletado ? 'entregando' : 'coletando',
      avaliacao_restaurante: p.avaliacao_restaurante,
      avaliacao_entregador: p.avaliacao_entregador,
      restaurante: { id: p.restaurante_id, nome: p.restaurante_nome, localizacao: { lat: numeroOuNull(p.rest_lat), lng: numeroOuNull(p.rest_lng) } },
      entregador: { id: p.entregador_id, nome: p.entregador_nome, telefone: p.entregador_telefone, localizacao_atual: { lat: numeroOuNull(p.entregador_lat), lng: numeroOuNull(p.entregador_lng) } },
      destino: { endereco: p.endereco_entrega, localizacao: { lat: numeroOuNull(p.latitude_entrega), lng: numeroOuNull(p.longitude_entrega) } },
      rota: {
        destino_atual: destinoAtual,
        distancia_atual_km: distanciaValida ? Math.round(dist * 100) / 100 : null,
        tempo_estimado_minutos: distanciaValida ? Math.ceil((dist / 25) * 60) : null,
        distancia_total_km: distanciaTotal,
        progresso_percentual: progresso
      },
      timeline: { confirmado_em: p.confirmado_em, pronto_em: p.pronto_em, entregue_em: p.entregue_em }
    })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar rastreamento' })
  }
})

// POST /api/pedidos/:id/atribuir-entregador
router.post('/:id/atribuir-entregador', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { entregadorId } = req.body
    if (!ehOperador(req)) return res.status(403).json({ erro: 'Use a oferta exclusiva para aceitar entregas' }) as any
    const entregador = await db.execute({ sql: "SELECT * FROM entregadores WHERE id = ? AND status = 'disponivel'", args: [entregadorId] })
    if (!entregador.rows.length) return res.status(400).json({ erro: 'Entregador não disponível' }) as any

    const atribuido = await db.execute({
      sql: `UPDATE pedidos
            SET entregador_id = ?,
                status = 'entregando',
                oferta_entregador_id = NULL,
                oferta_enviada_em = NULL,
                oferta_expira_em = NULL
            WHERE id = ?
              AND (entregador_id IS NULL OR entregador_id = '')
              AND status IN ('pendente', 'preparando', 'pronto')`,
      args: [entregadorId, req.params.id]
    })
    if (!atribuido.rowsAffected) {
      return res.status(409).json({ erro: 'Esse pedido já foi aceito por outro entregador.' }) as any
    }

    await db.execute({ sql: "UPDATE entregadores SET status = 'ocupado' WHERE id = ?", args: [entregadorId] })
    await db.execute({
      sql: `UPDATE ofertas_entrega
            SET status = 'aceita', respondida_em = CURRENT_TIMESTAMP
            WHERE pedido_id = ? AND entregador_id = ? AND status = 'ofertada'`,
      args: [req.params.id, entregadorId]
    })

    const pedido = await db.execute({ sql: 'SELECT * FROM pedidos WHERE id = ?', args: [req.params.id] })
    const rest = await db.execute({ sql: 'SELECT latitude, longitude FROM restaurantes WHERE id = ?', args: [(pedido.rows[0] as any).restaurante_id] })
    const p = pedido.rows[0] as any
    const r = rest.rows[0] as any

    const rotaId = `rota_${crypto.randomUUID().slice(0, 12)}`
    await db.execute({
      sql: `INSERT INTO rotas (id, pedido_id, entregador_id, origem_lat, origem_lng, destino_lat, destino_lng)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [rotaId, req.params.id, entregadorId, r.latitude, r.longitude, p.latitude_entrega, p.longitude_entrega]
    })
    res.json({ success: true })
  } catch (error) {
    console.error('Erro ao atribuir entregador:', error)
    res.status(500).json({ erro: 'Erro ao atribuir entregador' })
  }
})

// POST /api/pedidos/:id/atribuir-entregador-automatico
router.post('/:id/atribuir-entregador-automatico', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const pedido = await db.execute({
      sql: `SELECT p.*, r.latitude as rest_lat, r.longitude as rest_lng
            FROM pedidos p JOIN restaurantes r ON p.restaurante_id = r.id WHERE p.id = ?`,
      args: [req.params.id]
    })
    if (!pedido.rows.length) return res.status(404).json({ erro: 'Pedido não encontrado' }) as any
    const p = pedido.rows[0] as any
    const role = String(req.userRole || '').toLowerCase()
    if (!ehOperador(req)) {
      if (!['gerente', 'restaurante'].includes(role)) {
        return res.status(403).json({ erro: 'Apenas o restaurante pode solicitar atribuição automática.' }) as any
      }
      const rest = await restauranteDoUsuario(req)
      if (!rest?.id || String(rest.id) !== String(p.restaurante_id)) {
        return res.status(403).json({ erro: 'Você não pode atribuir entregador para este pedido.' }) as any
      }
    }
    if (p.entregador_id) return res.status(400).json({ erro: 'Pedido já tem entregador atribuído' }) as any

    res.json({
      mensagem: 'Pedido enviado ao despacho automático. Um entregador receberá a oferta por vez.',
      aguardando_entregador: true
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao atribuir entregador' })
  }
})

export default router
