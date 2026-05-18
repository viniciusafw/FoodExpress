'use client'

import { useAuth0 } from "@auth0/auth0-react"
import { useState } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts'



interface GerenteDashboardProps {
  gerente: any
  relatorios: any
  vendasPorPeriodo: any[]
}

function getUserRole(user: ReturnType<typeof useAuth0>['user']) {
  const claims = user as Record<string, unknown> | undefined
  return (claims?.role || claims?.['https://foodexpress.com/role'] || 'cliente') as string
}

export default function GerenteDashboard({ gerente, relatorios, vendasPorPeriodo }: GerenteDashboardProps) {
  const { user, isAuthenticated, isLoading } = useAuth0()
  const [periodo, setPeriodo] = useState('30')
  const [relatorioAtivo, setRelatorioAtivo] = useState('vendas')

  const COLORS = ['#FF6B35', '#2E294E', '#4CAF50', '#F44336']

  // Garantir que relatorios tenha valores padrão
  const dados = {
    total_pedidos: relatorios.total_pedidos || 0,
    faturamento_total: relatorios.faturamento_total || 0,
    ticket_medio: relatorios.ticket_medio || 0,
    cancelamentos: relatorios.cancelamentos || 0,
    avaliacao_media: relatorios.avaliacao_media || 0
  }

  // REL001 - Vendas por período
  const renderVendas = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-bold mb-4">Vendas por período</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-orange-50 p-4 rounded">
          <p className="text-sm text-gray-600">Total de pedidos</p>
          <p className="text-2xl font-bold text-[#FF6B35]">{dados.total_pedidos}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded">
          <p className="text-sm text-gray-600">Faturamento</p>
          <p className="text-2xl font-bold text-[#2E294E]">
            R$ {Number(dados.faturamento_total).toFixed(2)}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded">
          <p className="text-sm text-gray-600">Ticket médio</p>
          <p className="text-2xl font-bold text-green-600">
            R$ {Number(dados.ticket_medio).toFixed(2)}
          </p>
        </div>
      </div>
      
      {vendasPorPeriodo.length > 0 ? (
        <LineChart width={800} height={300} data={vendasPorPeriodo}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="data" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="pedidos" stroke="#FF6B35" name="Pedidos" />
          <Line yAxisId="right" type="monotone" dataKey="faturamento" stroke="#2E294E" name="Faturamento" />
        </LineChart>
      ) : (
        <p className="text-center text-gray-500">Sem dados de vendas no período</p>
      )}
    </div>
  )

  // REL002 - Desempenho por restaurante
  const renderDesempenho = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-bold mb-4">Desempenho por restaurante</h3>
      <p className="text-gray-500">Implementar tabela de ranking de restaurantes</p>
    </div>
  )

  // REL004 - Mapa de calor
  const renderMapaCalor = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-bold mb-4">Mapa de calor de pedidos</h3>
      <div className="h-96 bg-gray-100 rounded flex items-center justify-center">
        <p className="text-gray-500">Mapa será integrado com Mapbox/Leaflet</p>
      </div>
    </div>
  )

  // REL005 - Taxa de cancelamento
  const renderCancelamentos = () => {
    const concluidos = dados.total_pedidos - dados.cancelamentos
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">Taxa de cancelamento</h3>
        {dados.total_pedidos > 0 ? (
          <PieChart width={400} height={300}>
            <Pie
              data={[
                { name: 'Cancelados', value: dados.cancelamentos },
                { name: 'Concluídos', value: concluidos }
              ]}
              cx={200}
              cy={150}
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              <Cell fill="#F44336" />
              <Cell fill="#4CAF50" />
            </Pie>
            <Tooltip />
          </PieChart>
        ) : (
          <p className="text-center text-gray-500">Sem dados de cancelamento</p>
        )}
      </div>
    )
  }

  // REL006 - Satisfação do cliente
  const renderSatisfacao = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-bold mb-4">Satisfação do cliente</h3>
      <div className="text-center">
        <div className="text-6xl font-bold text-[#FF6B35] mb-2">
          {Number(dados.avaliacao_media).toFixed(1)}
        </div>
        <div className="text-yellow-400 text-2xl mb-4">
          {'★'.repeat(Math.round(dados.avaliacao_media))}
          {'☆'.repeat(5 - Math.round(dados.avaliacao_media))}
        </div>
        <p className="text-gray-600">NPS: {dados.avaliacao_media ? ((dados.avaliacao_media / 5) * 100).toFixed(0) : 0}</p>
      </div>
    </div>
  )

  // REL007 - Financeiro comissões
  const renderFinanceiro = () => {
    const comissao = dados.faturamento_total * 0.15 // 15% de comissão
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">Financeiro - Comissões</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Faturamento bruto:</span>
            <span className="font-bold">R$ {Number(dados.faturamento_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[#FF6B35]">
            <span>Comissão da plataforma (15%):</span>
            <span className="font-bold">R$ {comissao.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[#2E294E] border-t pt-3">
            <span>Repasse aos restaurantes:</span>
            <span className="font-bold">R$ {(dados.faturamento_total - comissao).toFixed(2)}</span>
          </div>
        </div>
      </div>
    )
  }
  const role = isAuthenticated ? getUserRole(user) : 'cliente'
  const email = isLoading ? '' : user?.email

  return (
    <div className="min-h-screen bg-gray-50">
            {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#FF6B35]">
                FoodExpress - Painel do Gerente
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-600">
                  Bem-vindo, {gerente?.nome || 'Gerente'}
                </p>
                <span className="text-xs bg-[#FF6B35] text-white px-2 py-1 rounded-full">
                  {role}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {email}
            </div>
          </div>
        </div>
      </header>

      {/* Navegação de relatórios */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setRelatorioAtivo('vendas')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              relatorioAtivo === 'vendas' ? 'bg-[#FF6B35] text-white' : 'bg-gray-200'
            }`}
          >
            REL001 - Vendas
          </button>
          <button
            onClick={() => setRelatorioAtivo('desempenho')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              relatorioAtivo === 'desempenho' ? 'bg-[#FF6B35] text-white' : 'bg-gray-200'
            }`}
          >
            REL002 - Desempenho
          </button>
          <button
            onClick={() => setRelatorioAtivo('mapa')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              relatorioAtivo === 'mapa' ? 'bg-[#FF6B35] text-white' : 'bg-gray-200'
            }`}
          >
            REL004 - Mapa calor
          </button>
          <button
            onClick={() => setRelatorioAtivo('cancelamentos')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              relatorioAtivo === 'cancelamentos' ? 'bg-[#FF6B35] text-white' : 'bg-gray-200'
            }`}
          >
            REL005 - Cancelamentos
          </button>
          <button
            onClick={() => setRelatorioAtivo('satisfacao')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              relatorioAtivo === 'satisfacao' ? 'bg-[#FF6B35] text-white' : 'bg-gray-200'
            }`}
          >
            REL006 - Satisfação
          </button>
          <button
            onClick={() => setRelatorioAtivo('financeiro')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              relatorioAtivo === 'financeiro' ? 'bg-[#FF6B35] text-white' : 'bg-gray-200'
            }`}
          >
            REL007 - Financeiro
          </button>
        </div>

        {/* Seletor de período */}
        <div className="mt-4 flex gap-2">
          <select 
            value={periodo} 
            onChange={(e) => setPeriodo(e.target.value)}
            className="input max-w-xs"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
          </select>
        </div>

        {/* Conteúdo do relatório */}
        <div className="mt-6">
          {relatorioAtivo === 'vendas' && renderVendas()}
          {relatorioAtivo === 'desempenho' && renderDesempenho()}
          {relatorioAtivo === 'mapa' && renderMapaCalor()}
          {relatorioAtivo === 'cancelamentos' && renderCancelamentos()}
          {relatorioAtivo === 'satisfacao' && renderSatisfacao()}
          {relatorioAtivo === 'financeiro' && renderFinanceiro()}
        </div>
      </div>
    </div>
  )
}
