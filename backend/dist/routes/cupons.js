"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const CUPONS_ESTATICOS = {
    'DESC10': { desconto: 10, tipo: 'percentual', minimo: 30 },
    'DESC20': { desconto: 20, tipo: 'percentual', minimo: 50 },
    'DESC5REAIS': { desconto: 5, tipo: 'fixo', minimo: 25 },
    'PRIMEIRA_VEZ': { desconto: 15, tipo: 'percentual', minimo: 0 }
};
// GET /api/cupons — validar cupom
router.get('/', async (req, res) => {
    try {
        const codigo = String(req.query.codigo || '').toUpperCase();
        const total = parseFloat(String(req.query.total || '0'));
        if (!codigo)
            return res.status(400).json({ erro: 'Código não informado' });
        // Tenta no banco primeiro
        const dbCupom = await db_1.db.execute({ sql: 'SELECT * FROM cupons WHERE codigo = ? AND ativo = 1', args: [codigo] }).catch(() => null);
        const cupom = dbCupom?.rows[0] || CUPONS_ESTATICOS[codigo];
        if (!cupom)
            return res.status(400).json({ valido: false, erro: 'Cupom inválido' });
        const minimo = Number(cupom.minimo || 0);
        if (total < minimo)
            return res.status(400).json({ valido: false, erro: `Valor mínimo é R$ ${minimo.toFixed(2)}` });
        const desconto_valor = cupom.tipo === 'percentual' ? (total * Number(cupom.desconto)) / 100 : Number(cupom.desconto);
        res.json({ valido: true, codigo, desconto: cupom.desconto, tipo: cupom.tipo, desconto_valor: desconto_valor.toFixed(2) });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao validar cupom' });
    }
});
// POST /api/cupons — criar cupom (gerente)
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { codigo, desconto, tipo, minimo, data_expiracao } = req.body;
        if (!codigo || !desconto || !tipo)
            return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
        const result = await db_1.db.execute({
            sql: 'INSERT INTO cupons (id, codigo, desconto, tipo, minimo, data_expiracao, ativo) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, 1)',
            args: [codigo.toUpperCase(), desconto, tipo, minimo || 0, data_expiracao || null]
        });
        res.status(201).json({ mensagem: 'Cupom criado com sucesso', id: result.lastInsertRowid });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao criar cupom' });
    }
});
exports.default = router;
