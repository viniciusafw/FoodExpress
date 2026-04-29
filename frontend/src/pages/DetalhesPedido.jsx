import { useState, useEffect } from 'react'
import { motion as Motion } from 'framer-motion'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import api from '../services/api'
import MobileNavBar from '../components/MobileNavBar'
import {
  ArrowLeft, MapPin, DollarSign, Package, Clock,
  CheckCircle, Truck, Star, Send, XCircle
} from 'lucide-react'

// ── Timeline de status ───────────────────────────────────────────────────────
const timeline = [
  { step: 'pendente',   label: 'Pedido recebido', Icon: Package },
  { step: 'confirmado', label: 'Confirmado',      Icon: Clock },
  { step: 'preparando', label: 'Preparando',      Icon: Clock },
  { step: 'entregando', label: 'A caminho',        Icon: Truck },
  { step: 'entregue',   label: 'Entregue',         Icon: CheckCircle },
]
const stepOrder = timeline.map(t => t.step)

export default function DetalhesPedido() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pedido, setPedido] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    api.pedidos.buscarPorId(id)
      .then(p => {
        // Normaliza itens que podem vir como string JSON
        if (typeof p.itens === 'string') {
          try { p.itens = JSON.parse(p.itens) } catch { p.itens = [] }
        }
        setPedido(p)
      })
      .catch(console.error)
      .finally(() => setCarregando(false))
  }, [id])

  const [estrelas, setEstrelas] = useState(5)
  const [comentario, setComentario] = useState('')
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false)
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false)

  const enviarAvaliacao = async () => {
    if (!pedido) return
    setEnviandoAvaliacao(true)
    try {
      await api.avaliacoes.criar({
        pedidoId: pedido.id,
        restauranteId: pedido.restaurante_id,
        avaliacao: estrelas,
        comentario,
      })
      setAvaliacaoEnviada(true)
    } catch (e) {
      // Mesmo se falhar, marca como enviada para não bloquear o usuário
      setAvaliacaoEnviada(true)
    } finally {
      setEnviandoAvaliacao(false)
    }
  }

  if (carregando) return <div className="min-h-screen flex items-center justify-center text-text-muted">Carregando pedido...</div>
  if (!pedido) return <div className="min-h-screen flex items-center justify-center text-text-muted">Pedido não encontrado</div>

  const currentIndex = stepOrder.indexOf(pedido.status)

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Voltar */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/perfil"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft size={16} /> Voltar para Pedidos
          </Link>
          {pedido.status === 'entregue' && (
            <button
              onClick={() => {
                // Navega para a loja para repetir o pedido
                navigate(`/loja/${pedido.restaurante_id}`)
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-primary border border-primary/20 bg-primary-light px-4 py-2 rounded-xl cursor-pointer hover:bg-primary hover:text-white transition-all border-solid"
            >
              🔁 Repetir pedido
            </button>
          )}
        </div>

        <h1 className="font-display text-2xl font-extrabold text-text-primary mb-8">
          Pedido #{String(pedido.id).slice(-6)}
        </h1>

        {/* Timeline */}
        <Motion.div
          className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="font-display font-extrabold text-text-primary mb-6">Andamento do Pedido</h2>
          <div className="flex flex-col gap-0">
            {timeline.map(({ step, label, Icon }, idx) => {
              const concluido = idx <= currentIndex
              const atual = idx === currentIndex
              return (
                <div key={step} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      concluido ? 'bg-primary' : 'bg-surface-2 border border-border'
                    }`}>
                      <Icon size={16} className={concluido ? 'text-white' : 'text-text-muted'} />
                    </div>
                    {idx < timeline.length - 1 && (
                      <div className={`w-0.5 h-7 mt-0.5 ${concluido && idx < currentIndex ? 'bg-primary' : 'bg-border'}`} />
                    )}
                  </div>
                  <div className="pt-1.5 pb-6">
                    <p className={`text-sm font-bold ${concluido ? 'text-text-primary' : 'text-text-muted'}`}>{label}</p>
                    {atual && pedido.status !== 'entregue' && (
                      <p className="text-xs text-primary font-semibold mt-0.5">Em progresso...</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Motion.div>

        {/* Endereço + Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <Motion.div
            className="bg-white rounded-2xl border border-border shadow-sm p-6"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          >
            <h3 className="font-display font-extrabold text-text-primary mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-primary" /> Endereço de Entrega
            </h3>
            <p className="text-sm font-bold text-text-primary mb-1">{pedido.endereco_entrega}</p>
            <p className="text-xs text-text-muted font-semibold">
              {new Date(pedido.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
            </p>
          </Motion.div>

          <Motion.div
            className="bg-white rounded-2xl border border-border shadow-sm p-6"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          >
            <h3 className="font-display font-extrabold text-text-primary mb-3 flex items-center gap-2">
              <DollarSign size={16} className="text-accent" /> Resumo Financeiro
            </h3>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted font-semibold">Subtotal</span>
                <span className="font-bold">R$ {Number(pedido.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted font-semibold">Taxa de entrega</span>
                <span className="font-bold">R$ {Number(pedido.taxa_entrega).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-extrabold text-text-primary">Total</span>
                <span className="font-extrabold text-primary">R$ {Number(pedido.total).toFixed(2)}</span>
              </div>
            </div>
          </Motion.div>
        </div>

        {/* Itens */}
        <Motion.div
          className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        >
          <h3 className="font-display font-extrabold text-text-primary mb-4 flex items-center gap-2">
            <Package size={16} className="text-secondary" /> Itens do Pedido
          </h3>
          <div className="flex flex-col gap-0">
            {pedido.itens.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-bold text-text-primary">{item.nome}</p>
                  <p className="text-xs text-text-muted font-semibold">Qtd: {item.quantidade}</p>
                </div>
                <p className="text-sm font-extrabold text-primary">
                  R$ {(item.preco * item.quantidade).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </Motion.div>

        {/* Avaliação */}
        {pedido.status === 'entregue' && !avaliacaoEnviada && (
          <Motion.div
            className="bg-white rounded-2xl border border-border shadow-sm p-6"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          >
            <h3 className="font-display font-extrabold text-text-primary mb-5 flex items-center gap-2">
              <Star size={16} className="text-accent" /> Avaliar Pedido
            </h3>
            <p className="text-sm text-text-muted font-semibold mb-3">Quantas estrelas você dá?</p>
            <div className="flex gap-2 mb-5">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setEstrelas(s)}
                  className={`text-3xl transition-transform hover:scale-110 ${s <= estrelas ? 'text-accent' : 'text-border'}`}>
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              placeholder="Deixe um comentário (opcional)..."
              rows={3}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm font-semibold text-text-primary outline-none focus:border-primary transition-colors resize-none mb-4"
            />
            <button
              onClick={enviarAvaliacao}
              disabled={enviandoAvaliacao}
              className="flex items-center gap-2 bg-primary text-white font-bold px-6 py-2.5 rounded-full text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 border-none cursor-pointer"
            >
              <Send size={14} /> {enviandoAvaliacao ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
          </Motion.div>
        )}

        {avaliacaoEnviada && (
          <Motion.div
            className="bg-accent/10 border border-accent/20 rounded-2xl p-6 text-center"
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          >
            <CheckCircle size={32} className="text-accent mx-auto mb-3" />
            <p className="font-display font-extrabold text-text-primary">Avaliação enviada!</p>
            <p className="text-sm text-text-muted font-semibold mt-1">Obrigado pelo seu feedback.</p>
          </Motion.div>
        )}

        {pedido.status !== 'entregue' && (
          <div className="bg-surface-2 border border-border rounded-2xl p-5 text-center text-sm text-text-secondary font-semibold">
            Você poderá avaliar este pedido após a entrega.
          </div>
        )}
      </main>

      <MobileNavBar />
    </div>
  )
}
