import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Bike, Building2, CheckCircle, MessageCircle,
  RefreshCw, ShoppingBag, Store, Users
} from 'lucide-react'
import api from '../../services/api'
import { formatarDataBanco } from '../../utils/datas'

const statusLabel = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  pronto: 'Pronto',
  entregando: 'Em entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

function numeroPedido(id) {
  return `#${String(id || '').replace(/^ped_/, '').slice(-6).toUpperCase()}`
}

export default function VisaoGeralAdmin() {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = async () => {
    setCarregando(true)
    setErro('')
    try {
      setDados(await api.admin.resumo())
    } catch (error) {
      setErro(error.message || 'Não foi possível carregar a operação.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const alertas = [
    {
      label: 'Lojas aguardando aprovação',
      valor: Number(dados?.restaurantes?.pendentes || 0),
      to: '/admin/aprovacoes',
      Icon: Store,
    },
    {
      label: 'Tickets aguardando atendimento',
      valor: Number(dados?.tickets?.abertos || 0),
      to: '/admin/suporte',
      Icon: MessageCircle,
    },
    {
      label: 'Denúncias abertas',
      valor: Number(dados?.denuncias?.abertas || 0),
      to: '/admin/denuncias',
      Icon: AlertTriangle,
    },
  ]

  const indicadores = [
    { label: 'Pedidos hoje', valor: Number(dados?.pedidos?.hoje || 0), detalhe: `${Number(dados?.pedidos?.ativos || 0)} em andamento`, Icon: ShoppingBag, cor: 'text-primary', bg: 'bg-primary-light' },
    { label: 'Lojas publicadas', valor: Number(dados?.restaurantes?.publicados || 0), detalhe: `${Number(dados?.restaurantes?.total || 0)} cadastros`, Icon: Building2, cor: 'text-secondary', bg: 'bg-secondary/10' },
    { label: 'Entregadores online', valor: Number(dados?.entregadores?.online || 0), detalhe: `${Number(dados?.entregadores?.ocupados || 0)} em entrega`, Icon: Bike, cor: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Clientes ativos', valor: Number(dados?.clientes?.total || 0), detalhe: 'Base cadastrada', Icon: Users, cor: 'text-yellow-600', bg: 'bg-yellow-50' },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Visão geral</h1>
          <p className="mt-1 text-sm font-semibold text-text-muted">Saúde e pendências da operação FoodExpress</p>
        </div>
        <button
          type="button"
          onClick={carregar}
          disabled={carregando}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-bold text-text-secondary hover:border-primary hover:text-primary disabled:opacity-60"
        >
          <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {erro && (
        <div className="mb-5 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 sm:flex-row sm:items-center sm:justify-between">
          <span>{erro}</span>
          <button type="button" onClick={carregar} className="h-10 rounded-lg bg-red-600 px-4 font-extrabold text-white sm:h-auto sm:bg-transparent sm:p-0 sm:text-red-600 sm:underline">Tentar novamente</button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map(({ label, valor, detalhe, Icon, cor, bg }) => (
          <div key={label} className="rounded-lg border border-border bg-white p-4 shadow-sm">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
              <Icon size={17} className={cor} />
            </div>
            <p className="font-display text-2xl font-extrabold text-text-primary">{carregando && !dados ? '...' : valor}</p>
            <p className="mt-1 text-xs font-bold text-text-secondary">{label}</p>
            <p className="mt-1 text-xs font-semibold text-text-muted">{detalhe}</p>
          </div>
        ))}
      </div>

      <section className="mb-6">
        <h2 className="mb-3 font-display text-base font-extrabold text-text-primary">Fila de trabalho</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {alertas.map(({ label, valor, to, Icon }) => (
            <Link key={label} to={to} className="flex items-center gap-4 rounded-lg border border-border bg-white p-4 shadow-sm transition hover:border-primary">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${valor > 0 ? 'bg-primary-light text-primary' : 'bg-accent/10 text-accent'}`}>
                {valor > 0 ? <Icon size={18} /> : <CheckCircle size={18} />}
              </div>
              <div className="min-w-0">
                <p className="font-display text-xl font-extrabold text-text-primary">{carregando && !dados ? '...' : valor}</p>
                <p className="text-xs font-bold text-text-secondary">{label}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-base font-extrabold text-text-primary">Pedidos recentes</h2>
            <p className="text-xs font-semibold text-text-muted">Movimentação mais recente da plataforma</p>
          </div>
          <Link to="/admin/pedidos" className="text-xs font-extrabold text-primary hover:underline">Ver todos</Link>
        </div>
        {!carregando && !dados?.pedidosRecentes?.length ? (
          <div className="p-10 text-center text-sm font-semibold text-text-muted">Nenhum pedido registrado.</div>
        ) : (
          <>
          <div className="divide-y divide-border md:hidden">
            {(dados?.pedidosRecentes || []).map(pedido => (
              <Link key={pedido.id} to={`/pedido/${pedido.id}`} className="block px-4 py-4 active:bg-surface-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-extrabold text-text-primary">{numeroPedido(pedido.id)}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-text-secondary">{pedido.restaurante_nome || 'Loja'} · {pedido.cliente_nome || 'Cliente'}</p>
                    <p className="mt-1 text-xs font-bold text-text-muted">{statusLabel[pedido.status] || pedido.status} · {formatarDataBanco(pedido.created_at)}</p>
                  </div>
                  <span className="shrink-0 font-display text-sm font-extrabold text-accent">R$ {Number(pedido.total || 0).toFixed(2).replace('.', ',')}</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-2">
                <tr>
                  {['Pedido', 'Cliente', 'Loja', 'Status', 'Total', 'Data'].map(item => (
                    <th key={item} className="px-5 py-3 text-left text-xs font-extrabold uppercase text-text-muted">{item}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(dados?.pedidosRecentes || []).map(pedido => (
                  <tr key={pedido.id} className="border-t border-border">
                    <td className="px-5 py-3 font-extrabold text-text-primary">
                      <Link to={`/pedido/${pedido.id}`} className="hover:text-primary">{numeroPedido(pedido.id)}</Link>
                    </td>
                    <td className="px-5 py-3 font-semibold text-text-secondary">{pedido.cliente_nome || 'Cliente'}</td>
                    <td className="px-5 py-3 font-semibold text-text-secondary">{pedido.restaurante_nome || 'Loja'}</td>
                    <td className="px-5 py-3 font-bold text-text-secondary">{statusLabel[pedido.status] || pedido.status}</td>
                    <td className="px-5 py-3 font-extrabold text-accent">R$ {Number(pedido.total || 0).toFixed(2).replace('.', ',')}</td>
                    <td className="px-5 py-3 whitespace-nowrap font-semibold text-text-muted">{formatarDataBanco(pedido.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  )
}
