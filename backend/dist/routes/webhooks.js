"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const db_1 = require("../lib/db");
const router = (0, express_1.Router)();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '');
// POST /api/webhooks/stripe
// Nota: este endpoint precisa receber o body raw (não parseado como JSON)
// No index.ts, registre ANTES do express.json()
router.post('/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    }
    catch (err) {
        console.error('Webhook signature inválida:', err);
        return res.status(400).json({ error: 'Invalid signature' });
    }
    switch (event.type) {
        case 'payment_intent.succeeded': {
            const pi = event.data.object;
            await db_1.db.execute({
                sql: `UPDATE pedidos
              SET pagamento_status = 'aprovado', status = 'confirmado', confirmado_em = CURRENT_TIMESTAMP
              WHERE pagamento_id = ?`,
                args: [pi.id]
            });
            console.log(`Pagamento aprovado: ${pi.id}`);
            break;
        }
        case 'payment_intent.payment_failed': {
            const pi = event.data.object;
            await db_1.db.execute({
                sql: `UPDATE pedidos SET pagamento_status = 'recusado' WHERE pagamento_id = ?`,
                args: [pi.id]
            });
            console.log(`Pagamento recusado: ${pi.id}`);
            break;
        }
        default:
            console.log(`Evento Stripe não tratado: ${event.type}`);
    }
    res.json({ received: true });
});
exports.default = router;
