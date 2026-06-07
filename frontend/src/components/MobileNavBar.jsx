import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import CartDrawer from './GavetaCarrinho';
import {
  Bike, Home, LayoutDashboard, LifeBuoy, LogIn,
  Search, Settings, ShoppingBag, User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { motion as Motion, AnimatePresence } from 'framer-motion';

export default function MobileNavBar() {
  const { estaLogado, usuario } = useAuth();
  const { quantidadeTotal } = useCart();
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [cartPulse, setCartPulse] = useState(0);
  const location = useLocation();
  const logado = estaLogado;
  const perfil = usuario?.perfil || 'cliente';
  const ativo = (path) => location.pathname === path;

  useEffect(() => {
    const pulse = () => setCartPulse(v => v + 1);
    window.addEventListener('foodexpress:carrinho-item-adicionado', pulse);
    return () => window.removeEventListener('foodexpress:carrinho-item-adicionado', pulse);
  }, []);

  const navItemsCliente = [
    { to: '/', label: 'Início', Icon: Home },
    { to: '/busca', label: 'Buscar', Icon: Search },
  ];
  const navItemsPorPerfil = {
    gerente: [
      { to: '/gerente', label: 'Painel', Icon: LayoutDashboard },
      { to: '/gerente/pedidos', label: 'Pedidos', Icon: ShoppingBag },
      { to: '/suporte', label: 'Suporte', Icon: LifeBuoy },
      { to: '/gerente/configuracoes', label: 'Ajustes', Icon: Settings },
    ],
    entregador: [
      { to: '/entregador', label: 'Entregas', Icon: Bike },
      { to: '/suporte', label: 'Suporte', Icon: LifeBuoy },
    ],
    operador: [
      { to: '/admin', label: 'Admin', Icon: LayoutDashboard },
      { to: '/admin/suporte', label: 'Suporte', Icon: LifeBuoy },
    ],
    restaurante: [
      { to: '/painel-restaurante', label: 'Painel', Icon: LayoutDashboard },
      { to: '/suporte', label: 'Suporte', Icon: LifeBuoy },
    ],
  };
  const navItems = perfil === 'cliente' ? navItemsCliente : (navItemsPorPerfil[perfil] || navItemsCliente);
  const mostrarItensCliente = !logado || perfil === 'cliente';

  return (
    <>
      <Motion.nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 flex justify-around items-center px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 260, delay: 0.3 }}
      >
        {navItems.map(({ to, label, Icon }) => {
          const IconComponent = Icon
          return (
            <Link
              key={to}
              to={to}
              className={`flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-all ${ativo(to) ? 'text-primary bg-primary-light' : 'text-text-muted'}`}
            >
              <Motion.div whileTap={{ scale: 0.85 }}>
                <IconComponent size={22} />
              </Motion.div>
              <span className="text-[0.65rem] font-bold">{label}</span>
            </Link>
          )
        })}
        {/* Botão carrinho */}
        {mostrarItensCliente && <Motion.button
          data-cart-target="mobile-cart"
          onClick={() => setCarrinhoAberto(true)}
          className="flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-text-muted border-none bg-transparent cursor-pointer"
          animate={cartPulse ? { y: [0, -3, 0], scale: [1, 1.08, 1] } : { y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          whileTap={{ scale: 0.85 }}
        >
          <div className="relative">
            <ShoppingBag size={22} />
            <AnimatePresence>
              {quantidadeTotal > 0 && (
                <Motion.span
                  className="absolute -top-1.5 -right-1.5 bg-primary text-white rounded-full min-w-4 h-4 text-[0.6rem] font-extrabold flex items-center justify-center px-px border-2 border-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                  {quantidadeTotal}
                </Motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className="text-[0.65rem] font-bold">Pedidos</span>
        </Motion.button>}

        {/* Perfil / Login */}
        {mostrarItensCliente && (logado ? (
          <Link
            to="/perfil"
            className={`flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-all ${ativo('/perfil') ? 'text-primary bg-primary-light' : 'text-text-muted'}`}
          >
            <Motion.div whileTap={{ scale: 0.85 }}>
              <User size={22} />
            </Motion.div>
            <span className="text-[0.65rem] font-bold">Perfil</span>
          </Link>
        ) : (
          <Link
            to="/login"
            className={`flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-all ${ativo('/login') ? 'text-primary bg-primary-light' : 'text-text-muted'}`}
          >
            <Motion.div whileTap={{ scale: 0.85 }}>
              <LogIn size={22} />
            </Motion.div>
            <span className="text-[0.65rem] font-bold">Entrar</span>
          </Link>
        ))}
      </Motion.nav>

      <CartDrawer isOpen={carrinhoAberto} onClose={() => setCarrinhoAberto(false)} />
    </>
  );
}
