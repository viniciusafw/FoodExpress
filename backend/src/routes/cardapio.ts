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
    const {
      restauranteId,
      nome,
      preco,
      preco_original,
      categoria,
      descricao,
      imagem,
      tempo_preparo,
      promocao_ativa,
      promocao_tipo,
      promocao_label,
      combo_itens,
    } = req.body
    if (!restauranteId || !nome || !preco || !categoria) return res.status(400).json({ erro: 'Campos obrigatórios faltando' }) as any
    if (!(await podeGerenciarRestaurante(req, String(restauranteId)))) {
      return res.status(403).json({ erro: 'Você não pode alterar este cardápio' }) as any
    }
    const id = `card_${crypto.randomUUID().slice(0, 12)}`
    const precoFinal = Number(preco)
    const precoOriginal = preco_original !== undefined && preco_original !== null && Number(preco_original) > precoFinal
      ? Number(preco_original)
      : null
    const promocaoAtiva = promocao_ativa || precoOriginal ? 1 : 0
    await db.execute({
      sql: `INSERT INTO cardapio
            (id, restaurante_id, nome, preco, preco_original, categoria, descricao, imagem, tempo_preparo,
             promocao_ativa, promocao_tipo, promocao_label, combo_itens, disponivel)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [
        id,
        restauranteId,
        nome,
        precoFinal,
        precoOriginal,
        categoria,
        descricao || '',
        imagem || '',
        tempo_preparo || 30,
        promocaoAtiva,
        promocao_tipo || (promocaoAtiva ? 'desconto' : null),
        promocao_label || (promocaoAtiva ? 'Oferta' : null),
        combo_itens ? JSON.stringify(combo_itens) : null,
      ]
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
    const {
      nome,
      preco,
      preco_original,
      categoria,
      descricao,
      imagem,
      tempo_preparo,
      disponivel,
      destaque,
      promocao_ativa,
      promocao_tipo,
      promocao_label,
      combo_itens,
    } = req.body
    const sets: string[] = []
    const args: any[] = []
    if (nome) { sets.push('nome = ?'); args.push(nome) }
    if (preco !== undefined) { sets.push('preco = ?'); args.push(preco) }
    if (preco_original !== undefined) { sets.push('preco_original = ?'); args.push(preco_original || null) }
    if (categoria) { sets.push('categoria = ?'); args.push(categoria) }
    if (descricao !== undefined) { sets.push('descricao = ?'); args.push(descricao) }
    if (imagem !== undefined) { sets.push('imagem = ?'); args.push(imagem) }
    if (tempo_preparo !== undefined) { sets.push('tempo_preparo = ?'); args.push(tempo_preparo) }
    if (disponivel !== undefined) { sets.push('disponivel = ?'); args.push(disponivel ? 1 : 0) }
    if (destaque !== undefined) { sets.push('destaque = ?'); args.push(destaque ? 1 : 0) }
    if (promocao_ativa !== undefined) { sets.push('promocao_ativa = ?'); args.push(promocao_ativa ? 1 : 0) }
    if (promocao_tipo !== undefined) { sets.push('promocao_tipo = ?'); args.push(promocao_tipo || null) }
    if (promocao_label !== undefined) { sets.push('promocao_label = ?'); args.push(promocao_label || null) }
    if (combo_itens !== undefined) { sets.push('combo_itens = ?'); args.push(combo_itens ? JSON.stringify(combo_itens) : null) }
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
