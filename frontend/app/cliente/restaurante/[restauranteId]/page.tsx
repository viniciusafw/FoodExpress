'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface CardapioItem {
  id: number
  nome: string
  preco: number
  categoria: string
}

interface ItemCarrinho {
  id: number
  nome: string
  preco: number
  quantidade: number
}

interface Cupom {
  codigo: string
  desconto: number
  tipo: 'percentual' | 'fixo'
  desconto_valor: string
}

export default function CheckoutPage({ params }: { params: { restauranteId: string } }) {
  const router = useRouter()
  const [cardapio] = useState<CardapioItem[]>([
    { id: 1, nome: 'Pizza Grande', preco: 35.90, categoria: 'Pizzas' },
    { id: 2, nome: 'Refrigerante 2L', preco: 10.00, categoria: 'Bebidas' },
    { id: 3, nome: 'Sobremesa', preco: 12.00, categoria: 'Sobremesas' },
  ])

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [endereco, setEndereco] = useState('')
  const [cupom, setCupom] = useState<Cupom | null>(null)
  const [codigoCupom, setCodigoCupom] = useState('')
  const [processando, setProcessando] = useState(false)

  const adicionarAoCarrinho = (item: CardapioItem) => {
    const existente = carrinho.find(i => i.id === item.id)
    if (existente) {
      setCarrinho(carrinho.map(i =>
        i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i
      ))
    } else {
      setCarrinho([...carrinho, { ...item, quantidade: 1 }])
    }
  }

  const removerDoCarrinho = (id: number) => {
    setCarrinho(carrinho.filter(i => i.id !== id))
  }

  const validarCupom = async () => {
    try {
      const subtotal = carrinho.reduce((a, i) => a + i.preco * i.quantidade, 0)
      const res = await fetch(`/api/cupons?codigo=${codigoCupom}&total=${subtotal}`)

      if (res.ok) {
        const dados = await res.json()
        setCupom(dados)
        setCodigoCupom('')
      } else {
        const erro = await res.json()
        alert(erro.erro || 'Cupom inválido')
      }
    } catch (erro) {
      console.error('Erro:', erro)
      alert('Erro ao validar cupom')
    }
  }

  const calcularTotal = () => {
    const subtotal = carrinho.reduce((a, i) => a + i.preco * i.quantidade, 0)
    const taxa = 5
    const desconto = cupom ? parseFloat(cupom.desconto_valor) : 0
    return { subtotal, taxa, desconto, total: subtotal + taxa - desconto }
  }

  const finalizarPedido = async () => {
    if (!endereco || carrinho.length === 0) {
      alert('Preencha o endereço e adicione itens')
      return
    }

    try {
      setProcessando(true)
      const { total } = calcularTotal()

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: 'user_1',
          restauranteId: params.restauranteId,
          itens: carrinho,
          endereco_entrega: endereco,
          cupom_codigo: cupom?.codigo || null
        })
      })

      if (res.ok) {
        router.push('/cliente?tab=pedidos')
      }
    } catch (erro) {
      console.error('Erro:', erro)
      alert('Erro ao processarpedido')
    } finally {
      setProcessando(false)
    }
  }

  const { subtotal, taxa, desconto, total } = calcularTotal()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/cliente" className="text-orange-600 text-sm hover:text-orange-700">
            ← Voltar
          </Link>
          <h1 className="text-3xl font-bold mt-2">Fazer Pedido</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-2xl font-bold mb-6">Cardápio</h2>
              <div className="space-y-4">
                {cardapio.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-4 border-b hover:bg-gray-50">
                    <div>
                      <h3 className="font-semibold">{item.nome}</h3>
                      <p className="text-sm text-gray-600">{item.categoria}</p>
                      <p className="text-lg font-bold text-orange-600 mt-1">R$ {item.preco.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => adicionarAoCarrinho(item)}
                      className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Carrinho */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border p-6 sticky top-4">
              <h2 className="text-2xl font-bold mb-6">Seu Pedido</h2>

              {carrinho.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Carrinho vazio</p>
              ) : (
                <>
                  {/* Itens */}
                  <div className="space-y-3 mb-6 border-b pb-6 max-h-48 overflow-y-auto">
                    {carrinho.map(item => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{item.nome}</p>
                          <p className="text-sm text-gray-600">{item.quantidade}x R$ {item.preco.toFixed(2)}</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-bold text-orange-600">R$ {(item.preco * item.quantidade).toFixed(2)}</p>
                          <button
                            onClick={() => removerDoCarrinho(item.id)}
                            className="text-xs text-red-600 hover:text-red-700 mt-1"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cupom */}
                  <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-200">
                    <label className="block text-sm font-semibold mb-2">Código de Desconto</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={codigoCupom}
                        onChange={(e) => setCodigoCupom(e.target.value.toUpperCase())}
                        placeholder="Ex: DESC10"
                        className="flex-1 border rounded px-3 py-2 text-sm"
                      />
                      <button
                        onClick={validarCupom}
                        className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                      >
                        Validar
                      </button>
                    </div>
                    {cupom && (
                      <p className="text-sm text-green-700 mt-2">
                        ✓ Cupom aplicado: -{cupom.tipo === 'percentual' ? `${cupom.desconto}%` : `R$ ${cupom.desconto_valor}`}
                      </p>
                    )}
                  </div>

                  {/* Resumo */}
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between">
                      <p>Subtotal:</p>
                      <p className="font-semibold">R$ {subtotal.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p>Taxa de Entrega:</p>
                      <p className="font-semibold">R$ {taxa.toFixed(2)}</p>
                    </div>
                    {desconto > 0 && (
                      <div className="flex justify-between text-green-600">
                        <p>Desconto:</p>
                        <p className="font-semibold">-R$ {desconto.toFixed(2)}</p>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 text-lg font-bold">
                      <p>Total:</p>
                      <p className="text-orange-600">R$ {total.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">Endereço de Entrega</label>
                    <input
                      type="text"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Rua, número, complemento"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>

                  {/* Botão */}
                  <button
                    onClick={finalizarPedido}
                    disabled={processando}
                    className={`w-full font-bold py-3 rounded transition-colors ${
                      processando
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                    }`}
                  >
                    {processando ? '⏳ Processando...' : '✓ Confirmar Pedido'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
