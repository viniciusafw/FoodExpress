// @ts-nocheck
import { Router, Response } from 'express'
import { db } from '../lib/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import crypto from 'crypto'

const router = Router()

function ehOperador(req: AuthRequest) {
  return String(req.userRole || '').toLowerCase() === 'operador'
}

async function podeGerenciarRestaurante(req: AuthRequest, restauranteId: string) {
  if (ehOperador(req)) return true
  const rest = await db.execute({
    sql: 'SELECT user_id, email FROM restaurantes WHERE id = ? LIMIT 1',
    args: [restauranteId]
  })
  if (!rest.rows.length) return false
  const row = rest.rows[0] as any
  const userId = String(req.userId || '')
  const email = String(req.userEmail || '').toLowerCase()
  return String(row.user_id || '') === userId || (email && String(row.email || '').toLowerCase() === email)
}

async function restauranteDoItem(itemId: string) {
  const result = await db.execute({ sql: 'SELECT restaurante_id FROM cardapio WHERE id = ? LIMIT 1', args: [itemId] })
  return String((result.rows[0] as any)?.restaurante_id || '')
}

// GET /api/cardapio
router.get('/', async (req, res: Response) => {
  try {
    const { restauranteId, categoria } = req.query
    let sql = 'SELECT * FROM cardapio WHERE disponivel = 1'
    const args: any[] = []
    if (restauranteId) { sql += ' AND restaurante_id = ?'; args.push(restauranteId) }
    if (categoria) { sql += ' AND categoria = ?'; args.push(categoria) }
    sql += ' ORDER BY destaque DESC, nome ASC'
    const result = await db.execute({ sql, args })
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao listar cardápio' })
  }
})

// GET /api/cardapio/:id
router.get('/:id', async (req, res: Response) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM cardapio WHERE id = ?', args: [req.params.id] })
    if (!result.rows.length) return res.status(404).json({ erro: 'Item não encontrado' }) as any
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar item' })
  }
})

// POST /api/cardapio
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { restauranteId, nome, preco, categoria, descricao, imagem, tempo_preparo } = req.body
    if (!restauranteId || !nome || !preco || !categoria) return res.status(400).json({ erro: 'Campos obrigatórios faltando' }) as any
    if (!(await podeGerenciarRestaurante(req, String(restauranteId)))) {
      return res.status(403).json({ erro: 'Você não pode alterar este cardápio' }) as any
    }
    const id = `card_${crypto.randomUUID().slice(0, 12)}`
    await db.execute({
      sql: `INSERT INTO cardapio (id, restaurante_id, nome, preco, categoria, descricao, imagem, tempo_preparo, disponivel)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [id, restauranteId, nome, preco, categoria, descricao || '', imagem || '', tempo_preparo || 30]
    })
    const criado = await db.execute({ sql: 'SELECT * FROM cardapio WHERE id = ?', args: [id] })
    res.status(201).json(criado.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao criar item' })
  }
})

// PUT /api/cardapio/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const restauranteId = await restauranteDoItem(String(req.params.id))
    if (!restauranteId) return res.status(404).json({ erro: 'Item não encontrado' }) as any
    if (!(await podeGerenciarRestaurante(req, restauranteId))) {
      return res.status(403).json({ erro: 'Você não pode alterar este item' }) as any
    }
    const { nome, preco, categoria, descricao, imagem, tempo_preparo, disponivel, destaque } = req.body
    const sets: string[] = []
    const args: any[] = []
    if (nome) { sets.push('nome = ?'); args.push(nome) }
    if (preco !== undefined) { sets.push('preco = ?'); args.push(preco) }
    if (categoria) { sets.push('categoria = ?'); args.push(categoria) }
    if (descricao !== undefined) { sets.push('descricao = ?'); args.push(descricao) }
    if (imagem !== undefined) { sets.push('imagem = ?'); args.push(imagem) }
    if (tempo_preparo !== undefined) { sets.push('tempo_preparo = ?'); args.push(tempo_preparo) }
    if (disponivel !== undefined) { sets.push('disponivel = ?'); args.push(disponivel ? 1 : 0) }
    if (destaque !== undefined) { sets.push('destaque = ?'); args.push(destaque ? 1 : 0) }
    if (!sets.length) return res.status(400).json({ erro: 'Nenhum campo para atualizar' }) as any
    args.push(req.params.id)
    await db.execute({ sql: `UPDATE cardapio SET ${sets.join(', ')} WHERE id = ?`, args })
    const atualizado = await db.execute({ sql: 'SELECT * FROM cardapio WHERE id = ?', args: [req.params.id] })
    res.json(atualizado.rows[0] || { mensagem: 'Item atualizado com sucesso' })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar item' })
  }
})

// DELETE /api/cardapio/:id — soft delete
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const restauranteId = await restauranteDoItem(String(req.params.id))
    if (!restauranteId) return res.status(404).json({ erro: 'Item não encontrado' }) as any
    if (!(await podeGerenciarRestaurante(req, restauranteId))) {
      return res.status(403).json({ erro: 'Você não pode remover este item' }) as any
    }
    await db.execute({ sql: 'UPDATE cardapio SET disponivel = 0 WHERE id = ?', args: [req.params.id] })
    res.json({ mensagem: 'Item removido do cardápio' })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao remover item' })
  }
})

export default router
