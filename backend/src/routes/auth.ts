// backend/src/routes/auth.ts
import { Router } from 'express';
import { db } from '../lib/db';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { enviarLinkAcesso } from '../lib/email';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ── Helper ───────────────────────────────────────────────────────────────────
function gerarToken(userId: string, role: string) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '30d' });
}

// ── POST /api/auth/registrar ─────────────────────────────────────────────────
// Etapa 1: Salva email como pendente e envia link de confirmação
router.post('/registrar', async (req, res) => {
  try {
    const { email, telefone } = req.body;
    if (!email) return res.status(400).json({ erro: 'E-mail obrigatório' });

    const emailLimpo = email.toLowerCase().trim();

    // Verifica se já existe conta confirmada
    const existente = await db.execute({
      sql: 'SELECT id FROM clientes WHERE email = ?',
      args: [emailLimpo]
    });

    if (existente.rows.length) {
      return res.status(409).json({ erro: 'Este e-mail já está cadastrado' });
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

    // Cria o cliente de verdade
    const clienteId = `cli_${crypto.randomUUID().slice(0, 8)}`;

    await db.execute({
      sql: `INSERT INTO clientes (id, user_id, nome, email, telefone, total_pedidos)
            VALUES (?, ?, ?, ?, ?, 0)`,
      args: [clienteId, clienteId, email.split('@')[0], email, telefone]
    });

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

    const emailLimpo = email.toLowerCase().trim();

    // Verifica se existe conta confirmada
    const existente = await db.execute({
      sql: 'SELECT id FROM clientes WHERE email = ?',
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

export default router;