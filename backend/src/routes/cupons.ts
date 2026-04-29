import { Router, Response } from 'express'
import { db } from '../lib/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const CUPONS_ESTATICOS: Record<string, { desconto: number; tipo: 'percentual' | 'fixo'; minimo: number }> = {
  'DESC10': { desconto: 10, tipo: 'percentual', minimo: 30 },
  'DESC20': { desconto: 20, tipo: 'percentual', minimo: 50 },
  'DESC5REAIS': { desconto: 5, tipo: 'fixo', minimo: 25 },
  'PRIMEIRA_VEZ': { desconto: 15, tipo: 'percentual', minimo: 0 }
}

// GET /api/cupons — validar cupom
router.get('/', async (req, res: Response) => {
  try {
    const codigo = String(req.query.codigo || '').toUpperCase()
    const total = parseFloat(String(req.query.total || '0'))
    if (!codigo) return res.status(400).json({ erro: 'Código não informado' }) as any

    // Tenta no banco primeiro
    const dbCupom = await db.execute({ sql: 'SELECT * FROM cupons WHERE codigo = ? AND ativo = 1', args: [codigo] }).catch(() => null)
    const cupom = dbCupom?.rows[0] as any || CUPONS_ESTATICOS[codigo]

    if (!cupom) return res.status(400).json({ valido: false, erro: 'Cupom inválido' }) as any

    const minimo = Number(cupom.minimo || 0)
    if (total < minimo) return res.status(400).json({ valido: false, erro: `Valor mínimo é R$ ${minimo.toFixed(2)}` }) as any

    const desconto_valor = cupom.tipo === 'percentual' ? (total * Number(cupom.desconto)) / 100 : Number(cupom.desconto)
    res.json({ valido: true, codigo, desconto: cupom.desconto, tipo: cupom.tipo, desconto_valor: desconto_valor.toFixed(2) })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao validar cupom' })
  }
})

// POST /api/cupons — criar cupom (gerente)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { codigo, desconto, tipo, minimo, data_expiracao } = req.body
    if (!codigo || !desconto || !tipo) return res.status(400).json({ erro: 'Campos obrigatórios faltando' }) as any
    const result = await db.execute({
      sql: 'INSERT INTO cupons (id, codigo, desconto, tipo, minimo, data_expiracao, ativo) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, 1)',
      args: [codigo.toUpperCase(), desconto, tipo, minimo || 0, data_expiracao || null]
    })
    res.status(201).json({ mensagem: 'Cupom criado com sucesso', id: result.lastInsertRowid })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar cupom' })
  }
})

export default router
