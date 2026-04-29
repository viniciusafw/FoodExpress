import { Router, Response } from 'express'
import { db } from '../lib/db'
import { validarCNPJ } from '../lib/validacoes'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/restaurantes — listar com filtros
router.get('/', async (req, res: Response) => {
  try {
    const { categoria, ordenar, limite = '50' } = req.query
    let sql = 'SELECT * FROM restaurantes WHERE status = ?'
    const args: any[] = ['ativo']
    if (categoria) { sql += ' AND categoria = ?'; args.push(categoria) }
    const col = ordenar === 'avaliacao' ? 'avaliacao_media' : 'created_at'
    sql += ` ORDER BY ${col} DESC LIMIT ?`
    args.push(parseInt(limite as string))
    const result = await db.execute({ sql, args })
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao listar restaurantes' })
  }
})

// ── ROTAS FIXAS ANTES DE /:id ─────────────────────────────────────────────────

// POST /api/restaurantes/cadastro — cria registro inicial ao selecionar role
router.post('/cadastro', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!
    const { email, nome } = req.body

    const existente = await db.execute({ sql: 'SELECT id FROM restaurantes WHERE email = ?', args: [email] })
    if (existente.rows.length) return res.json(existente.rows[0]) as any

    const id = `rest_${userId}`
    await db.execute({
      sql: `INSERT INTO restaurantes (id, nome, cnpj, email, telefone, endereco, categoria, latitude, longitude, taxa_comissao, avaliacao_media, status)
            VALUES (?, ?, '00.000.000/0000-00', ?, '', '', 'Geral', 0, 0, 15, 0, 'pendente')`,
      args: [id, nome || 'Meu Restaurante', email || '']
    })
    res.status(201).json({ id, nome, email })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar restaurante' })
  }
})

// GET /api/restaurantes/cadastro — busca restaurante pelo email (sem autenticação obrigatória)
router.get('/cadastro', async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.query
    if (!email) return res.status(400).json({ erro: 'Email obrigatório' }) as any
    const result = await db.execute({ sql: 'SELECT * FROM restaurantes WHERE email = ?', args: [email] })
    if (!result.rows.length) return res.status(404).json({ erro: 'Restaurante não encontrado' }) as any
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar restaurante' })
  }
})

// ── ROTAS COM PARÂMETRO DINÂMICO ──────────────────────────────────────────────

// GET /api/restaurantes/:id — buscar por ID
router.get('/:id', async (req, res: Response) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM restaurantes WHERE id = ?', args: [req.params.id] })
    if (!result.rows.length) return res.status(404).json({ erro: 'Restaurante não encontrado' }) as any
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar restaurante' })
  }
})

// POST /api/restaurantes — criar
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { nome, cnpj, email, telefone, endereco, categoria, latitude, longitude } = req.body
    if (!nome || !cnpj || !email || !endereco) return res.status(400).json({ erro: 'Campos obrigatórios faltando' }) as any
    if (!validarCNPJ(cnpj)) return res.status(400).json({ erro: 'CNPJ inválido' }) as any

    const existente = await db.execute({ sql: 'SELECT id FROM restaurantes WHERE cnpj = ?', args: [cnpj] })
    if (existente.rows.length) return res.status(409).json({ erro: 'CNPJ já cadastrado' }) as any

    const result = await db.execute({
      sql: `INSERT INTO restaurantes (id, user_id, nome, cnpj, email, telefone, endereco, categoria, latitude, longitude, taxa_comissao, avaliacao_media, status)
            VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, 15, 5.0, 'pendente')`,
      args: [req.userId, nome, cnpj, email, telefone || '', endereco, categoria || '', latitude || 0, longitude || 0]
    })
    res.status(201).json({ mensagem: 'Restaurante criado e aguardando aprovação', id: result.lastInsertRowid })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar restaurante' })
  }
})

// PUT /api/restaurantes/:id — atualizar
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { nome, email, telefone, endereco, categoria, status, taxa_comissao } = req.body
    const sets: string[] = ['updated_at = current_timestamp']
    const args: any[] = []
    if (nome) { sets.push('nome = ?'); args.push(nome) }
    if (email) { sets.push('email = ?'); args.push(email) }
    if (telefone) { sets.push('telefone = ?'); args.push(telefone) }
    if (endereco) { sets.push('endereco = ?'); args.push(endereco) }
    if (categoria) { sets.push('categoria = ?'); args.push(categoria) }
    if (status) { sets.push('status = ?'); args.push(status) }
    if (taxa_comissao !== undefined) { sets.push('taxa_comissao = ?'); args.push(taxa_comissao) }
    args.push(req.params.id)
    await db.execute({ sql: `UPDATE restaurantes SET ${sets.join(', ')} WHERE id = ?`, args })
    res.json({ mensagem: 'Restaurante atualizado com sucesso' })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar restaurante' })
  }
})

// DELETE /api/restaurantes/:id — desativar
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await db.execute({ sql: "UPDATE restaurantes SET status = 'inativo' WHERE id = ?", args: [req.params.id] })
    res.json({ mensagem: 'Restaurante desativado com sucesso' })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao desativar restaurante' })
  }
})

// POST /api/restaurantes/:id/aprovar — gerente aprova ou rejeita restaurante
router.post('/:id/aprovar', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { acao, motivo_rejeicao, taxa_comissao = 15 } = req.body
    if (!['aprovar', 'rejeitar'].includes(acao)) return res.status(400).json({ erro: 'Ação deve ser "aprovar" ou "rejeitar"' }) as any

    const rest = await db.execute({ sql: 'SELECT status FROM restaurantes WHERE id = ?', args: [req.params.id] })
    if (!rest.rows.length) return res.status(404).json({ erro: 'Restaurante não encontrado' }) as any
    if ((rest.rows[0] as any).status !== 'pendente') return res.status(400).json({ erro: 'Restaurante não está pendente' }) as any

    if (acao === 'rejeitar' && !motivo_rejeicao) return res.status(400).json({ erro: 'Motivo da rejeição é obrigatório' }) as any

    const novo_status = acao === 'aprovar' ? 'ativo' : 'rejeitado'

    if (acao === 'aprovar') {
      await db.execute({ sql: 'UPDATE restaurantes SET status = ?, taxa_comissao = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [novo_status, taxa_comissao, req.params.id] })
    } else {
      await db.execute({ sql: 'UPDATE restaurantes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [novo_status, req.params.id] })
    }

    res.json({ mensagem: `Restaurante ${acao === 'aprovar' ? 'aprovado' : 'rejeitado'} com sucesso`, status: novo_status, motivo_rejeicao: motivo_rejeicao || null })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao processar aprovação' })
  }
})

export default router
