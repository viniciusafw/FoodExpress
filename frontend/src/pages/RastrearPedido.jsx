import { useState, useEffect } from 'react'
import { motion as Motion } from 'framer-motion'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import api from '../services/api'
import MobileNavBar from '../components/MobileNavBar'
import {
  ArrowLeft, MapPin, Clock, Truck, Phone,
  AlertCircle, UtensilsCrossed, Navigation
} from 'lucide-react'


// ── Mini mapa SVG (mesma lógica da PaginaEntregador) ─────────────────────────
function MiniMapa({ progresso = 65 }) {
  return (
    <div className="relative w-full h-52 rounded-2xl overflow-hidden bg-surface-2">
      <svg viewBox="0 0 500 210" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <rect width="500" height="210" fill="#e8f0e8" />
        {[
          [10,10,90,60],[120,10,90,60],[230,10,90,60],[330,10,90,60],[420,10,70,60],
          [10,90,90,60],[120,90,90,60],[230,90,90,60],[330,90,60,60],[410,90,80,60],
          [10,165,90,40],[120,165,90,40],[230,165,90,40],[330,165,90,40],
        ].map(([x,y,w,h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill="#d4e4d4" rx="4" />)}
        {/* Ruas */}
        <rect x="100" y="0" width="12" height="210" fill="#fff" opacity=".6" />
        <rect x="210" y="0" width="12" height="210" fill="#fff" opacity=".6" />
        <rect x="320" y="0" width="12" height="210" fill="#fff" opacity=".6" />
        <rect x="0" y="75" width="500" height="12" fill="#fff" opacity=".6" />
        <rect x="0" y="155" width="500" height="12" fill="#fff" opacity=".6" />
        {/* Rota */}
        <path d="M80 190 L80 81 L215 81 L215 20 L370 20" stroke="#FF6B35" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="6 4" opacity=".7" />
        {/* Progresso da rota */}
        <path d={`M80 190 L80 81 L${80 + (progresso/100)*290} 81`} stroke="#FF6B35" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        {/* Restaurante */}
        <circle cx="370" cy="20" r="9" fill="#2E294E" />
        <text x="370" y="24" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">R</text>
        {/* Entregador */}
        <circle cx={80 + (progresso/100)*130} cy="81" r="10" fill="#FF6B35" />
        <text x={80 + (progresso/100)*130} y="86" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">E</text>
        {/* Destino */}
        <circle cx="80" cy="190" r="9" fill="#22c55e" />
        <text x="80" y="195" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">D</text>
      </svg>
      {/* Legenda */}
      <div className="absolute bottom-3 left-3 flex gap-3">
        {[
          { cor: 'bg-secondary', label: 'Restaurante' },
          { cor: 'bg-primary',   label: 'Entregador' },
          { cor: 'bg-accent',    label: 'Destino' },
        ].map(({ cor, label }) => (
          <div key={label} className="flex items-center gap-1 bg-white/80 rounded-full px-2 py-0.5">
            <div className={`w-2 h-2 rounded-full ${cor}`} />
            <span className="text-[10px] font-bold text-text-primary">{label}</span>
          </div>
        ))}
      </div>
    </div>
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
  const [tempoAtualizado, setTempoAtualizado] = useState(0)

  const buscar = () => {
    api.pedidos.rastrear(id)
      .then(dados => {
        setD(dados)
        setTempoAtualizado(dados?.rota?.tempo_estimado_minutos ?? 0)
      })
      .catch(console.error)
      .finally(() => setCarregando(false))
  }

  // Busca inicial
  useEffect(() => { buscar() }, [id])

  // Polling a cada 15s para atualizar posição do entregador
  useEffect(() => {
    const iv = setInterval(() => {
      buscar()
    }, 15000)
    return () => clearInterval(iv)
  }, [id])

  // Conta regressiva a cada 5s
  useEffect(() => {
    const iv = setInterval(() => setTempoAtualizado(t => Math.max(0, t - 1)), 5000)
    return () => clearInterval(iv)
  }, [])

  const abrirSuporte = () => navigate(`/suporte?pedido=${encodeURIComponent(id)}&categoria=pedido`)
  const ligarEntregador = () => {
    const telefone = d?.entregador?.telefone || d?.entregador?.telefone_entregador
    if (telefone) {
      window.location.href = `tel:${telefone}`
    } else {
      abrirSuporte()
    }
  }

  if (carregando) return <div className="min-h-screen flex items-center justify-center text-text-muted">Carregando rastreamento...</div>
  if (!d) return <div className="min-h-screen flex items-center justify-center text-text-muted">Rastreamento não disponível</div>

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

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Voltar */}
        <Link to="/perfil"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary mb-6 hover:text-primary/80 transition-colors">
          <ArrowLeft size={16} /> Voltar
        </Link>

        <h1 className="font-display text-2xl font-extrabold text-text-primary mb-6">
          Rastrear Pedido #{String(d?.pedido_id).slice(-6)}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mapa + progresso */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <Motion.div
              className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            >
              <MiniMapa progresso={d?.rota?.progresso_percentual} />
            </Motion.div>

            {/* Progresso + stats */}
            <Motion.div
              className="bg-white rounded-2xl border border-border shadow-sm p-5"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-text-muted">Progresso da entrega</span>
                <span className="text-sm font-extrabold text-primary">{d?.rota?.progresso_percentual}%</span>
              </div>
              <BarraProgresso pct={d?.rota?.progresso_percentual} />
              <div className="grid grid-cols-3 gap-4 mt-5">
                {[
                  { Icon: Clock,      label: 'Tempo restante', valor: `${tempoAtualizado} min` },
                  { Icon: Navigation, label: 'Distância',      valor: `${d?.rota?.distancia_atual_km} km` },
                  { Icon: Truck,      label: 'Total da rota',  valor: `${d?.rota?.distancia_total_km} km` },
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
                <span className="font-bold text-primary capitalize">{d?.status}</span>
              </div>
              <p className="text-xs text-text-muted font-semibold flex items-start gap-1.5">
                <MapPin size={12} className="shrink-0 mt-0.5" />
                {d?.destino?.endereco}
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
