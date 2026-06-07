import { useEffect, useState } from 'react'
import { CheckCircle, Clock, MessageCircle, RefreshCw, Send } from 'lucide-react'
import api from '../../services/api'
import { formatarDataBanco } from '../../utils/datas'

const statusLabel = {
  aberto: 'Aberto',
  em_atendimento: 'Em atendimento',
  em_analise: 'Em análise',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
}

export default function SuporteAdmin() {
  const [tickets, setTickets] = useState([])
  const [respostas, setRespostas] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState('')
  const [erro, setErro] = useState('')

  const carregar = async () => {
    setCarregando(true)
    setErro('')
    try {
      const lista = await api.tickets.listar()
      setTickets(Array.isArray(lista) ? lista : [])
      setRespostas(Object.fromEntries((lista || []).map(ticket => [ticket.id, ticket.resposta || ''])))
    } catch (error) {
      setErro(error.message || 'Não foi possível carregar os tickets.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const atualizar = async (ticket, status) => {
    setProcessando(ticket.id)
    setErro('')
    try {
      const atualizado = await api.tickets.atualizar(ticket.id, {
        status,
        resposta: respostas[ticket.id] || '',
      })
      setTickets(prev => prev.map(item => item.id === ticket.id ? { ...item, ...atualizado } : item))
    } catch (error) {
      setErro(error.message || 'Não foi possível atualizar o ticket.')
    } finally {
      setProcessando('')
    }
  }

  const abertos = tickets.filter(ticket => ['aberto', 'em_atendimento', 'em_analise'].includes(ticket.status)).length

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Central de suporte</h1>
          <p className="mt-1 text-sm font-semibold text-text-muted">{abertos} ticket{abertos === 1 ? '' : 's'} aguardando tratamento</p>
        </div>
        <button type="button" onClick={carregar} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-text-secondary hover:border-primary hover:text-primary">
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {erro && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{erro}</div>}

      {carregando ? (
        <div className="py-16 text-center text-sm font-semibold text-text-muted">Carregando tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-12 text-center">
          <CheckCircle size={32} className="mx-auto mb-3 text-accent" />
          <p className="font-bold text-text-primary">Nenhum ticket recebido</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {tickets.map(ticket => (
            <article key={ticket.id} className="rounded-lg border border-border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase text-text-muted">{ticket.categoria || 'Suporte'} · {formatarDataBanco(ticket.created_at)}</p>
                  <h2 className="mt-1 font-display text-base font-extrabold text-text-primary">{ticket.titulo}</h2>
                  <p className="mt-1 text-xs font-semibold text-text-muted">{ticket.cliente_nome || ticket.cliente_email || ticket.cliente_id}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs font-bold text-text-secondary">
                  <Clock size={12} /> {statusLabel[ticket.status] || ticket.status}
                </span>
              </div>

              <div className="mb-4 rounded-lg bg-surface-2 p-4">
                <p className="text-sm font-semibold leading-relaxed text-text-secondary">{ticket.descricao}</p>
                {ticket.pedido_id && <p className="mt-2 text-xs font-bold text-primary">Pedido #{String(ticket.pedido_id).slice(-6)}</p>}
              </div>

              <label className="mb-2 block text-xs font-extrabold uppercase text-text-muted">Resposta para o cliente</label>
              <textarea
                value={respostas[ticket.id] || ''}
                onChange={event => setRespostas(prev => ({ ...prev, [ticket.id]: event.target.value.slice(0, 1000) }))}
                rows={4}
                placeholder="Explique a solução ou solicite mais informações..."
                className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-text-primary outline-none focus:border-primary"
              />

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => atualizar(ticket, 'em_analise')}
                  disabled={processando === ticket.id}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-xs font-extrabold text-text-secondary hover:border-primary hover:text-primary disabled:opacity-60"
                >
                  <MessageCircle size={14} /> Em análise
                </button>
                <button
                  type="button"
                  onClick={() => atualizar(ticket, 'resolvido')}
                  disabled={processando === ticket.id || !String(respostas[ticket.id] || '').trim()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-xs font-extrabold text-white disabled:opacity-60"
                >
                  <Send size={14} /> Responder
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
