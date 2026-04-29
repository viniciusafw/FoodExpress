"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const db_1 = require("../lib/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
// GET /api/pedidos
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { status, clienteId, restauranteId, entregadorId } = req.query;
        let sql = 'SELECT * FROM pedidos WHERE 1=1';
        const args = [];
        if (status) {
            sql += ' AND status = ?';
            args.push(status);
        }
        if (clienteId) {
            sql += ' AND cliente_id = ?';
            args.push(clienteId);
        }
        if (restauranteId) {
            sql += ' AND restaurante_id = ?';
            args.push(restauranteId);
        }
        if (entregadorId) {
            sql += ' AND entregador_id = ?';
            args.push(entregadorId);
        }
        sql += ' ORDER BY created_at DESC LIMIT 100';
        const result = await db_1.db.execute({ sql, args });
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao listar pedidos' });
    }
});
// GET /api/pedidos/:id
router.get('/:id', async (req, res) => {
    try {
        const result = await db_1.db.execute({ sql: 'SELECT * FROM pedidos WHERE id = ?', args: [req.params.id] });
        if (!result.rows.length)
            return res.status(404).json({ erro: 'Pedido não encontrado' });
        res.json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar pedido' });
    }
});
// POST /api/pedidos
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { clienteId, restauranteId, itens, endereco_entrega, latitude, longitude, forma_pagamento = 'cartao' } = req.body;
        if (!clienteId || !restauranteId || !itens?.length)
            return res.status(400).json({ erro: 'Dados obrigatórios faltando' });
        const restaurante = await db_1.db.execute({ sql: 'SELECT * FROM restaurantes WHERE id = ?', args: [restauranteId] });
        if (!restaurante.rows.length)
            return res.status(404).json({ erro: 'Restaurante não encontrado' });
        let subtotal = 0;
        for (const item of itens) {
            const cardapioItem = await db_1.db.execute({ sql: 'SELECT preco FROM cardapio WHERE id = ?', args: [item.id] });
            if (cardapioItem.rows.length)
                subtotal += Number(cardapioItem.rows[0].preco) * (item.quantidade || 1);
        }
        const dist = calcularDistancia(Number(restaurante.rows[0].latitude), Number(restaurante.rows[0].longitude), latitude || 0, longitude || 0);
        const taxa_entrega = dist > 5 ? 12 : dist > 3 ? 8 : 5;
        const total = subtotal + taxa_entrega;
        let pagamento_id = null;
        let clientSecret = null;
        if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_xxxxx') {
            const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
            const intent = await stripe.paymentIntents.create({
                amount: Math.round(total * 100),
                currency: 'brl',
                description: `Pedido - ${restaurante.rows[0].nome}`
            });
            pagamento_id = intent.id;
            clientSecret = intent.client_secret;
        }
        const result = await db_1.db.execute({
            sql: `INSERT INTO pedidos
            (id, cliente_id, restaurante_id, status, itens, endereco_entrega, latitude_entrega, longitude_entrega,
             subtotal, taxa_entrega, total, forma_pagamento, pagamento_id, pagamento_status)
            VALUES (lower(hex(randomblob(16))), ?, ?, 'pendente', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
            args: [clienteId, restauranteId, JSON.stringify(itens), endereco_entrega || '', latitude || 0, longitude || 0,
                subtotal, taxa_entrega, total, forma_pagamento, pagamento_id]
        });
        res.status(201).json({ mensagem: 'Pedido criado com sucesso', id: result.lastInsertRowid, clientSecret, total });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao criar pedido' });
    }
});
// PUT /api/pedidos/:id
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { status, tempo_preparo_estimado } = req.body;
        const sets = ['updated_at = current_timestamp'];
        const args = [];
        if (status) {
            sets.push('status = ?');
            args.push(status);
        }
        if (tempo_preparo_estimado !== undefined) {
            sets.push('tempo_preparo_estimado = ?');
            args.push(tempo_preparo_estimado);
        }
        args.push(req.params.id);
        await db_1.db.execute({ sql: `UPDATE pedidos SET ${sets.join(', ')} WHERE id = ?`, args });
        res.json({ mensagem: 'Pedido atualizado com sucesso' });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao atualizar pedido' });
    }
});
// DELETE /api/pedidos/:id — cancelar
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const pedido = await db_1.db.execute({ sql: 'SELECT created_at, total FROM pedidos WHERE id = ?', args: [req.params.id] });
        if (!pedido.rows.length)
            return res.status(404).json({ erro: 'Pedido não encontrado' });
        const tempoDecorrido = (Date.now() - new Date(String(pedido.rows[0].created_at)).getTime()) / 60000;
        await db_1.db.execute({ sql: "UPDATE pedidos SET status = 'cancelado' WHERE id = ?", args: [req.params.id] });
        const multa = tempoDecorrido > 5 ? Number(pedido.rows[0].total) * 0.5 : 0;
        res.json({ mensagem: 'Pedido cancelado', multa });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao cancelar pedido' });
    }
});
// GET /api/pedidos/:id/rastrear
router.get('/:id/rastrear', async (req, res) => {
    try {
        const result = await db_1.db.execute({
            sql: `SELECT p.*,
              r.nome as restaurante_nome, r.latitude as rest_lat, r.longitude as rest_lng,
              e.nome as entregador_nome, e.latitude as entregador_lat, e.longitude as entregador_lng,
              c.nome as cliente_nome
            FROM pedidos p
            LEFT JOIN restaurantes r ON p.restaurante_id = r.id
            LEFT JOIN entregadores e ON p.entregador_id = e.id
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE p.id = ?`,
            args: [req.params.id]
        });
        if (!result.rows.length)
            return res.status(404).json({ erro: 'Pedido não encontrado' });
        const p = result.rows[0];
        if (!p.entregador_id)
            return res.json({ pedido_id: p.id, status: p.status, mensagem: 'Aguardando entregador' });
        const dist = calcularDistancia(Number(p.entregador_lat), Number(p.entregador_lng), Number(p.latitude_entrega), Number(p.longitude_entrega));
        res.json({
            pedido_id: p.id, status: p.status,
            restaurante: { nome: p.restaurante_nome, localizacao: { lat: p.rest_lat, lng: p.rest_lng } },
            entregador: { id: p.entregador_id, nome: p.entregador_nome, localizacao_atual: { lat: p.entregador_lat, lng: p.entregador_lng } },
            destino: { endereco: p.endereco_entrega, localizacao: { lat: p.latitude_entrega, lng: p.longitude_entrega } },
            rota: {
                distancia_atual_km: Math.round(dist * 100) / 100,
                tempo_estimado_minutos: Math.ceil((dist / 25) * 60),
                progresso_percentual: p.distancia_km ? Math.round(((Number(p.distancia_km) - dist) / Number(p.distancia_km)) * 100) : 0
            },
            timeline: { confirmado_em: p.confirmado_em, pronto_em: p.pronto_em, entregue_em: p.entregue_em }
        });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar rastreamento' });
    }
});
// POST /api/pedidos/:id/atribuir-entregador
router.post('/:id/atribuir-entregador', auth_1.requireAuth, async (req, res) => {
    try {
        const { entregadorId } = req.body;
        const entregador = await db_1.db.execute({ sql: 'SELECT * FROM entregadores WHERE id = ? AND status = "disponivel"', args: [entregadorId] });
        if (!entregador.rows.length)
            return res.status(400).json({ erro: 'Entregador não disponível' });
        await db_1.db.execute({ sql: 'UPDATE pedidos SET entregador_id = ?, status = "entregando" WHERE id = ?', args: [entregadorId, req.params.id] });
        await db_1.db.execute({ sql: 'UPDATE entregadores SET status = "ocupado" WHERE id = ?', args: [entregadorId] });
        const pedido = await db_1.db.execute({ sql: 'SELECT * FROM pedidos WHERE id = ?', args: [req.params.id] });
        const rest = await db_1.db.execute({ sql: 'SELECT latitude, longitude FROM restaurantes WHERE id = ?', args: [pedido.rows[0].restaurante_id] });
        const p = pedido.rows[0];
        const r = rest.rows[0];
        await db_1.db.execute({
            sql: `INSERT INTO rotas (id, pedido_id, entregador_id, origem_lat, origem_lng, destino_lat, destino_lng)
            VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)`,
            args: [req.params.id, entregadorId, r.latitude, r.longitude, p.latitude_entrega, p.longitude_entrega]
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ erro: 'Erro ao atribuir entregador' });
    }
});
// POST /api/pedidos/:id/atribuir-entregador-automatico
router.post('/:id/atribuir-entregador-automatico', auth_1.requireAuth, async (req, res) => {
    try {
        const pedido = await db_1.db.execute({
            sql: `SELECT p.*, r.latitude as rest_lat, r.longitude as rest_lng
            FROM pedidos p JOIN restaurantes r ON p.restaurante_id = r.id WHERE p.id = ?`,
            args: [req.params.id]
        });
        if (!pedido.rows.length)
            return res.status(404).json({ erro: 'Pedido não encontrado' });
        const p = pedido.rows[0];
        if (p.entregador_id)
            return res.status(400).json({ erro: 'Pedido já tem entregador atribuído' });
        const disponiveis = await db_1.db.execute({
            sql: "SELECT * FROM entregadores WHERE status = 'disponivel' ORDER BY ultima_atualizacao DESC LIMIT 20",
            args: []
        });
        if (!disponiveis.rows.length)
            return res.status(503).json({ erro: 'Nenhum entregador disponível no momento' });
        function haversine(lat1, lng1, lat2, lng2) {
            const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
        const comDistancia = disponiveis.rows.map(e => ({
            ...e, distancia: haversine(p.rest_lat, p.rest_lng, e.latitude, e.longitude)
        })).sort((a, b) => a.distancia - b.distancia);
        const escolhido = comDistancia[0];
        const tempo_estimado = Math.ceil(escolhido.distancia * 3);
        await db_1.db.execute({
            sql: "UPDATE pedidos SET entregador_id = ?, status = 'entregando', tempo_entrega_estimado = ?, distancia_km = ? WHERE id = ?",
            args: [escolhido.id, tempo_estimado, escolhido.distancia, req.params.id]
        });
        await db_1.db.execute({ sql: "UPDATE entregadores SET status = 'ocupado' WHERE id = ?", args: [escolhido.id] });
        res.json({
            mensagem: 'Entregador atribuído automaticamente',
            entregador_id: escolhido.id,
            entregador_nome: escolhido.nome,
            distancia_km: escolhido.distancia.toFixed(2),
            tempo_estimado_minutos: tempo_estimado
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao atribuir entregador' });
    }
});
exports.default = router;
