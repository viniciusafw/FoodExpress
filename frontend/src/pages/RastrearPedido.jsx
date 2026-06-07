import { useState, useEffect } from 'react'
import { motion as Motion } from 'framer-motion'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import MapaOSM from '../components/MapaOSM'
import api from '../services/api'
import MobileNavBar from '../components/MobileNavBar'
import {
  ArrowLeft, MapPin, Clock, Truck, Phone,
  AlertCircle, UtensilsCrossed, Navigation, Star, X
} from 'lucide-react'
import {
  criarUrlNavegacaoGoogle,
  montarPontoMapa,
} from '../utils/mapas'


function normalizarTelefone(telefone) {
  let digitos = String(telefone || '').replace(/\D/g, '')
  if (!digitos) return ''
  if (!digitos.startsWith('55') && digitos.length >= 10) digitos = `55${digitos}`
  return digitos.length >= 12 ? `+${digitos}` : ''
}

function MiniMapa({ dados }) {
  const destinoAtual = dados?.rota?.destino_atual
  const destino = destinoAtual
    ? { latitude: destinoAtual.lat, longitude: destinoAtual.lng, endereco: destinoAtual.endereco }
    : {
        latitude: dados?.destino?.localizacao?.lat,
        longitude: dados?.destino?.localizacao?.lng,
        endereco: dados?.destino?.endereco,
      }
  const entregador = dados?.entregador?.localizacao_atual
  const destinoTexto = montarPontoMapa(destino, destinoAtual?.tipo === 'restaurante' ? 'loja' : 'cliente')
  const entregadorCoords = entregador ? { latitude: entregador.lat, longitude: entregador.lng } : null
  const urlMapa = criarUrlNavegacaoGoogle({ origem: entregadorCoords, destino: destinoTexto })

  return (
    <MapaOSM
      origem={entregadorCoords}
      destino={destino}
      destinoTexto={destinoTexto || 'Ainda não há localização para este pedido.'}
      titulo={dados?.etapa === 'coletando' ? 'Entregador indo até a loja' : 'Pedido a caminho'}
      legendaOrigem="Entregador"
      legendaDestino={destinoAtual?.tipo === 'restaurante' ? 'Loja' : 'Destino'}
      urlNavegacao={urlMapa}
      alturaClasse="h-72"
    />
  )
}

