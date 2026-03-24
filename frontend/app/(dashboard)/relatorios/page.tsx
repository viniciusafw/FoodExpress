'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function RelatoriosPage() {
  const { user, isLoaded } = useUser()
  const [periodo, setPeriodo] = useState('30') // dias
  const [relatorios, setRelatorios] = useState<any>({})
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (isLoaded && user) {
      carregarRelatorios()
    }
  }, [isLoaded, user, periodo])

  const carregarRelatorios = async () => {
    try {
      setCarregando(true)
      const dataFim = new Date()
      const dataInicio = new Date(dataFim.getTime() - parseInt(periodo) * 24 * 60 * 60 * 1000)

      const tipos = [
        'vendas',
        'desempenho-restaurantes',
        'eficiencia-entregadores',
        'mapa-calor',
        'taxa-cancelamento',
        'satisfacao-cliente',
        'financeiro-comissoes',
        'produtos-top',
        'tempo-entrega',
        'fidelizacao',
        'cancelamentos-reembolsos',
        'crescimento-base'
      ]

      const novosRelatorios: any = {}

      for (const tipo of tipos) {
        try {
          const res = await fetch(
            `/api/relatorios?tipo=${tipo}&inicio=${dataInicio.toISOString()}&fim=${dataFim.toISOString()}`
          )
          if (res.ok) {
            const dados = await res.json()
            novosRelatorios[tipo] = dados.dados
          }
        } catch (erro) {
          console.error(`Erro ao carregar ${tipo}:`, erro)
        }
      }

      setRelatorios(novosRelatorios)
    } finally {
      setCarregando(false)
    }
  }

  if (!isLoaded) {
    return <div className="p-4 text-center">Carregando...</div>
  }

  if (!user) {
    return <div className="p-4 text-center">Faça login para continuar</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-orange-600">📊 Relatórios Gerenciais</h1>
              <p className="text-gray-600 mt-1">Análise completa do FoodExpress</p>
            </div>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="border rounded px-4 py-2 font-medium"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="365">Último ano</option>
            </select>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {carregando ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">📊</div>
            <p className="text-gray-600">Gerando relatórios...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* REL001: Vendas por Período */}
            {relatorios.vendas && (
              <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-2xl font-bold mb-6">📈 REL001 - Vendas por Período</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <p className="text-gray-600 text-sm">Total de Pedidos</p>
                    <p className="text-3xl font-bold text-blue-600">{relatorios.vendas.total_pedidos || 0}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded border border-green-200">
                    <p className="text-gray-600 text-sm">Faturamento</p>
                    <p className="text-3xl font-bold text-green-600">
                      R$ {(relatorios.vendas.faturamento || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded border border-orange-200">
                    <p className="text-gray-600 text-sm">Ticket Médio</p>
                    <p className="text-3xl font-bold text-orange-600">
                      R$ {(relatorios.vendas.ticket_medio || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded border border-purple-200">
                    <p className="text-gray-600 text-sm">Período</p>
                    <p className="text-lg font-bold text-purple-600">{periodo} dias</p>
                  </div>
                </div>
              </div>
            )}

            {/* REL005: Taxa de Cancelamento */}
            {relatorios['taxa-cancelamento'] && (
              <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-2xl font-bold mb-6">🚫 REL005 - Taxa de Cancelamento</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                    <p className="text-gray-600 text-sm">Total de Pedidos</p>
                    <p className="text-3xl font-bold text-yellow-600">{relatorios['taxa-cancelamento'].total_pedidos || 0}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded border border-red-200">
                    <p className="text-gray-600 text-sm">Cancelados</p>
                    <p className="text-3xl font-bold text-red-600">{relatorios['taxa-cancelamento'].cancelados || 0}</p>
                  </div>
                  <div className="bg-red-100 p-4 rounded border border-red-300">
                    <p className="text-gray-600 text-sm">% Cancelamento</p>
                    <p className="text-3xl font-bold text-red-700">
                      {(relatorios['taxa-cancelamento'].percentual_cancelamento || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded border border-orange-200">
                    <p className="text-gray-600 text-sm">Valor Cancelado</p>
                    <p className="text-3xl font-bold text-orange-600">
                      R$ {(relatorios['taxa-cancelamento'].valor_cancelado || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* REL007: Financeiro */}
            {relatorios['financeiro-comissoes'] && (
              <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-2xl font-bold mb-6">💰 REL007 - Financeiro</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded border border-green-200">
                    <p className="text-gray-600 text-sm">Faturamento Total</p>
                    <p className="text-3xl font-bold text-green-600">
                      R$ {(relatorios['financeiro-comissoes'].faturamento_total || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <p className="text-gray-600 text-sm">Comissão Total (15%)</p>
                    <p className="text-3xl font-bold text-blue-600">
                      R$ {(relatorios['financeiro-comissoes'].comissao_total || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded border border-purple-200">
                    <p className="text-gray-600 text-sm">Restaurantes Ativos</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {relatorios['financeiro-comissoes'].restaurantes_ativos || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* REL010: Fidelização */}
            {relatorios.fidelizacao && (
              <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-2xl font-bold mb-6">⭐ REL010 - Fidelização de Clientes</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <p className="text-gray-600 text-sm">Total de Clientes</p>
                    <p className="text-3xl font-bold text-blue-600">{relatorios.fidelizacao.total_clientes || 0}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded border border-purple-200">
                    <p className="text-gray-600 text-sm">Clientes VIP</p>
                    <p className="text-3xl font-bold text-purple-600">{relatorios.fidelizacao.clientes_vip || 0}</p>
                  </div>
                  <div className="bg-purple-100 p-4 rounded border border-purple-300">
                    <p className="text-gray-600 text-sm">% VIP</p>
                    <p className="text-3xl font-bold text-purple-700">
                      {(relatorios.fidelizacao.percentual_vip || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded border border-orange-200">
                    <p className="text-gray-600 text-sm">Pedidos Médio/Cliente</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {(relatorios.fidelizacao.pedidos_medio || 0).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* REL012: Crescimento de Base */}
            {relatorios['crescimento-base'] && Array.isArray(relatorios['crescimento-base']) && (
              <div className="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-2xl font-bold mb-6">📱 REL012 - Crescimento de Base</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {relatorios['crescimento-base'].map((item: any) => (
                    <div key={item.tipo} className="bg-blue-50 p-4 rounded border border-blue-200">
                      <p className="text-gray-600 text-sm capitalize">{item.tipo}</p>
                      <p className="text-3xl font-bold text-blue-600">{item.quantidade || 0}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nota sobre Relatórios Adicionais */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-blue-800 font-medium mb-2">📋 Relatórios Adicionais</p>
              <p className="text-blue-700 text-sm">
                Os relatórios REL002, REL003, REL004, REL006, REL008, REL009 e REL011 foram implementados na API
                <br />
                e estão prontos para integração visual com gráficos avançados.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
