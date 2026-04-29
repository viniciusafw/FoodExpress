"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/avaliacoes
router.get('/', async (req, res) => {
    try {
        const { restauranteId, entregadorId, tipo } = req.query;
        let sql = 'SELECT * FROM avaliacoes WHERE 1=1';
        const args = [];
        if (restauranteId && tipo === 'restaurante') {
            sql += ' AND restaurante_id = ?';
            args.push(restauranteId);
        }
        if (entregadorId && tipo === 'entregador') {
            sql += ' AND entregador_id = ?';
            args.push(entregadorId);
        }
        sql += ' ORDER BY created_at DESC LIMIT 50';
        const result = await db_1.db.execute({ sql, args });
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao listar avaliações' });
    }
});
// POST /api/avaliacoes
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { pedidoId, restauranteId, entregadorId, estrelas, comentario, tipo } = req.body;
        if (!tipo || !estrelas || estrelas < 1 || estrelas > 5)
            return res.status(400).json({ erro: 'Dados inválidos' });
        const jaAvaliado = await db_1.db.execute({ sql: 'SELECT id FROM avaliacoes WHERE pedido_id = ? AND cliente_id = ?', args: [pedidoId, req.userId] });
        if (jaAvaliado.rows.length)
            return res.status(409).json({ erro: 'Você já avaliou este pedido' });
        const result = await db_1.db.execute({
            sql: `INSERT INTO avaliacoes (id, cliente_id, pedido_id, restaurante_id, entregador_id, estrelas, comentario, tipo)
            VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)`,
            args: [req.userId, pedidoId, restauranteId || null, entregadorId || null, estrelas, comentario || '', tipo]
        });
        if (restauranteId) {
            const media = await db_1.db.execute({ sql: 'SELECT AVG(CAST(estrelas AS FLOAT)) as media FROM avaliacoes WHERE restaurante_id = ?', args: [restauranteId] });
            await db_1.db.execute({ sql: 'UPDATE restaurantes SET avaliacao_media = ? WHERE id = ?', args: [media.rows[0].media || 5.0, restauranteId] });
        }
        if (entregadorId) {
            const media = await db_1.db.execute({ sql: 'SELECT AVG(CAST(estrelas AS FLOAT)) as media FROM avaliacoes WHERE entregador_id = ?', args: [entregadorId] });
            await db_1.db.execute({ sql: 'UPDATE entregadores SET avaliacao_media = ? WHERE id = ?', args: [media.rows[0].media || 5.0, entregadorId] });
        }
        res.status(201).json({ mensagem: 'Avaliação registrada com sucesso', id: result.lastInsertRowid });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao criar avaliação' });
    }
});
exports.default = router;
