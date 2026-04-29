"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const validacoes_1 = require("../lib/validacoes");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/restaurantes — listar com filtros
router.get('/', async (req, res) => {
    try {
        const { categoria, ordenar, limite = '50' } = req.query;
        let sql = 'SELECT * FROM restaurantes WHERE status = ?';
        const args = ['ativo'];
        if (categoria) {
            sql += ' AND categoria = ?';
            args.push(categoria);
        }
        const col = ordenar === 'avaliacao' ? 'avaliacao_media' : 'created_at';
        sql += ` ORDER BY ${col} DESC LIMIT ?`;
        args.push(parseInt(limite));
        const result = await db_1.db.execute({ sql, args });
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao listar restaurantes' });
    }
});
// GET /api/restaurantes/:id — buscar por ID
router.get('/:id', async (req, res) => {
    try {
        const result = await db_1.db.execute({ sql: 'SELECT * FROM restaurantes WHERE id = ?', args: [req.params.id] });
        if (!result.rows.length)
            return res.status(404).json({ erro: 'Restaurante não encontrado' });
        res.json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar restaurante' });
    }
});
// POST /api/restaurantes — criar
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { nome, cnpj, email, telefone, endereco, categoria, latitude, longitude } = req.body;
        if (!nome || !cnpj || !email || !endereco)
            return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
        if (!(0, validacoes_1.validarCNPJ)(cnpj))
            return res.status(400).json({ erro: 'CNPJ inválido' });
        const existente = await db_1.db.execute({ sql: 'SELECT id FROM restaurantes WHERE cnpj = ?', args: [cnpj] });
        if (existente.rows.length)
            return res.status(409).json({ erro: 'CNPJ já cadastrado' });
        const result = await db_1.db.execute({
            sql: `INSERT INTO restaurantes (id, user_id, nome, cnpj, email, telefone, endereco, categoria, latitude, longitude, taxa_comissao, avaliacao_media, status)
            VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?, 15, 5.0, 'pendente')`,
            args: [req.userId, nome, cnpj, email, telefone || '', endereco, categoria || '', latitude || 0, longitude || 0]
        });
        res.status(201).json({ mensagem: 'Restaurante criado e aguardando aprovação', id: result.lastInsertRowid });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao criar restaurante' });
    }
});
// PUT /api/restaurantes/:id — atualizar
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { nome, email, telefone, endereco, categoria, status, taxa_comissao } = req.body;
        const sets = ['updated_at = current_timestamp'];
        const args = [];
        if (nome) {
            sets.push('nome = ?');
            args.push(nome);
        }
        if (email) {
            sets.push('email = ?');
            args.push(email);
        }
        if (telefone) {
            sets.push('telefone = ?');
            args.push(telefone);
        }
        if (endereco) {
            sets.push('endereco = ?');
            args.push(endereco);
        }
        if (categoria) {
            sets.push('categoria = ?');
            args.push(categoria);
        }
        if (status) {
            sets.push('status = ?');
            args.push(status);
        }
        if (taxa_comissao !== undefined) {
            sets.push('taxa_comissao = ?');
            args.push(taxa_comissao);
        }
        args.push(req.params.id);
        await db_1.db.execute({ sql: `UPDATE restaurantes SET ${sets.join(', ')} WHERE id = ?`, args });
        res.json({ mensagem: 'Restaurante atualizado com sucesso' });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao atualizar restaurante' });
    }
});
// DELETE /api/restaurantes/:id — desativar
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        await db_1.db.execute({ sql: "UPDATE restaurantes SET status = 'inativo' WHERE id = ?", args: [req.params.id] });
        res.json({ mensagem: 'Restaurante desativado com sucesso' });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao desativar restaurante' });
    }
});
// POST /api/restaurantes/cadastro — cria registro inicial ao selecionar role
router.post('/cadastro', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const { email, nome } = req.body;
        const existente = await db_1.db.execute({ sql: 'SELECT id FROM restaurantes WHERE email = ?', args: [email] });
        if (existente.rows.length)
            return res.json(existente.rows[0]);
        const id = `rest_${userId}`;
        await db_1.db.execute({
            sql: `INSERT INTO restaurantes (id, nome, cnpj, email, telefone, endereco, categoria, latitude, longitude, taxa_comissao, avaliacao_media, status)
            VALUES (?, ?, '00.000.000/0000-00', ?, '', '', 'Geral', 0, 0, 15, 0, 'pendente')`,
            args: [id, nome || 'Meu Restaurante', email || '']
        });
        res.status(201).json({ id, nome, email });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao criar restaurante' });
    }
});
// GET /api/restaurantes/cadastro — busca restaurante do usuário logado
router.get('/cadastro', auth_1.requireAuth, async (req, res) => {
    try {
        const { email } = req.query;
        const result = await db_1.db.execute({ sql: 'SELECT * FROM restaurantes WHERE email = ?', args: [email] });
        if (!result.rows.length)
            return res.status(404).json({ erro: 'Restaurante não encontrado' });
        res.json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar restaurante' });
    }
});
// POST /api/restaurantes/:id/aprovar — gerente aprova ou rejeita restaurante
router.post('/:id/aprovar', auth_1.requireAuth, async (req, res) => {
    try {
        const { acao, motivo_rejeicao, taxa_comissao = 15 } = req.body;
        if (!['aprovar', 'rejeitar'].includes(acao))
            return res.status(400).json({ erro: 'Ação deve ser "aprovar" ou "rejeitar"' });
        const rest = await db_1.db.execute({ sql: 'SELECT status FROM restaurantes WHERE id = ?', args: [req.params.id] });
        if (!rest.rows.length)
            return res.status(404).json({ erro: 'Restaurante não encontrado' });
        if (rest.rows[0].status !== 'pendente')
            return res.status(400).json({ erro: 'Restaurante não está pendente' });
        if (acao === 'rejeitar' && !motivo_rejeicao)
            return res.status(400).json({ erro: 'Motivo da rejeição é obrigatório' });
        const novo_status = acao === 'aprovar' ? 'ativo' : 'rejeitado';
        if (acao === 'aprovar') {
            await db_1.db.execute({ sql: 'UPDATE restaurantes SET status = ?, taxa_comissao = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [novo_status, taxa_comissao, req.params.id] });
        }
        else {
            await db_1.db.execute({ sql: 'UPDATE restaurantes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args: [novo_status, req.params.id] });
        }
        res.json({ mensagem: `Restaurante ${acao === 'aprovar' ? 'aprovado' : 'rejeitado'} com sucesso`, status: novo_status, motivo_rejeicao: motivo_rejeicao || null });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao processar aprovação' });
    }
});
exports.default = router;
