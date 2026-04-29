"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/cardapio
router.get('/', async (req, res) => {
    try {
        const { restauranteId, categoria } = req.query;
        let sql = 'SELECT * FROM cardapio WHERE disponivel = 1';
        const args = [];
        if (restauranteId) {
            sql += ' AND restaurante_id = ?';
            args.push(restauranteId);
        }
        if (categoria) {
            sql += ' AND categoria = ?';
            args.push(categoria);
        }
        sql += ' ORDER BY destaque DESC, nome ASC';
        const result = await db_1.db.execute({ sql, args });
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao listar cardápio' });
    }
});
// GET /api/cardapio/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await db_1.db.execute({ sql: 'SELECT * FROM cardapio WHERE id = ?', args: [req.params.id] });
        if (!result.rows.length)
            return res.status(404).json({ erro: 'Item não encontrado' });
        res.json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar item' });
    }
});
// POST /api/cardapio
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { restauranteId, nome, preco, categoria, descricao, imagem, tempo_preparo } = req.body;
        if (!restauranteId || !nome || !preco || !categoria)
            return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
        const result = await db_1.db.execute({
            sql: `INSERT INTO cardapio (id, restaurante_id, nome, preco, categoria, descricao, imagem, tempo_preparo, disponivel)
            VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, 1)`,
            args: [restauranteId, nome, preco, categoria, descricao || '', imagem || '', tempo_preparo || 30]
        });
        res.status(201).json({ mensagem: 'Item adicionado ao cardápio', id: result.lastInsertRowid });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao criar item' });
    }
});
// PUT /api/cardapio/:id
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { nome, preco, categoria, descricao, disponivel, destaque } = req.body;
        const sets = [];
        const args = [];
        if (nome) {
            sets.push('nome = ?');
            args.push(nome);
        }
        if (preco !== undefined) {
            sets.push('preco = ?');
            args.push(preco);
        }
        if (categoria) {
            sets.push('categoria = ?');
            args.push(categoria);
        }
        if (descricao !== undefined) {
            sets.push('descricao = ?');
            args.push(descricao);
        }
        if (disponivel !== undefined) {
            sets.push('disponivel = ?');
            args.push(disponivel ? 1 : 0);
        }
        if (destaque !== undefined) {
            sets.push('destaque = ?');
            args.push(destaque ? 1 : 0);
        }
        if (!sets.length)
            return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
        args.push(req.params.id);
        await db_1.db.execute({ sql: `UPDATE cardapio SET ${sets.join(', ')} WHERE id = ?`, args });
        res.json({ mensagem: 'Item atualizado com sucesso' });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao atualizar item' });
    }
});
// DELETE /api/cardapio/:id — soft delete
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        await db_1.db.execute({ sql: 'UPDATE cardapio SET disponivel = 0 WHERE id = ?', args: [req.params.id] });
        res.json({ mensagem: 'Item removido do cardápio' });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao remover item' });
    }
});
exports.default = router;
