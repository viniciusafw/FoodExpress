import { useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  BarChart3, Flag, LayoutDashboard, LogOut, Menu,
  MessageCircle, ShieldCheck, ShoppingBag, X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import logoSrc from '../imgs/Logo-site.png'
import AprovacoesGerente from './gerente/AprovacoesGerente'
import DenunciasProdutosGerente from './gerente/DenunciasProdutosGerente'
import PedidosGerente from './gerente/PedidosGerente'
import RelatoriosGerente from './gerente/RelatoriosGerente'
import SuporteAdmin from './admin/SuporteAdmin'
import VisaoGeralAdmin from './admin/VisaoGeralAdmin'

const links = [
  { to: '/admin', label: 'Visão geral', Icon: LayoutDashboard, exato: true },
  { to: '/admin/aprovacoes', label: 'Aprovações', Icon: ShieldCheck },
  { to: '/admin/pedidos', label: 'Pedidos', Icon: ShoppingBag },
  { to: '/admin/denuncias', label: 'Denúncias', Icon: Flag },
  { to: '/admin/suporte', label: 'Suporte', Icon: MessageCircle },
  { to: '/admin/relatorios', label: 'Relatórios', Icon: BarChart3 },
]

export default function AdminDashboard() {
  const { usuario, sair } = useAuth()
  const location = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)

  const ativo = (item) => item.exato
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to)

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-sm">
        <div className="bg-secondary px-4 py-1.5 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <span className="text-xs font-bold text-white/80">Administração da plataforma</span>
            <span className="hidden text-xs font-semibold text-white/60 sm:block">Acesso restrito a operadores</span>
          </div>
        </div>

        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/admin" className="shrink-0">
            <img src={logoSrc} alt="FoodExpress" className="h-9 w-auto" />
          </Link>
          <span className="hidden rounded-md bg-secondary/10 px-2.5 py-1 text-xs font-extrabold uppercase text-secondary lg:block">Admin</span>

          <nav className="hidden min-w-0 flex-1 items-center overflow-x-auto md:flex">
            {links.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex h-14 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-xs font-bold transition ${
                  ativo(item)
                    ? 'border-primary bg-primary-light/50 text-primary'
                    : 'border-transparent text-text-secondary hover:border-primary hover:text-primary'
                }`}
              >
                <item.Icon size={14} /> {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-sm font-bold text-white">
                {(usuario?.nome || 'A').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-text-primary">{(usuario?.nome || 'Administrador').split(' ')[0]}</span>
            </div>
            <button type="button" onClick={sair} title="Sair" className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-secondary hover:border-red-300 hover:text-red-500">
              <LogOut size={15} />
            </button>
            <button
              type="button"
              onClick={() => setMenuAberto(prev => !prev)}
              title="Abrir menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-text-secondary md:hidden"
            >
              {menuAberto ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>

        {menuAberto && (
          <nav className="border-t border-border bg-white px-4 py-3 md:hidden">
            {links.map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuAberto(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold ${
                  ativo(item) ? 'bg-primary-light text-primary' : 'text-text-secondary'
                }`}
              >
                <item.Icon size={16} /> {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Routes>
          <Route index element={<VisaoGeralAdmin />} />
          <Route path="aprovacoes" element={<AprovacoesGerente />} />
          <Route path="pedidos" element={<PedidosGerente />} />
          <Route path="denuncias" element={<DenunciasProdutosGerente />} />
          <Route path="suporte" element={<SuporteAdmin />} />
          <Route path="relatorios" element={<RelatoriosGerente />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}
