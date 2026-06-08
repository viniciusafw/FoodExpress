// @ts-nocheck
import { Router, Response } from 'express'
import crypto from 'crypto'
import { db } from '../lib/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

function ehOperador(req: AuthRequest) {
  return String(req.userRole || '').toLowerCase() === 'operador'
}

function podeAcessarCliente(req: AuthRequest, cliente: any) {
  if (ehOperador(req)) return true
  const userId = String(req.userId || '')
  return [cliente?.id, cliente?.user_id].filter(Boolean).map(String).includes(userId)
}

async function emailJaEmUso(email: string, clienteId: string) {
  const emailLimpo = String(email || '').trim().toLowerCase()
  if (!emailLimpo) return false
  const consultas = [
    ['clientes', 'id'],
    ['restaurantes', 'id'],
    ['gerentes', 'id'],
    ['entregadores', 'id'],
    ['operadores', 'id'],
  ]
  for (const [tabela, colunaId] of consultas) {
    const args: any[] = [emailLimpo]
    let sql = `SELECT ${colunaId} AS id FROM ${tabela} WHERE lower(email) = ?`
    if (tabela === 'clientes') {
      sql += ' AND id <> ?'
      args.push(clienteId)
    }
    sql += ' LIMIT 1'
    const resultado = await db.execute({ sql, args })
    if (resultado.rows.length) return true
  }
  return false
}

// GET /api/clientes — buscar cliente do usuário logado
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM clientes WHERE user_id = ?', args: [req.userId] })
    if (!result.rows.length) return res.status(404).json({ erro: 'Cliente não encontrado' }) as any
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar cliente' })
  }
})

router.get('/:id/enderecos', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cliente = await db.execute({ sql: 'SELECT * FROM clientes WHERE id = ?', args: [req.params.id] })
    if (!cliente.rows.length) return res.status(404).json({ erro: 'Cliente não encontrado' }) as any
    if (!podeAcessarCliente(req, cliente.rows[0])) return res.status(403).json({ erro: 'Você não pode acessar estes endereços' }) as any

    let resultado = await db.execute({
      sql: `SELECT id, cliente_id, label, endereco, principal, created_at, updated_at
            FROM enderecos_clientes
            WHERE cliente_id = ?
            ORDER BY principal DESC, created_at ASC`,
      args: [req.params.id],
    })
    const clienteAtual = cliente.rows[0] as any
    if (!resultado.rows.length && clienteAtual.endereco_principal) {
      const id = `end_${crypto.randomUUID().slice(0, 16)}`
      await db.execute({
        sql: `INSERT INTO enderecos_clientes (id, cliente_id, label, endereco, principal)
              VALUES (?, ?, ?, ?, 1)`,
        args: [id, req.params.id, clienteAtual.endereco_label || 'Casa', clienteAtual.endereco_principal],
      })
      resultado = await db.execute({
        sql: `SELECT id, cliente_id, label, endereco, principal, created_at, updated_at
              FROM enderecos_clientes WHERE cliente_id = ? ORDER BY principal DESC, created_at ASC`,
        args: [req.params.id],
      })
    }
    res.json(resultado.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao listar endereços' })
  }
})

