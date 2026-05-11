// @ts-nocheck
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

import { rateLimit } from './middleware/rateLimit'
const apiLimiter = rateLimit(100, 60_000)

// Routes
import restaurantesRouter  from './routes/restaurantes'
import cardapioRouter      from './routes/cardapio'
import pedidosRouter       from './routes/pedidos'
import entregadoresRouter  from './routes/entregadores'
import clientesRouter      from './routes/clientes'
import avaliacoesRouter    from './routes/avaliacoes'
import cuponsRouter        from './routes/cupons'
import disputasRouter      from './routes/disputas'
import ticketsRouter       from './routes/tickets'
import relatoriosRouter    from './routes/relatorios'
import rotasRouter         from './routes/rotas'
import webhooksRouter      from './routes/webhooks'
import documentosRouter    from './routes/documentos'
import cnpjRouter           from './routes/cnpj'
import authRouter          from './routes/auth'
import { ensureDatabaseHealth } from './lib/schema'

const app = express()
const PORT = process.env.PORT || 3001
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3002',
  'http://127.0.0.1:3002',
]

// ── Webhook Stripe precisa do body raw ANTES do express.json() ────────────
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhooksRouter)

// ── Middlewares globais ───────────────────────────────────────────────────
app.use(cors({
  origin(origin, callback) {
    // Permite requests sem Origin (health checks/curl/apps locais)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error(`Origin não permitida: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Email', 'X-User-Name'],
}))
app.options('*', cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api/', apiLimiter)

// ── Rotas ─────────────────────────────────────────────────────────────────
app.use('/api/restaurantes',  restaurantesRouter)
app.use('/api/cardapio',      cardapioRouter)
app.use('/api/pedidos',       pedidosRouter)
app.use('/api/entregadores',  entregadoresRouter)
app.use('/api/clientes',      clientesRouter)
app.use('/api/avaliacoes',    avaliacoesRouter)
app.use('/api/cupons',        cuponsRouter)
app.use('/api/disputas',      disputasRouter)
app.use('/api/tickets',       ticketsRouter)
app.use('/api/relatorios',    relatoriosRouter)
app.use('/api/rotas',         rotasRouter)
app.use('/api/documentos',   documentosRouter)
app.use('/api/cnpj',          cnpjRouter)
app.use('/api/auth',          authRouter)

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' })
})

ensureDatabaseHealth()
  .then(() => console.log('✅ Schema validado automaticamente'))
  .catch((error) => console.error('⚠️ Auto-migration falhou:', error.message))

app.listen(PORT, () => {
  console.log(`🚀 FoodExpress Backend rodando na porta ${PORT}`)
})

export default app
