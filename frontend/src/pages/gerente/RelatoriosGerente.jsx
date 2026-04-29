import { useState, useEffect } from 'react'
import { motion as Motion } from 'framer-motion'
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, BarChart2, Star, AlertCircle } from 'lucide-react'
import api from '../../services/api'

export default function RelatoriosGerente() {
  const [cards, setCards] = useState(null)
  const [grafico, setGrafico] = useState([])
  const [topProdutos, setTopProdutos] = useState([])
  const [cancelamentos, setCancelamentos] = useState(null)
  const [tempoEntrega, setTempoEntrega] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    setCarregando(true)
    setErro(null)

    Promise.allSettled([
      api.relatorios.buscar('vendas'),
      api.relatorios.buscar('mapa-calor'),
      api.relatorios.buscar('produtos-top'),
      api.relatorios.buscar('taxa-cancelamento'),
      api.relatorios.buscar('tempo-entrega'),
    ]).then(([vendas, mapaCalor, produtos, cancel, tempo]) => {
      // Vendas
      if (vendas.status === 'fulfilled') {
        const d = vendas.value?.dados || {}
        setCards([
          { label: 'Total de Pedidos', valor: d.total_pedidos ?? 0, icon: ShoppingBag, cor: 'text-primary', bg: 'bg-primary-light' },
          { label: 'Faturamento', valor: `R$ ${Number(d.faturamento ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, cor: 'text-accent', bg: 'bg-accent/10' },
          { label: 'Ticket Médio', valor: `R$ ${Number(d.ticket_medio ?? 0).toFixed(2)}`, icon: BarChart2, cor: 'text-secondary', bg: 'bg-secondary/10' },
        ])
      }

      // Gráfico por hora
      if (mapaCalor.status === 'fulfilled') {
        const dados = mapaCalor.value?.dados || []
        setGrafico(dados.map(d => ({
          hora: `${String(d.hora).padStart(2,'0')}h`,
          pedidos: d.quantidade ?? 0,
          valor: (d.quantidade ?? 0) * 50,
        })))
      }

      // Top produtos
      if (produtos.status === 'fulfilled') {
        setTopProdutos((produtos.value?.dados || []).map(p => ({
          nome: p.nome,
          categoria: p.categoria || '—',
          preco: Number(p.preco ?? 0),
        })))
      }

      // Cancelamentos
      if (cancel.status === 'fulfilled') {
        setCancelamentos(cancel.value?.dados || null)
      }

      // Tempo de entrega
      if (tempo.status === 'fulfilled') {
        setTempoEntrega(tempo.value?.dados || null)
      }

      setCarregando(false)
    })
  }, [])

  const maxGrafico = Math.max(...grafico.map(g => g.valor), 1)

  if (carregando) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Relatórios</h1>
          <p className="text-sm text-text-muted font-semibold mt-1">Acompanhe o desempenho da sua loja</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-surface-2 animate-pulse" />)}
        </div>
        <div className="h-56 rounded-2xl bg-surface-2 animate-pulse mb-4" />
        <div className="h-56 rounded-2xl bg-surface-2 animate-pulse" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-text-primary">Relatórios</h1>
        <p className="text-sm text-text-muted font-semibold mt-1">Acompanhe o desempenho da sua loja — últimos 30 dias</p>
      </div>

      {/* Cards resumo */}
      {cards && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {cards.map((s, i) => (
            <Motion.div key={s.label} className="bg-white rounded-2xl border border-border shadow-sm p-5"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon size={17} className={s.cor} />
                </div>
                <span className="text-xs font-bold text-text-muted uppercase tracking-wide">{s.label}</span>
              </div>
              <div className="font-display text-2xl font-extrabold text-text-primary leading-tight">{s.valor}</div>
              <div className="text-xs text-text-muted opacity-60 mt-1">Últimos 30 dias</div>
            </Motion.div>
          ))}
        </div>
      )}

      {/* Gráfico pedidos por hora */}
      <Motion.div className="bg-white rounded-2xl border border-border shadow-sm p-5 mb-6"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display text-base font-bold text-text-primary">Pedidos por hora</h3>
            <p className="text-xs text-text-muted font-semibold">Distribuição ao longo do dia</p>
          </div>
          {grafico.length > 0 && (
            <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full">
              {grafico.reduce((a, g) => a + g.pedidos, 0)} pedidos
            </span>
          )}
        </div>
        {grafico.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-text-muted">
            <BarChart2 size={32} className="opacity-30" />
            <span className="text-sm font-semibold">Nenhum dado de pedidos ainda</span>
          </div>
        ) : (
          <div className="flex items-end gap-1.5 h-40">
            {grafico.map((d, i) => (
              <div key={d.hora} className="flex flex-col items-center gap-1 flex-1">
                <Motion.div
                  className="w-full bg-primary/80 hover:bg-primary rounded-t-lg transition-colors cursor-pointer"
                  style={{ height: `${(d.valor / maxGrafico) * 100}%`, minHeight: 4, transformOrigin: 'bottom' }}
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                  transition={{ delay: 0.3 + i * 0.03, duration: 0.4, ease: 'easeOut' }}
                  title={`${d.hora}: ${d.pedidos} pedido${d.pedidos !== 1 ? 's' : ''}`}
                />
                <span className="text-[0.6rem] font-bold text-text-muted">{d.hora}</span>
              </div>
            ))}
          </div>
        )}
      </Motion.div>

      {/* Cards secundários */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Taxa de cancelamento */}
        <Motion.div className="bg-white rounded-2xl border border-border shadow-sm p-5"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-red-400" />
            <h3 className="font-display text-base font-bold text-text-primary">Cancelamentos</h3>
          </div>
          {cancelamentos ? (
            <div className="flex flex-col gap-2">
              {[
                { label: 'Total de pedidos', valor: cancelamentos.total_pedidos ?? 0 },
                { label: 'Cancelados', valor: cancelamentos.cancelados ?? 0 },
                { label: 'Taxa', valor: `${cancelamentos.percentual_cancelamento ?? 0}%` },
                { label: 'Valor perdido', valor: `R$ ${Number(cancelamentos.valor_cancelado ?? 0).toFixed(2)}` },
              ].map(({ label, valor }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-border last:border-none">
                  <span className="text-sm text-text-muted font-semibold">{label}</span>
                  <span className="text-sm font-bold text-text-primary">{valor}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted font-semibold">Sem dados disponíveis</p>
          )}
        </Motion.div>

        {/* Tempo de entrega */}
        <Motion.div className="bg-white rounded-2xl border border-border shadow-sm p-5"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-accent" />
            <h3 className="font-display text-base font-bold text-text-primary">Tempo de entrega</h3>
          </div>
          {tempoEntrega ? (
            <div className="flex flex-col gap-2">
              {[
                { label: 'Tempo médio', valor: `${Math.round(tempoEntrega.tempo_medio_minutos ?? 0)} min` },
                { label: 'Mais rápido', valor: `${tempoEntrega.tempo_minimo ?? 0} min` },
                { label: 'Mais lento', valor: `${tempoEntrega.tempo_maximo ?? 0} min` },
              ].map(({ label, valor }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-border last:border-none">
                  <span className="text-sm text-text-muted font-semibold">{label}</span>
                  <span className="text-sm font-bold text-text-primary">{valor}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted font-semibold">Sem dados disponíveis</p>
          )}
        </Motion.div>
      </div>

      {/* Produtos do cardápio */}
      <Motion.div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-text-primary">Produtos no cardápio</h3>
            <p className="text-xs text-text-muted font-semibold">Lista atualizada do banco</p>
          </div>
          <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full">
            {topProdutos.length} itens
          </span>
        </div>
        {topProdutos.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-text-muted font-semibold text-sm">Nenhum produto cadastrado ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {['#', 'Produto', 'Categoria', 'Preço'].map(col => (
                    <th key={col} className="px-5 py-3 text-left text-xs font-extrabold text-text-muted uppercase tracking-wide whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProdutos.map((p, i) => (
                  <Motion.tr key={i} className="border-b border-border last:border-none hover:bg-surface-2 transition-colors"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.04 }}>
                    <td className="px-5 py-3.5 font-bold text-text-muted">#{i + 1}</td>
                    <td className="px-5 py-3.5 font-semibold text-text-primary">{p.nome}</td>
                    <td className="px-5 py-3.5 text-text-muted font-semibold">{p.categoria}</td>
                    <td className="px-5 py-3.5 font-display font-extrabold text-accent whitespace-nowrap">
                      R$ {p.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </Motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Motion.div>
    </div>
  )
}
