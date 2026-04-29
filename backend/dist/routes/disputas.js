"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = require("crypto");
const db_1 = require("../lib/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const CATEGORIAS_VALIDAS = ['pedido_incorreto', 'entrega_atrasada', 'quantidade_incorreta', 'qualidade', 'outro'];
// GET /api/disputas
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { status, tipo, filtro } = req.query;
        let sql = 'SELECT * FROM disputas';
        const args = [];
        const where = [];
        if (filtro === 'minhas') {
            where.push('criador_id = ?');
            args.push(req.userId);
        }
        if (status) {
            where.push('status = ?');
            args.push(status);
        }
        if (tipo) {
            where.push('categoria = ?');
            args.push(tipo);
        }
        if (where.length)
            sql += ' WHERE ' + where.join(' AND ');
        sql += ' ORDER BY criado_em DESC';
        const result = await db_1.db.execute({ sql, args });
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao listar disputas' });
    }
});
// GET /api/disputas/:id
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await db_1.db.execute({ sql: 'SELECT * FROM disputas WHERE id = ?', args: [req.params.id] });
        if (!result.rows.length)
            return res.status(404).json({ erro: 'Disputa não encontrada' });
        res.json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar disputa' });
    }
});
// POST /api/disputas
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { pedido_id, tipo_reclamante, categoria, descricao, evidencias } = req.body;
        if (!pedido_id || !tipo_reclamante || !categoria || !descricao)
            return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
        if (!CATEGORIAS_VALIDAS.includes(categoria))
            return res.status(400).json({ erro: 'Categoria inválida' });
        const pedido = await db_1.db.execute({ sql: 'SELECT id FROM pedidos WHERE id = ?', args: [pedido_id] });
        if (!pedido.rows.length)
            return res.status(404).json({ erro: 'Pedido não encontrado' });
        const existente = await db_1.db.execute({ sql: "SELECT id FROM disputas WHERE pedido_id = ? AND status IN ('aberta','aguardando_resposta')", args: [pedido_id] });
        if (existente.rows.length)
            return res.status(409).json({ erro: 'Já existe uma disputa aberta para este pedido' });
        const id = (0, crypto_1.randomUUID)();
        await db_1.db.execute({
            sql: 'INSERT INTO disputas (id, pedido_id, criador_id, tipo_reclamante, categoria, descricao, evidencias, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            args: [id, pedido_id, req.userId, tipo_reclamante, categoria, descricao, evidencias || null, 'aberta']
        });
        res.status(201).json({ mensagem: 'Disputa criada com sucesso', id });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao criar disputa' });
    }
});
// PUT /api/disputas/:id
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { resposta_outra_parte, status, resolucao, resultado, motivo_resolucao } = req.body;
        const sets = [];
        const args = [];
        if (resposta_outra_parte !== undefined) {
            sets.push('resposta_outra_parte = ?', 'status = ?', 'respondido_em = CURRENT_TIMESTAMP');
            args.push(resposta_outra_parte, 'aguardando_resolucao');
        }
        if (status && ['aberta', 'aguardando_resposta', 'aguardando_resolucao', 'resolvida'].includes(status)) {
            sets.push('status = ?');
            args.push(status);
        }
        if (resolucao !== undefined) {
            sets.push('resolucao = ?', 'resultado = ?', 'status = ?', 'resolvido_em = CURRENT_TIMESTAMP');
            args.push(resolucao, resultado ?? null, 'resolvida');
            if (motivo_resolucao) {
                sets.push('motivo_resolucao = ?');
                args.push(motivo_resolucao);
            }
        }
        if (!sets.length)
            return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
        args.push(req.params.id);
        await db_1.db.execute({ sql: `UPDATE disputas SET ${sets.join(', ')} WHERE id = ?`, args });
        res.json({ mensagem: 'Disputa atualizada com sucesso' });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao atualizar disputa' });
    }
});
// DELETE /api/disputas/:id — cancelar
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const disputa = await db_1.db.execute({ sql: 'SELECT status FROM disputas WHERE id = ?', args: [req.params.id] });
        if (!disputa.rows.length)
            return res.status(404).json({ erro: 'Disputa não encontrada' });
        if (disputa.rows[0].status !== 'aberta')
            return res.status(400).json({ erro: 'Disputa já foi respondida ou resolvida' });
        await db_1.db.execute({ sql: "UPDATE disputas SET status = 'cancelada' WHERE id = ?", args: [req.params.id] });
        res.json({ mensagem: 'Disputa cancelada com sucesso' });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao cancelar disputa' });
    }
});
exports.default = router;