// ── Barra de progresso ───────────────────────────────────────────────────────
function BarraProgresso({ pct }) {
  return (
    <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
      <Motion.div
        className="h-full bg-primary rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  )
}

export default function RastrearPedido() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [d, setD] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [tempoAtualizado, setTempoAtualizado] = useState(0)
  const [conviteAvaliacaoFechado, setConviteAvaliacaoFechado] = useState(false)

  const buscar = () => {
    api.pedidos.rastrear(id)
      .then(dados => {
        setErro('')
        setD(dados)
        setTempoAtualizado(dados?.rota?.tempo_estimado_minutos ?? 0)
      })
      .catch(error => setErro(error.message || 'Não foi possível atualizar o rastreamento.'))
      .finally(() => setCarregando(false))
  }

  // Busca inicial
  useEffect(() => { buscar() }, [id])

  // Polling a cada 15s para atualizar posição do entregador
  useEffect(() => {
    if (!d || ['entregue', 'cancelado'].includes(String(d.status || '').toLowerCase())) return undefined
    const iv = setInterval(() => {
      buscar()
    }, 15000)
    return () => clearInterval(iv)
  }, [id, d?.status])

  const abrirSuporte = () => navigate(`/suporte?pedido=${encodeURIComponent(id)}&categoria=pedido`)
  const deveMostrarConviteAvaliacao = String(d?.status || '').toLowerCase() === 'entregue'
    && !d?.avaliacao_restaurante
    && !conviteAvaliacaoFechado
  const distanciaAtual = d?.rota?.distancia_atual_km
  const distanciaTotal = d?.rota?.distancia_total_km
  const statusPedido = String(d?.status || '').toLowerCase()
  const entregaFinalizada = statusPedido === 'entregue'
  const pedidoCancelado = statusPedido === 'cancelado'
  const progresso = entregaFinalizada ? 100 : Number(d?.rota?.progresso_percentual || 0)
  const textoStatus = entregaFinalizada
    ? 'Pedido entregue'
    : pedidoCancelado
      ? 'Pedido cancelado'
      : d?.etapa === 'coletando'
        ? 'Entregador a caminho da loja'
        : 'Pedido a caminho'
  const ligarEntregador = () => {
    const telefone = normalizarTelefone(d?.entregador?.telefone || d?.entregador?.telefone_entregador)
    if (telefone) {
      window.location.href = `tel:${telefone}`
    } else {
      abrirSuporte()
    }
  }

  if (carregando) return <div className="min-h-screen flex items-center justify-center text-text-muted">Carregando rastreamento...</div>
  if (!d) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center text-text-muted">
      <p>{erro || 'Rastreamento não disponível'}</p>
      <button type="button" onClick={buscar} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white border-none">
        Tentar novamente
      </button>
    </div>
  )

  if (!d?.entregador) {
    return (
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <Link to="/perfil" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary mb-6 hover:text-primary/80 transition-colors">
            <ArrowLeft size={16} /> Voltar
          </Link>
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 text-center">
            <Truck size={36} className="text-primary mx-auto mb-3" />
            <h1 className="font-display text-xl font-extrabold text-text-primary">Entregador ainda não atribuído</h1>
            <p className="text-sm text-text-muted font-semibold mt-2">
              {d?.mensagem || 'Aguardando um entregador aceitar o pedido.'}
            </p>
            <button
              type="button"
              onClick={buscar}
              className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors"
            >
              Atualizar rastreamento
            </button>
          </div>
        </main>
        <MobileNavBar />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Header />

      {deveMostrarConviteAvaliacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <Motion.div
            className="w-full max-w-md rounded-2xl bg-white border border-border shadow-xl p-6"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
                <Star size={24} className="text-accent" fill="#FFBA08" stroke="#FFBA08" />
              </div>
              <button
                type="button"
                onClick={() => setConviteAvaliacaoFechado(true)}
                className="w-9 h-9 rounded-full border border-border bg-white flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                aria-label="Fechar avaliação"
              >
                <X size={16} />
              </button>
            </div>
            <h2 className="font-display text-xl font-extrabold text-text-primary mb-2">Pedido entregue!</h2>
            <p className="text-sm text-text-secondary font-semibold mb-5">
              Avalie sua experiência com {d?.restaurante?.nome || 'o restaurante'} e a entrega.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => navigate(`/pedido/${d.pedido_id}`)}
                className="flex-1 rounded-full bg-primary text-white px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors border-none cursor-pointer"
              >
                Avaliar agora
              </button>
              <button
                type="button"
                onClick={() => setConviteAvaliacaoFechado(true)}
                className="flex-1 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-bold text-text-secondary hover:bg-surface-2 transition-colors cursor-pointer"
              >
                Agora não
              </button>
            </div>
          </Motion.div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Voltar */}
        <Link to="/perfil"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary mb-6 hover:text-primary/80 transition-colors">
          <ArrowLeft size={16} /> Voltar
        </Link>

        <h1 className="font-display text-2xl font-extrabold text-text-primary mb-6">
          Rastrear Pedido #{String(d?.pedido_id).slice(-6)}
        </h1>
        {erro && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {erro}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mapa + progresso */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <Motion.div
              className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            >
              <MiniMapa dados={d} />
            </Motion.div>

            {/* Progresso + stats */}
            <Motion.div
              className="bg-white rounded-2xl border border-border shadow-sm p-5"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-text-muted">Progresso da entrega</span>
                <span className="text-sm font-extrabold text-primary">{progresso}%</span>
              </div>
              <BarraProgresso pct={progresso} />
              <div className="grid grid-cols-3 gap-4 mt-5">
                {[
                  { Icon: Clock,      label: 'Tempo restante', valor: tempoAtualizado ? `${tempoAtualizado} min` : '--' },
                  { Icon: Navigation, label: 'Distância',      valor: distanciaAtual != null ? `${distanciaAtual} km` : '--' },
                  { Icon: Truck,      label: 'Total da rota',  valor: distanciaTotal != null ? `${distanciaTotal} km` : '--' },
                ].map(({ Icon, label, valor }) => (
                  <div key={label} className="text-center">
                    <div className="w-9 h-9 bg-primary-light rounded-xl flex items-center justify-center mx-auto mb-1.5">
                      <Icon size={16} className="text-primary" />
                    </div>
                    <p className="font-display font-extrabold text-text-primary text-sm">{valor}</p>
                    <p className="text-[11px] text-text-muted font-semibold">{label}</p>
                  </div>
                ))}
              </div>
            </Motion.div>
          </div>

          {/* Painel direito */}
          <div className="flex flex-col gap-5">
            {/* Status */}
            <Motion.div
              className="bg-white rounded-2xl border border-border shadow-sm p-5"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            >
              <h3 className="font-display font-extrabold text-text-primary mb-3">Status</h3>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <span className="font-bold text-primary">
                  {textoStatus}
                </span>
              </div>
              <p className="text-xs text-text-muted font-semibold flex items-start gap-1.5">
                <MapPin size={12} className="shrink-0 mt-0.5" />
                {d?.rota?.destino_atual?.endereco || d?.destino?.endereco}
              </p>
            </Motion.div>

            {/* Entregador */}
            <Motion.div
              className="bg-white rounded-2xl border border-border shadow-sm p-5"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            >
              <h3 className="font-display font-extrabold text-text-primary mb-3 flex items-center gap-2">
                <Truck size={15} className="text-primary" /> Entregador
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-extrabold font-display">
                  {(d?.entregador?.nome || 'E').charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-text-primary text-sm">{d?.entregador?.nome}</p>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-xs text-text-muted font-semibold">Online</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={ligarEntregador}
                className="w-full flex items-center justify-center gap-2 bg-secondary/8 border border-secondary/20 text-secondary font-bold text-xs py-2.5 rounded-full hover:bg-secondary/15 transition-colors"
              >
                <Phone size={13} /> {d?.entregador?.telefone ? 'Ligar para Entregador' : 'Pedir contato no suporte'}
              </button>
            </Motion.div>

            {/* Restaurante */}
            <Motion.div
              className="bg-white rounded-2xl border border-border shadow-sm p-5"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            >
              <h3 className="font-display font-extrabold text-text-primary mb-2 flex items-center gap-2">
                <UtensilsCrossed size={15} className="text-primary" /> Restaurante
              </h3>
              <p className="text-sm font-bold text-text-primary">{d?.restaurante?.nome}</p>
            </Motion.div>

            {/* Precisa de ajuda */}
            <Motion.div
              className="bg-surface-2 border border-border rounded-2xl p-5"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
            >
              <h3 className="font-bold text-secondary mb-3 flex items-center gap-2 text-sm">
                <AlertCircle size={15} /> Precisa de ajuda?
              </h3>
              <button
                type="button"
                onClick={abrirSuporte}
                className="w-full bg-secondary text-white font-bold text-xs py-2.5 rounded-full transition-colors mb-2 hover:bg-secondary/90"
              >
                Reportar Problema
              </button>
              <Link to="/suporte"
                className="block w-full text-center text-secondary font-bold text-xs py-2.5 rounded-full border border-secondary/20 hover:bg-secondary/10 transition-colors">
                Falar com Suporte
              </Link>
            </Motion.div>
          </div>
        </div>
      </main>

      <MobileNavBar />
    </div>
  )
}
