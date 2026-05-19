// @ts-nocheck
// backend/src/routes/auth.ts
import { Router } from 'express';
import { db } from '../lib/db';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { enviarLinkAcesso } from '../lib/email';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PERFIS_VALIDOS = new Set(['cliente', 'gerente', 'entregador', 'restaurante', 'operador']);

// ── Helper ───────────────────────────────────────────────────────────────────
function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV !== 'production') return 'dev_secret';
  throw new Error('JWT_SECRET não configurado');
}

function gerarToken(userId: string, role: string, extras: Record<string, string> = {}) {
  return jwt.sign({ userId, role, ...extras }, getJwtSecret(), { expiresIn: '30d' });
}

function normalizarIdentificador(valor: string) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'usuario';
}

function idEstavelPorEmail(email: string, perfil: string) {
  return `${perfil}-${normalizarIdentificador(email)}`;
}

function normalizarEmail(email: string) {
  return String(email || '').trim().toLowerCase();
}

async function buscarPerfisPorEmail(email: string) {
  const emailLimpo = normalizarEmail(email);
  const perfis: string[] = [];

  const cliente = await db.execute({ sql: 'SELECT id FROM clientes WHERE lower(email) = ? LIMIT 1', args: [emailLimpo] });
  if (cliente.rows.length) perfis.push('cliente');

  const entregador = await db.execute({ sql: 'SELECT id FROM entregadores WHERE lower(email) = ? LIMIT 1', args: [emailLimpo] });
  if (entregador.rows.length) perfis.push('entregador');

  const restaurante = await db.execute({ sql: 'SELECT id FROM restaurantes WHERE lower(email) = ? LIMIT 1', args: [emailLimpo] });
  if (restaurante.rows.length) perfis.push('restaurante');

  const gerente = await db.execute({ sql: 'SELECT id FROM gerentes WHERE lower(email) = ? LIMIT 1', args: [emailLimpo] });
  if (gerente.rows.length) perfis.push('gerente');

  return perfis;
}

// ── POST /api/auth/registrar ─────────────────────────────────────────────────
// Etapa 1: Salva email como pendente e envia link de confirmação
router.post('/registrar', async (req, res) => {
  try {
    const { email, telefone } = req.body;
    if (!email) return res.status(400).json({ erro: 'E-mail obrigatório' });

    const emailLimpo = email.toLowerCase().trim();

    // Verifica se já existe conta confirmada
    const perfisExistentes = await buscarPerfisPorEmail(emailLimpo);
    if (perfisExistentes.includes('cliente')) {
      return res.status(409).json({ erro: 'Este e-mail já está cadastrado' });
    }
    const outrosPerfis = perfisExistentes.filter(p => p !== 'cliente');
    if (outrosPerfis.length) {
      return res.status(409).json({ erro: `Este e-mail já está cadastrado como perfil ${outrosPerfis.join(', ')}.` });
    }

    // Cria registro pendente
    const pendingId = `pend_${crypto.randomUUID().slice(0, 12)}`;
    const tokenAtivacao = crypto.randomUUID();
    const expira = new Date(Date.now() + 3600000).toISOString(); // 1 hora

    await db.execute({
      sql: `INSERT OR REPLACE INTO usuarios_pendentes 
            (id, email, telefone, token, expira_em, criado_em)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [pendingId, emailLimpo, telefone || '', tokenAtivacao, expira]
    }).catch(async () => {
      // Cria a tabela se não existir
      await db.execute(`
        CREATE TABLE IF NOT EXISTS usuarios_pendentes (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          telefone TEXT,
          token TEXT NOT NULL,
          expira_em DATETIME NOT NULL,
          usado INTEGER DEFAULT 0,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.execute({
        sql: `INSERT OR REPLACE INTO usuarios_pendentes 
              (id, email, telefone, token, expira_em)
              VALUES (?, ?, ?, ?, ?)`,
        args: [pendingId, emailLimpo, telefone || '', tokenAtivacao, expira]
      });
    });

    const linkConfirmacao = `${FRONTEND_URL}/auth/ativar?token=${tokenAtivacao}`;

    await enviarLinkAcesso(emailLimpo, linkConfirmacao, emailLimpo.split('@')[0]);

    res.json({
      mensagem: 'Link de confirmação enviado para seu e-mail. Verifique sua caixa de entrada.',
      ...(process.env.NODE_ENV !== 'production' && { devLink: linkConfirmacao })
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao processar cadastro' });
  }
});

// ── GET /api/auth/ativar?token=XXX ───────────────────────────────────────────
// Etapa 2: Confirma o email e cria a conta de verdade
router.get('/ativar', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.redirect(`${FRONTEND_URL}/login?erro=token_invalido`);

    // Busca o registro pendente
    const pending = await db.execute({
      sql: `SELECT * FROM usuarios_pendentes 
            WHERE token = ? AND usado = 0 AND expira_em > datetime('now')`,
      args: [token]
    });

    if (!pending.rows.length) {
      return res.redirect(`${FRONTEND_URL}/login?erro=token_expirado_ou_invalido`);
    }

    const row = pending.rows[0];
    const email = row.email as string;
    const telefone = row.telefone as string;

    const emailLimpo = normalizarEmail(email);
    const existenteCliente = await db.execute({
      sql: 'SELECT id, nome, telefone FROM clientes WHERE lower(email) = ? LIMIT 1',
      args: [emailLimpo]
    });

    let clienteId = `cli_${crypto.randomUUID().slice(0, 8)}`;
    let clienteNome = email.split('@')[0];
    let clienteTelefone = telefone || '';

    if (existenteCliente.rows.length) {
      const cliente = existenteCliente.rows[0] as any;
      clienteId = cliente.id;
      clienteNome = cliente.nome || clienteNome;
      clienteTelefone = cliente.telefone || clienteTelefone;

      if (!cliente.nome && clienteNome) {
        await db.execute({ sql: 'UPDATE clientes SET nome = ? WHERE id = ?', args: [clienteNome, clienteId] });
      }
      if (!cliente.telefone && clienteTelefone) {
        await db.execute({ sql: 'UPDATE clientes SET telefone = ? WHERE id = ?', args: [clienteTelefone, clienteId] });
      }
    } else {
      await db.execute({
        sql: `INSERT INTO clientes (id, user_id, nome, email, telefone, total_pedidos)
              VALUES (?, ?, ?, ?, ?, 0)`,
        args: [clienteId, clienteId, clienteNome, emailLimpo, clienteTelefone]
      });
    }

    // Marca token como usado
    await db.execute({
      sql: 'UPDATE usuarios_pendentes SET usado = 1 WHERE token = ?',
      args: [token]
    });

    // Gera JWT
    const jwt_token = gerarToken(clienteId, 'cliente');

    // Redireciona com token (funciona melhor no celular)
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${jwt_token}&perfil=cliente`);
  } catch (error) {
    console.error(error);
    res.redirect(`${FRONTEND_URL}/login?erro=erro_ao_confirmar`);
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ erro: 'E-mail obrigatório' });

    const emailLimpo = normalizarEmail(email);

    const perfisExistentes = await buscarPerfisPorEmail(emailLimpo);
    if (perfisExistentes.some(p => p !== 'cliente')) {
      return res.status(400).json({ erro: 'Este e-mail pertence a outro tipo de conta. Use o perfil correto ou cadastre um e-mail diferente.' });
    }

    // Verifica se existe conta confirmada
    const existente = await db.execute({
      sql: 'SELECT id FROM clientes WHERE lower(email) = ?',
      args: [emailLimpo]
    });

    if (!existente.rows.length) {
      return res.status(404).json({ erro: 'E-mail não cadastrado. Faça o cadastro primeiro.' });
    }

    const tokenMagico = crypto.randomUUID();
    const expira = new Date(Date.now() + 3600000).toISOString();

    await db.execute({
      sql: `INSERT OR REPLACE INTO usuarios_pendentes 
            (id, email, token, expira_em, criado_em)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [`login_${crypto.randomUUID().slice(0,8)}`, emailLimpo, tokenMagico, expira]
    });

    const link = `${FRONTEND_URL}/auth/ativar?token=${tokenMagico}`;

    await enviarLinkAcesso(emailLimpo, link);

    res.json({
      mensagem: 'Link de acesso enviado para seu e-mail',
      ...(process.env.NODE_ENV !== 'production' && { devLink: link })
    });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao processar login' });
  }
});

