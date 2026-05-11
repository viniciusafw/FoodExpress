// @ts-nocheck
import { Router, Request, Response } from 'express'
import Stripe from 'stripe'
import { db } from '../lib/db'

const router = Router()

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key === 'sk_test_xxxxx') return null
  return new Stripe(key)
}

// POST /api/webhooks/stripe
// Nota: este endpoint precisa receber o body raw (não parseado como JSON)
// No index.ts, registre ANTES do express.json()
router.post('/stripe', async (req: Request, res: Response) => {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripe || !webhookSecret) {
    return res.status(200).json({ received: true, modo: 'stripe_nao_configurado' })
  }

  const sig = req.headers['stripe-signature'] as string
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature inválida:', err)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      await db.execute({
        sql: `UPDATE pedidos
              SET pagamento_status = 'aprovado', status = 'confirmado', confirmado_em = CURRENT_TIMESTAMP
              WHERE pagamento_id = ?`,
        args: [pi.id]
      })
      console.log(`Pagamento aprovado: ${pi.id}`)
      break
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      await db.execute({
        sql: `UPDATE pedidos SET pagamento_status = 'recusado' WHERE pagamento_id = ?`,
        args: [pi.id]
      })
      console.log(`Pagamento recusado: ${pi.id}`)
      break
    }
    default:
      console.log(`Evento Stripe não tratado: ${event.type}`)
  }

  res.json({ received: true })
})

export default router
