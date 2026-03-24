import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// GET - Listar pedidos com filtros
export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clienteId = searchParams.get('clienteId')
    const restauranteId = searchParams.get('restauranteId')
    const entregadorId = searchParams.get('entregadorId')

    let sql = 'SELECT * FROM pedidos WHERE 1=1'
    const args: any[] = []

    if (status) {
      sql += ' AND status = ?'
      args.push(status)
    }

    if (clienteId) {
      sql += ' AND cliente_id = ?'
      args.push(clienteId)
    }

    if (restauranteId) {
      sql += ' AND restaurante_id = ?'
      args.push(restauranteId)
    }

    if (entregadorId) {
      sql += ' AND entregador_id = ?'
      args.push(entregadorId)
    }

    sql += ' ORDER BY created_at DESC LIMIT 100'

    const pedidos = await db.execute({
      sql,
      args
    })

    return NextResponse.json(pedidos.rows)
  } catch (error) {
    console.error('Erro ao listar pedidos:', error)
    return NextResponse.json(
      { erro: 'Erro ao listar pedidos' },
      { status: 500 }
    )
  }
}

// POST - Criar novo pedido
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { erro: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { clienteId, restauranteId, itens, endereco_entrega, latitude, longitude } = body

    // Validar campos obrigatórios
    if (!clienteId || !restauranteId || !itens || itens.length === 0) {
      return NextResponse.json(
        { erro: 'Dados obrigatórios faltando' },
        { status: 400 }
      )
    }

    // Buscar restaurante para validar
    const restaurante = await db.execute({
      sql: 'SELECT * FROM restaurantes WHERE id = ?',
      args: [restauranteId]
    })

    if (restaurante.rows.length === 0) {
      return NextResponse.json(
        { erro: 'Restaurante não encontrado' },
        { status: 404 }
      )
    }

    // Calcular subtotal dos itens
    let subtotal = 0
    const itensArray = Array.isArray(itens) ? itens : [itens]

    for (const item of itensArray) {
      const cardapioItem = await db.execute({
        sql: 'SELECT preco FROM cardapio WHERE id = ?',
        args: [item.id]
      })

      if (cardapioItem.rows.length > 0) {
        subtotal += cardapioItem.rows[0].preco * (item.quantidade || 1)
      }
    }

    // Calcular taxa de entrega baseada em distância
    // RN003: até 3km (R$5), 3-5km (R$8), 5-8km (R$12)
    const distancia = calculateDistance(
      restaurante.rows[0].latitude,
      restaurante.rows[0].longitude,
      latitude || 0,
      longitude || 0
    )

    let taxa_entrega = 5
    if (distancia > 5) taxa_entrega = 12
    else if (distancia > 3) taxa_entrega = 8

    const total = subtotal + taxa_entrega

    // Criar intent no Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'brl',
      description: `Pedido do restaurante ${restaurante.rows[0].nome}`
    })

    // Salvar pedido no banco
    const resultado = await db.execute({
      sql: `INSERT INTO pedidos
            (cliente_id, restaurante_id, status, itens, endereco_entrega, latitude, longitude,
             subtotal, taxa_entrega, total, pagamento_id, pagamento_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        clienteId,
        restauranteId,
        'pendente',
        JSON.stringify(itensArray),
        endereco_entrega || '',
        latitude || 0,
        longitude || 0,
        subtotal,
        taxa_entrega,
        total,
        paymentIntent.id,
        'pendente'
      ]
    })

    return NextResponse.json(
      {
        mensagem: 'Pedido criado com sucesso',
        id: resultado.lastInsertRowid,
        clientSecret: paymentIntent.client_secret,
        total
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    return NextResponse.json(
      { erro: 'Erro ao criar pedido' },
      { status: 500 }
    )
  }
}

// Função auxiliar para calcular distância (Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
