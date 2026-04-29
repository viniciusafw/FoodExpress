"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/entregadores
router.get('/', async (req, res) => {
    try {
        const { status, limite = '50' } = req.query;
        let sql = 'SELECT * FROM entregadores';
        const args = [];
        if (status) {
            sql += ' WHERE status = ?';
            args.push(status);
        }
        sql += ' ORDER BY created_at DESC LIMIT ?';
        args.push(parseInt(limite));
        const result = await db_1.db.execute({ sql, args });
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao listar entregadores' });
    }
});
// GET /api/entregadores/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await db_1.db.execute({ sql: 'SELECT * FROM entregadores WHERE id = ?', args: [req.params.id] });
        if (!result.rows.length)
            return res.status(404).json({ erro: 'Entregador não encontrado' });
        res.json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar entregador' });
    }
});
// POST /api/entregadores
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { nome, cpf, email, telefone, veiculo_tipo, placa_veiculo } = req.body;
        if (!nome || !cpf || !veiculo_tipo)
            return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
        const existente = await db_1.db.execute({ sql: 'SELECT id FROM entregadores WHERE cpf = ?', args: [cpf] });
        if (existente.rows.length)
            return res.status(409).json({ erro: 'CPF já cadastrado' });
        const result = await db_1.db.execute({
            sql: `INSERT INTO entregadores (id, user_id, nome, email, cpf, telefone, veiculo_tipo, veiculo_placa, status, latitude, longitude, avaliacao_media, total_entregas)
            VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, 'disponivel', 0, 0, 5.0, 0)`,
            args: [req.userId, nome, email || '', cpf, telefone || '', veiculo_tipo, placa_veiculo || '']
        });
        res.status(201).json({ mensagem: 'Entregador criado com sucesso', id: result.lastInsertRowid });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao criar entregador' });
    }
});
// PUT /api/entregadores/:id
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { status, latitude, longitude, avaliacao_media } = req.body;
        const sets = ['ultima_atualizacao = CURRENT_TIMESTAMP'];
        const args = [];
        if (status) {
            sets.push('status = ?');
            args.push(status);
        }
        if (latitude !== undefined) {
            sets.push('latitude = ?');
            args.push(latitude);
        }
        if (longitude !== undefined) {
            sets.push('longitude = ?');
            args.push(longitude);
        }
        if (avaliacao_media !== undefined) {
            sets.push('avaliacao_media = ?');
            args.push(avaliacao_media);
        }
        args.push(req.params.id);
        await db_1.db.execute({ sql: `UPDATE entregadores SET ${sets.join(', ')} WHERE id = ?`, args });
        res.json({ mensagem: 'Entregador atualizado com sucesso' });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao atualizar entregador' });
    }
});
// POST /api/entregadores/cadastro — cria registro inicial ao selecionar role
router.post('/cadastro', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.userId;
        const existente = await db_1.db.execute({ sql: 'SELECT id FROM entregadores WHERE user_id = ?', args: [userId] });
        if (existente.rows.length)
            return res.json(existente.rows[0]);
        const { nome, email } = req.body;
        const id = `ent_${userId}`;
        await db_1.db.execute({
            sql: `INSERT INTO entregadores (id, user_id, nome, email, telefone, cpf, veiculo_tipo, status, latitude, longitude, avaliacao_media, total_entregas)
            VALUES (?, ?, ?, ?, '', '000.000.000-00', 'moto', 'disponivel', 0, 0, 0, 0)`,
            args: [id, userId, nome || 'Entregador', email || '']
        });
        res.status(201).json({ id, nome, email });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao criar entregador' });
    }
});
// GET /api/entregadores/cadastro — busca entregador do usuário logado
router.get('/cadastro', auth_1.requireAuth, async (req, res) => {
    try {
        const result = await db_1.db.execute({ sql: 'SELECT * FROM entregadores WHERE user_id = ?', args: [req.userId] });
        if (!result.rows.length)
            return res.status(404).json({ erro: 'Entregador não encontrado' });
        res.json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar entregador' });
    }
});
// DELETE /api/entregadores/:id — soft delete
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        await db_1.db.execute({ sql: "UPDATE entregadores SET status = 'inativo' WHERE id = ?", args: [req.params.id] });
        res.json({ mensagem: 'Entregador desativado com sucesso' });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao desativar entregador' });
    }
});
// POST /api/entregadores/:id/disponibilidade — toggle online/offline (UC013)
router.post('/:id/disponibilidade', auth_1.requireAuth, async (req, res) => {
    try {
        const { disponivel } = req.body;
        if (typeof disponivel !== 'boolean')
            return res.status(400).json({ erro: 'Campo disponivel deve ser booleano' });
        const entregador = await db_1.db.execute({ sql: 'SELECT id FROM entregadores WHERE id = ?', args: [req.params.id] });
        if (!entregador.rows.length)
            return res.status(404).json({ erro: 'Entregador não encontrado' });
        const novo_status = disponivel ? 'disponivel' : 'ausente';
        await db_1.db.execute({ sql: 'UPDATE entregadores SET status = ?, ultima_atualizacao = CURRENT_TIMESTAMP WHERE id = ?', args: [novo_status, req.params.id] });
        res.json({ mensagem: `Entregador marcado como ${novo_status}`, disponivel, status: novo_status });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao atualizar disponibilidade' });
    }
});
exports.default = router;
