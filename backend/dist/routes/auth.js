"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
// ── Helpers ───────────────────────────────────────────────────────────────────
function gerarToken(userId, role) {
    return jsonwebtoken_1.default.sign({ userId, role }, JWT_SECRET, { expiresIn: '30d' });
}
// ── POST /api/auth/registrar ──────────────────────────────────────────────────
// Cadastro simplificado: só email + telefone → envia link mágico por "email"
router.post('/registrar', async (req, res) => {
    try {
        const { email, telefone } = req.body;
        if (!email)
            return res.status(400).json({ erro: 'E-mail obrigatório' });
        // Verifica se já existe
        let usuario = await db_1.db.execute({
            sql: 'SELECT id, nome, email FROM clientes WHERE email = ?',
            args: [email]
        });
        let clienteId;
        if (!usuario.rows.length) {
            // Cria novo cliente
            clienteId = `cli_${crypto_1.default.randomUUID().slice(0, 8)}`;
            await db_1.db.execute({
                sql: `INSERT INTO clientes (id, user_id, nome, email, telefone, total_pedidos)
              VALUES (?, ?, ?, ?, ?, 0)`,
                args: [clienteId, clienteId, email.split('@')[0], email, telefone || '']
            });
        }
        else {
            clienteId = usuario.rows[0].id;
        }
        // Gera token de ativação (expira em 1h)
        const tokenAtivacao = crypto_1.default.randomUUID();
        const expira = new Date(Date.now() + 3600000).toISOString();
        await db_1.db.execute({
            sql: `INSERT OR REPLACE INTO tokens_ativacao (token, cliente_id, expira_em)
            VALUES (?, ?, ?)`,
            args: [tokenAtivacao, clienteId, expira]
        }).catch(async () => {
            // tabela pode não existir ainda — cria e tenta de novo
            await db_1.db.execute(`
        CREATE TABLE IF NOT EXISTS tokens_ativacao (
          token TEXT PRIMARY KEY,
          cliente_id TEXT NOT NULL,
          expira_em DATETIME NOT NULL,
          usado INTEGER DEFAULT 0
        )
      `);
            await db_1.db.execute({
                sql: `INSERT OR REPLACE INTO tokens_ativacao (token, cliente_id, expira_em) VALUES (?, ?, ?)`,
                args: [tokenAtivacao, clienteId, expira]
            });
        });
        const linkAtivacao = `${FRONTEND_URL}/auth/ativar?token=${tokenAtivacao}`;
        // Em produção: enviar por e-mail real (nodemailer/SendGrid/Resend)
        // Por ora: loga no console e retorna o link (para dev)
        console.log(`\n📧 Link de ativação para ${email}:\n   ${linkAtivacao}\n`);
        // TODO produção: await enviarEmail(email, linkAtivacao)
        res.json({
            mensagem: 'Link de acesso enviado para seu e-mail',
            // Retorna link apenas em DEV para facilitar testes:
            ...(process.env.NODE_ENV !== 'production' && { devLink: linkAtivacao })
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao processar cadastro' });
    }
});
// ── GET /api/auth/ativar?token=XXX ────────────────────────────────────────────
// Valida o token mágico e retorna JWT
router.get('/ativar', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token)
            return res.status(400).json({ erro: 'Token inválido' });
        const result = await db_1.db.execute({
            sql: `SELECT * FROM tokens_ativacao WHERE token = ? AND usado = 0 AND expira_em > datetime('now')`,
            args: [token]
        });
        if (!result.rows.length) {
            return res.redirect(`${FRONTEND_URL}/login?erro=token_expirado`);
        }
        const row = result.rows[0];
        // Marca token como usado
        await db_1.db.execute({
            sql: 'UPDATE tokens_ativacao SET usado = 1 WHERE token = ?',
            args: [token]
        });
        // Busca dados do cliente
        const cliente = await db_1.db.execute({
            sql: 'SELECT * FROM clientes WHERE id = ?',
            args: [row.cliente_id]
        });
        if (!cliente.rows.length) {
            return res.redirect(`${FRONTEND_URL}/login?erro=usuario_nao_encontrado`);
        }
        const jwt_token = gerarToken(row.cliente_id, 'cliente');
        // Redireciona pro frontend com o token na URL
        res.redirect(`${FRONTEND_URL}/auth/callback?token=${jwt_token}&perfil=cliente`);
    }
    catch (error) {
        console.error(error);
        res.redirect(`${FRONTEND_URL}/login?erro=servidor`);
    }
});
// ── POST /api/auth/login ──────────────────────────────────────────────────────
// Login tradicional por email (envia link mágico)
router.post('/login', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ erro: 'E-mail obrigatório' });
        // Verifica se existe em qualquer perfil
        const [clientes, gerentes, entregadores] = await Promise.all([
            db_1.db.execute({ sql: 'SELECT id, "cliente" as role FROM clientes WHERE email = ?', args: [email] }),
            db_1.db.execute({ sql: 'SELECT id, "gerente" as role FROM gerentes WHERE email = ?', args: [email] }),
            db_1.db.execute({ sql: 'SELECT id, "entregador" as role FROM entregadores WHERE email = ?', args: [email] }),
        ]);
        const todos = [...clientes.rows, ...gerentes.rows, ...entregadores.rows];
        if (!todos.length)
            return res.status(404).json({ erro: 'E-mail não cadastrado' });
        const usuario = todos[0];
        const tokenMagico = crypto_1.default.randomUUID();
        const expira = new Date(Date.now() + 3600000).toISOString();
        await db_1.db.execute(`CREATE TABLE IF NOT EXISTS tokens_ativacao (
      token TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, expira_em DATETIME NOT NULL, usado INTEGER DEFAULT 0
    )`).catch(() => { });
        await db_1.db.execute({
            sql: `INSERT OR REPLACE INTO tokens_ativacao (token, cliente_id, expira_em) VALUES (?, ?, ?)`,
            args: [tokenMagico, usuario.id, expira]
        });
        const link = `${FRONTEND_URL}/auth/ativar?token=${tokenMagico}`;
        console.log(`\n📧 Link de login para ${email}:\n   ${link}\n`);
        res.json({
            mensagem: 'Link de acesso enviado',
            ...(process.env.NODE_ENV !== 'production' && { devLink: link })
        });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao processar login' });
    }
});
// ── POST /api/auth/auth0-sync ────────────────────────────────────────────────
// Recebe perfil do Auth0 e retorna JWT interno para acessar rotas protegidas
router.post('/auth0-sync', async (req, res) => {
    try {
        const { email, nome } = req.body || {};
        if (!email)
            return res.status(400).json({ erro: 'E-mail obrigatório' });
        const existente = await db_1.db.execute({
            sql: 'SELECT id, nome, email, telefone FROM clientes WHERE email = ? LIMIT 1',
            args: [email]
        });
        let clienteId;
        let clienteNome = nome || email.split('@')[0];
        let telefone = '';
        if (existente.rows.length) {
            const c = existente.rows[0];
            clienteId = String(c.id);
            clienteNome = String(c.nome || clienteNome);
            telefone = String(c.telefone || '');
        }
        else {
            clienteId = `cli_a_${crypto_1.default.randomUUID().slice(0, 8)}`;
            await db_1.db.execute({
                sql: `INSERT INTO clientes (id, user_id, nome, email, telefone, total_pedidos)
              VALUES (?, ?, ?, ?, ?, 0)`,
                args: [clienteId, clienteId, clienteNome, email, '']
            });
        }
        const token = gerarToken(clienteId, 'cliente');
        res.json({
            token,
            usuario: {
                id: clienteId,
                nome: clienteNome,
                email,
                telefone,
                perfil: 'cliente'
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao sincronizar login Auth0' });
    }
});
// ── GET /api/auth/google ──────────────────────────────────────────────────────
// Inicia o fluxo OAuth Google
router.get('/google', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        return res.status(503).json({
            erro: 'Login com Google não configurado',
            instrucoes: 'Adicione GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no backend/.env'
        });
    }
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`;
    const scope = 'openid email profile';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&prompt=select_account`;
    res.redirect(url);
});
// ── GET /api/auth/google/callback ─────────────────────────────────────────────
router.get('/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code)
            return res.redirect(`${FRONTEND_URL}/login?erro=google_cancelado`);
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`;
        // Troca code por access_token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: code, client_id: clientId,
                client_secret: clientSecret, redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token)
            return res.redirect(`${FRONTEND_URL}/login?erro=google_falhou`);
        // Busca dados do usuário no Google
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const googleUser = await userRes.json();
        const { email, name, id: googleId } = googleUser;
        // Busca ou cria cliente no banco
        let clientResult = await db_1.db.execute({ sql: 'SELECT id FROM clientes WHERE email = ?', args: [email] });
        let clienteId;
        if (clientResult.rows.length) {
            clienteId = clientResult.rows[0].id;
        }
        else {
            clienteId = `cli_g_${googleId.slice(0, 8)}`;
            await db_1.db.execute({
                sql: `INSERT INTO clientes (id, user_id, nome, email, total_pedidos) VALUES (?, ?, ?, ?, 0)`,
                args: [clienteId, clienteId, name, email]
            });
        }
        const jwtToken = gerarToken(clienteId, 'cliente');
        res.redirect(`${FRONTEND_URL}/auth/callback?token=${jwtToken}&perfil=cliente`);
    }
    catch (error) {
        console.error(error);
        res.redirect(`${FRONTEND_URL}/login?erro=google_erro`);
    }
});
exports.default = router;
