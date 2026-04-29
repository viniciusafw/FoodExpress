"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const rateLimit_1 = require("./middleware/rateLimit");
const apiLimiter = (0, rateLimit_1.rateLimit)(100, 60_000);
// Routes
const restaurantes_1 = __importDefault(require("./routes/restaurantes"));
const cardapio_1 = __importDefault(require("./routes/cardapio"));
const pedidos_1 = __importDefault(require("./routes/pedidos"));
const entregadores_1 = __importDefault(require("./routes/entregadores"));
const clientes_1 = __importDefault(require("./routes/clientes"));
const avaliacoes_1 = __importDefault(require("./routes/avaliacoes"));
const cupons_1 = __importDefault(require("./routes/cupons"));
const disputas_1 = __importDefault(require("./routes/disputas"));
const tickets_1 = __importDefault(require("./routes/tickets"));
const relatorios_1 = __importDefault(require("./routes/relatorios"));
const rotas_1 = __importDefault(require("./routes/rotas"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const documentos_1 = __importDefault(require("./routes/documentos"));
const auth_1 = __importDefault(require("./routes/auth"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// ── Webhook Stripe precisa do body raw ANTES do express.json() ────────────
app.use('/api/webhooks', express_1.default.raw({ type: 'application/json' }), webhooks_1.default);
// ── Middlewares globais ───────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/', apiLimiter);
// ── Rotas ─────────────────────────────────────────────────────────────────
app.use('/api/restaurantes', restaurantes_1.default);
app.use('/api/cardapio', cardapio_1.default);
app.use('/api/pedidos', pedidos_1.default);
app.use('/api/entregadores', entregadores_1.default);
app.use('/api/clientes', clientes_1.default);
app.use('/api/avaliacoes', avaliacoes_1.default);
app.use('/api/cupons', cupons_1.default);
app.use('/api/disputas', disputas_1.default);
app.use('/api/tickets', tickets_1.default);
app.use('/api/relatorios', relatorios_1.default);
app.use('/api/rotas', rotas_1.default);
app.use('/api/documentos', documentos_1.default);
app.use('/api/auth', auth_1.default);
// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada' });
});
app.listen(PORT, () => {
    console.log(`🚀 FoodExpress Backend rodando na porta ${PORT}`);
});
exports.default = app;