// ── POST /api/auth/session ───────────────────────────────────────────────────
// Emite JWT no backend para fluxos locais/perfis internos sem expor JWT_SECRET no bundle.
router.post('/session', async (req, res) => {
  try {
    const { email, nome, perfil, userId } = req.body;
    const emailLimpo = normalizarEmail(String(email || ''));
    const perfilNormalizado = String(perfil || 'cliente').toLowerCase().trim();

    if (!emailLimpo) return res.status(400).json({ erro: 'E-mail obrigatório' });
    if (!PERFIS_VALIDOS.has(perfilNormalizado)) {
      return res.status(400).json({ erro: 'Perfil inválido' });
    }

    const perfisExistentes = await buscarPerfisPorEmail(emailLimpo);
    const perfisDiferentes = perfisExistentes.filter(p => p !== perfilNormalizado);
    if (perfisDiferentes.length) {
      return res.status(409).json({ erro: `Este e-mail já está cadastrado como perfil ${perfisDiferentes.join(', ')}.` });
    }

    const id = userId || idEstavelPorEmail(emailLimpo, perfilNormalizado);
    const token = gerarToken(id, perfilNormalizado, {
      email: emailLimpo,
      nome: nome || emailLimpo.split('@')[0],
    });

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao criar sessão' });
  }
});

// ── POST /api/auth/auth0-sync ─────────────────────────────────────────────────
router.post('/auth0-sync', async (req, res) => {
  try {
    const { email, nome } = req.body;
    if (!email) return res.status(400).json({ erro: 'E-mail obrigatório' });

    const emailLimpo = email.toLowerCase().trim();
    const existente = await db.execute({
      sql: 'SELECT * FROM clientes WHERE email = ?',
      args: [emailLimpo]
    });

    if (existente.rows.length) {
      const cliente = existente.rows[0];
      const token = gerarToken(cliente.id, 'cliente', {
        email: cliente.email,
        nome: cliente.nome,
      });
      return res.json({ token, usuario: {
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone || '',
        perfil: 'cliente'
      }});
    }

    const clienteId = `cli_${crypto.randomUUID().slice(0, 8)}`;
    await db.execute({
      sql: `INSERT INTO clientes (id, user_id, nome, email, telefone, total_pedidos)
            VALUES (?, ?, ?, ?, ?, 0)`,
      args: [clienteId, clienteId, nome || emailLimpo.split('@')[0], emailLimpo, '']
    });

    const token = gerarToken(clienteId, 'cliente', {
      email: emailLimpo,
      nome: nome || emailLimpo.split('@')[0],
    });
    res.json({ token, usuario: {
      id: clienteId,
      nome: nome || emailLimpo.split('@')[0],
      email: emailLimpo,
      telefone: '',
      perfil: 'cliente'
    }});
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao sincronizar usuário Auth0' });
  }
});

export default router;