router.post('/:id/enderecos', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cliente = await db.execute({ sql: 'SELECT * FROM clientes WHERE id = ?', args: [req.params.id] })
    if (!cliente.rows.length) return res.status(404).json({ erro: 'Cliente não encontrado' }) as any
    if (!podeAcessarCliente(req, cliente.rows[0])) return res.status(403).json({ erro: 'Você não pode alterar estes endereços' }) as any

    const label = String(req.body.label || 'Casa').trim().slice(0, 80)
    const endereco = String(req.body.endereco || '').trim()
    if (!endereco) return res.status(400).json({ erro: 'Endereço obrigatório' }) as any

    const existentes = await db.execute({
      sql: 'SELECT COUNT(*) AS total FROM enderecos_clientes WHERE cliente_id = ?',
      args: [req.params.id],
    })
    const principal = Number((existentes.rows[0] as any)?.total || 0) === 0 || Boolean(req.body.principal)
    const id = `end_${crypto.randomUUID().slice(0, 16)}`

    if (principal) {
      await db.execute({ sql: 'UPDATE enderecos_clientes SET principal = 0 WHERE cliente_id = ?', args: [req.params.id] })
    }
    await db.execute({
      sql: `INSERT INTO enderecos_clientes (id, cliente_id, label, endereco, principal)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, req.params.id, label || 'Casa', endereco, principal ? 1 : 0],
    })
    if (principal) {
      await db.execute({
        sql: 'UPDATE clientes SET endereco_principal = ?, endereco_label = ? WHERE id = ?',
        args: [endereco, label || 'Casa', req.params.id],
      })
    }
    const criado = await db.execute({ sql: 'SELECT * FROM enderecos_clientes WHERE id = ?', args: [id] })
    res.status(201).json(criado.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao adicionar endereço' })
  }
})

router.put('/:id/enderecos/:enderecoId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cliente = await db.execute({ sql: 'SELECT * FROM clientes WHERE id = ?', args: [req.params.id] })
    if (!cliente.rows.length) return res.status(404).json({ erro: 'Cliente não encontrado' }) as any
    if (!podeAcessarCliente(req, cliente.rows[0])) return res.status(403).json({ erro: 'Você não pode alterar estes endereços' }) as any

    const atual = await db.execute({
      sql: 'SELECT * FROM enderecos_clientes WHERE id = ? AND cliente_id = ?',
      args: [req.params.enderecoId, req.params.id],
    })
    if (!atual.rows.length) return res.status(404).json({ erro: 'Endereço não encontrado' }) as any

    const label = String(req.body.label ?? (atual.rows[0] as any).label).trim().slice(0, 80)
    const endereco = String(req.body.endereco ?? (atual.rows[0] as any).endereco).trim()
    const principal = req.body.principal === undefined
      ? Boolean((atual.rows[0] as any).principal)
      : Boolean(req.body.principal)
    if (!endereco) return res.status(400).json({ erro: 'Endereço obrigatório' }) as any

    if (principal) {
      await db.execute({ sql: 'UPDATE enderecos_clientes SET principal = 0 WHERE cliente_id = ?', args: [req.params.id] })
    }
    await db.execute({
      sql: `UPDATE enderecos_clientes
            SET label = ?, endereco = ?, principal = ?
            WHERE id = ? AND cliente_id = ?`,
      args: [label || 'Casa', endereco, principal ? 1 : 0, req.params.enderecoId, req.params.id],
    })
    if (principal) {
      await db.execute({
        sql: 'UPDATE clientes SET endereco_principal = ?, endereco_label = ? WHERE id = ?',
        args: [endereco, label || 'Casa', req.params.id],
      })
    }
    const atualizado = await db.execute({ sql: 'SELECT * FROM enderecos_clientes WHERE id = ?', args: [req.params.enderecoId] })
    res.json(atualizado.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao atualizar endereço' })
  }
})

router.delete('/:id/enderecos/:enderecoId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cliente = await db.execute({ sql: 'SELECT * FROM clientes WHERE id = ?', args: [req.params.id] })
    if (!cliente.rows.length) return res.status(404).json({ erro: 'Cliente não encontrado' }) as any
    if (!podeAcessarCliente(req, cliente.rows[0])) return res.status(403).json({ erro: 'Você não pode alterar estes endereços' }) as any
    const atual = await db.execute({
      sql: 'SELECT * FROM enderecos_clientes WHERE id = ? AND cliente_id = ?',
      args: [req.params.enderecoId, req.params.id],
    })
    if (!atual.rows.length) return res.status(404).json({ erro: 'Endereço não encontrado' }) as any
    await db.execute({ sql: 'DELETE FROM enderecos_clientes WHERE id = ? AND cliente_id = ?', args: [req.params.enderecoId, req.params.id] })

    if (Boolean((atual.rows[0] as any).principal)) {
      const proximo = await db.execute({
        sql: `SELECT id, label, endereco FROM enderecos_clientes
              WHERE cliente_id = ? ORDER BY created_at ASC LIMIT 1`,
        args: [req.params.id],
      })
      if (proximo.rows.length) {
        const novoPrincipal = proximo.rows[0] as any
        await db.execute({
          sql: 'UPDATE enderecos_clientes SET principal = 1 WHERE id = ? AND cliente_id = ?',
          args: [novoPrincipal.id, req.params.id],
        })
        await db.execute({
          sql: 'UPDATE clientes SET endereco_principal = ?, endereco_label = ? WHERE id = ?',
          args: [novoPrincipal.endereco, novoPrincipal.label || 'Casa', req.params.id],
        })
      } else {
        await db.execute({
          sql: 'UPDATE clientes SET endereco_principal = NULL, endereco_label = NULL WHERE id = ?',
          args: [req.params.id],
        })
      }
    }

    res.json({ mensagem: 'Endereço removido' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao remover endereço' })
  }
})

// GET /api/clientes/:id — buscar por ID
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM clientes WHERE id = ?', args: [req.params.id] })
    if (!result.rows.length) return res.status(404).json({ erro: 'Cliente não encontrado' }) as any
    if (!podeAcessarCliente(req, result.rows[0])) return res.status(403).json({ erro: 'Você não pode acessar este cliente' }) as any
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar cliente' })
  }
})

// POST /api/clientes — criar cliente ao selecionar role
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const existente = await db.execute({ sql: 'SELECT * FROM clientes WHERE user_id = ?', args: [req.userId] })
    if (existente.rows.length) return res.json(existente.rows[0]) as any

    const { nome, email } = req.body
    const id = `cli_${req.userId}`
    await db.execute({
      sql: 'INSERT INTO clientes (id, user_id, nome, email, total_pedidos) VALUES (?, ?, ?, ?, 0)',
      args: [id, req.userId, nome || 'Usuário', email || '']
    })
    res.status(201).json({ id, nome, email })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar cliente' })
  }
})

// PUT /api/clientes/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const atual = await db.execute({ sql: 'SELECT * FROM clientes WHERE id = ?', args: [req.params.id] })
    if (!atual.rows.length) return res.status(404).json({ erro: 'Cliente não encontrado' }) as any
    if (!podeAcessarCliente(req, atual.rows[0])) return res.status(403).json({ erro: 'Você não pode alterar este cliente' }) as any

    const { nome, email, telefone, endereco_principal, endereco_label, latitude, longitude } = req.body
    const sets: string[] = []
    const args: any[] = []
    if (nome) { sets.push('nome = ?'); args.push(nome) }
    if (email) {
      if (await emailJaEmUso(email, req.params.id)) {
        return res.status(409).json({ erro: 'Este e-mail já está sendo usado por outra conta' }) as any
      }
      sets.push('email = ?'); args.push(String(email).trim().toLowerCase())
    }
    if (telefone) { sets.push('telefone = ?'); args.push(telefone) }
    if (endereco_principal) { sets.push('endereco_principal = ?'); args.push(endereco_principal) }
    if (endereco_label) { sets.push('endereco_label = ?'); args.push(String(endereco_label).trim().slice(0, 80)) }
    if (latitude !== undefined) { sets.push('latitude = ?'); args.push(latitude) }
    if (longitude !== undefined) { sets.push('longitude = ?'); args.push(longitude) }
    if (!sets.length) return res.status(400).json({ erro: 'Nenhum campo para atualizar' }) as any
    args.push(req.params.id)
    await db.execute({ sql: `UPDATE clientes SET ${sets.join(', ')} WHERE id = ?`, args })
    res.json({ mensagem: 'Cliente atualizado com sucesso' })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar cliente' })
  }
})

// DELETE /api/clientes/:id — remover/desativar cliente
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const atual = await db.execute({ sql: 'SELECT * FROM clientes WHERE id = ?', args: [req.params.id] })
    if (!atual.rows.length) return res.status(404).json({ erro: 'Cliente não encontrado' }) as any
    if (!podeAcessarCliente(req, atual.rows[0])) return res.status(403).json({ erro: 'Você não pode deletar este cliente' }) as any

    // Soft delete: apenas desativar o cliente
    await db.execute({
      sql: 'UPDATE clientes SET deletado_em = ? WHERE id = ?',
      args: [new Date().toISOString(), req.params.id]
    })
    res.json({ mensagem: 'Cliente removido com sucesso' })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao remover cliente' })
  }
})

export default router
