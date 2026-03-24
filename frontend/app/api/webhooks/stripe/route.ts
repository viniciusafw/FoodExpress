// frontend/app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/frontend/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object
      await handlePaymentSuccess(paymentIntent)
      break
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object
      await handlePaymentFailed(failedPayment)
      break
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  // Atualizar status do pagamento no pedido
  await db.execute({
    sql: `
      UPDATE pedidos 
      SET pagamento_status = 'aprovado', 
          status = 'confirmado',
          confirmado_em = CURRENT_TIMESTAMP
      WHERE pagamento_id = ?
    `,
    args: [paymentIntent.id]
  })

  // Notificar restaurante
  // Implementar notificação
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Atualizar status do pagamento
  await db.execute({
    sql: 'UPDATE pedidos SET pagamento_status = "recusado" WHERE pagamento_id = ?',
    args: [paymentIntent.id]
  })
}