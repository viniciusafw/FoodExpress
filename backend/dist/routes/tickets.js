"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const db_1 = require("../lib/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/tickets
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { status } = req.query;
        let sql = 'SELECT * FROM tickets WHERE cliente_id = ?';
        const args = [req.userId];
        if (status) {
            sql += ' AND status = ?';
            args.push(status);
        }
        sql += ' ORDER BY created_at DESC LIMIT 50';
        const result = await db_1.db.execute({ sql, args });
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao listar tickets' });
    }
});
// POST /api/tickets
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { titulo, descricao, categoria, pedidoId } = req.body;
        if (!titulo || !descricao || !categoria)
            return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
        const id = (0, crypto_1.randomUUID)();
        await db_1.db.execute({
            sql: 'INSERT INTO tickets (id, cliente_id, titulo, descricao, categoria, pedido_id, status, prioridade, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [id, req.userId, titulo, descricao, categoria, pedidoId || null, 'aberto', 'normal', new Date().toISOString()]
        });
        res.status(201).json({ mensagem: 'Ticket criado com sucesso', id });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao criar ticket' });
    }
});
exports.default = router;
