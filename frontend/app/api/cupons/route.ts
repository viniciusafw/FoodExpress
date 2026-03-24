import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Validar cupom
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const codigo = searchParams.get('codigo')
    const pedidoTotal = parseFloat(searchParams.get('total') || '0')

    if (!codigo) {
      return NextResponse.json(
        { erro: 'Código não informado' },
        { status: 400 }
      )
    }

    // Buscar cupom (simular dados)
    const cupons: any = {
      'DESC10': { desconto: 10, tipo: 'percentual', minimo: 30 },
      'DESC20': { desconto: 20, tipo: 'percentual', minimo: 50 },
      'DESC5REAIS': { desconto: 5, tipo: 'fixo', minimo: 25 },
      'PRIMEIRA_VEZ': { desconto: 15, tipo: 'percentual', minimo: 0 }
    }

    const cupom = cupons[codigo.toUpperCase()]

    if (!cupom) {
      return NextResponse.json(
        { valido: false, erro: 'Cupom inválido' },
        { status: 400 }
      )
    }

    if (pedidoTotal < cupom.minimo) {
      return NextResponse.json(
        { valido: false, erro: `Valor mínimo é R$ ${cupom.minimo.toFixed(2)}` },
        { status: 400 }
      )
    }

    const desconto_valor = cupom.tipo === 'percentual'
      ? (pedidoTotal * cupom.desconto) / 100
      : cupom.desconto

    return NextResponse.json({
      valido: true,
      codigo: codigo.toUpperCase(),
      desconto: cupom.desconto,
      tipo: cupom.tipo,
      desconto_valor: desconto_valor.toFixed(2)
    })
  } catch (erro) {
    console.error('Erro ao validar cupom:', erro)
    return NextResponse.json(
      { erro: 'Erro ao validar cupom' },
      { status: 500 }
    )
  }
}

// POST - Criar cupom (admin)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { codigo, desconto, tipo, minimo, data_expiracao } = body

    if (!codigo || !desconto || !tipo) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios faltando' },
        { status: 400 }
      )
    }

    const resultado = await db.execute({
      sql: `INSERT INTO cupons
            (codigo, desconto, tipo, minimo, data_expiracao, ativo)
            VALUES (?, ?, ?, ?, ?, 1)`,
      args: [codigo.toUpperCase(), desconto, tipo, minimo || 0, data_expiracao || null]
    })

    return NextResponse.json(
      {
        mensagem: 'Cupom criado com sucesso',
        id: resultado.lastInsertRowid
      },
      { status: 201 }
    )
  } catch (erro) {
    console.error('Erro ao criar cupom:', erro)
    return NextResponse.json(
      { erro: 'Erro ao criar cupom' },
      { status: 500 }
    )
  }
}
