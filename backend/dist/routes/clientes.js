"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/clientes — buscar cliente do usuário logado
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await db_1.db.execute({ sql: 'SELECT * FROM clientes WHERE user_id = ?', args: [req.userId] });
        if (!result.rows.length)
            return res.status(404).json({ erro: 'Cliente não encontrado' });
        res.json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar cliente' });
    }
});
// GET /api/clientes/:id — buscar por ID
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await db_1.db.execute({ sql: 'SELECT * FROM clientes WHERE id = ?', args: [req.params.id] });
        if (!result.rows.length)
            return res.status(404).json({ erro: 'Cliente não encontrado' });
        res.json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar cliente' });
    }
});
// POST /api/clientes — criar cliente ao selecionar role
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const existente = await db_1.db.execute({ sql: 'SELECT * FROM clientes WHERE user_id = ?', args: [req.userId] });
        if (existente.rows.length)
            return res.json(existente.rows[0]);
        const { nome, email } = req.body;
        const id = `cli_${req.userId}`;
        await db_1.db.execute({
            sql: 'INSERT INTO clientes (id, user_id, nome, email, total_pedidos) VALUES (?, ?, ?, ?, 0)',
            args: [id, req.userId, nome || 'Usuário', email || '']
        });
        res.status(201).json({ id, nome, email });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao criar cliente' });
    }
});
// PUT /api/clientes/:id
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { nome, email, telefone, endereco_principal, latitude, longitude } = req.body;
        const sets = [];
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
        if (endereco_principal) {
            sets.push('endereco_principal = ?');
            args.push(endereco_principal);
        }
        if (latitude !== undefined) {
            sets.push('latitude = ?');
            args.push(latitude);
        }
        if (longitude !== undefined) {
            sets.push('longitude = ?');
            args.push(longitude);
        }
        if (!sets.length)
            return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
        args.push(req.params.id);
        await db_1.db.execute({ sql: `UPDATE clientes SET ${sets.join(', ')} WHERE id = ?`, args });
        res.json({ mensagem: 'Cliente atualizado com sucesso' });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao atualizar cliente' });
    }
});
exports.default = router;
