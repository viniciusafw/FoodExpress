import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import Home from './pages/Home'
import Login from './pages/Login'
import Restaurantes from './pages/Restaurantes'
import Mercados from './pages/Mercados'
import CadastroUsuario from './pages/CadastroUsuario'
import CadastroEstabelecimento from './pages/CadastroEstabelecimento'
import CadastroEntregador from './pages/CadastroEntregador'
import PaginaLoja from './pages/PaginaLoja'
import PaginaBusca from './pages/PaginaBusca'
import PerfilCliente from './pages/PerfilCliente'
import DashboardGerente from './pages/DashboardGerente'
import AdminDashboard from './pages/AdminDashboard'
import PaginaEntregador from './pages/PaginaEntregador'
import FinalizarCompra from './pages/FinalizarCompra'
import SelecionarPerfil from './pages/SelecionarPerfil'
import PainelRestaurante from './pages/PainelRestaurante'
import DetalhesPedido from './pages/DetalhesPedido'
import RastrearPedido from './pages/RastrearPedido'
import Suporte from './pages/Suporte'
import TermosUso from './pages/TermosUso'
import PoliticaPrivacidade from './pages/PoliticaPrivacidade'
import TermosParceiros from './pages/TermosParceiros'
import AuthCallback from './pages/AuthCallback'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { useAuth } from './contexts/AuthContext'
import { DarkModeProvider } from './contexts/DarkModeContext'

const PageWrapper = ({ children }) => (
  <Motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
  >
    {children}
  </Motion.div>
)

function RotaProtegida({ children, perfil }) {
  const { estaLogado, usuario, carregando } = useAuth()
  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center text-text-muted font-semibold">Carregando sessão...</div>
  }
  if (!estaLogado) return <Navigate to="/login" replace />
  if (perfil) {
    const perfis = Array.isArray(perfil) ? perfil : [perfil]
    if (!perfis.includes(usuario?.perfil)) return <Navigate to="/" replace />
  }
  return children
}


function HomeOuPainel() {
  const { usuario, carregando } = useAuth()
  if (carregando) return null
  if (usuario?.perfil === 'gerente') return <Navigate to="/gerente" replace />
  if (usuario?.perfil === 'operador') return <Navigate to="/admin" replace />
  if (usuario?.perfil === 'entregador') return <Navigate to="/entregador" replace />
  if (usuario?.perfil === 'restaurante') return <Navigate to="/painel-restaurante" replace />
  return <Home />
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><HomeOuPainel /></PageWrapper>} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/admin/login" element={<Navigate to="/login?operador=true" replace />} />
        <Route path="/register/user" element={<PageWrapper><CadastroUsuario /></PageWrapper>} />
        <Route path="/register/store" element={<PageWrapper><CadastroEstabelecimento /></PageWrapper>} />
        <Route path="/register/entregador" element={<PageWrapper><CadastroEntregador /></PageWrapper>} />
        <Route path="/Restaurantes" element={<PageWrapper><Restaurantes /></PageWrapper>} />
        <Route path="/Mercados" element={<PageWrapper><Mercados /></PageWrapper>} />
        <Route path="/loja/:id" element={<PageWrapper><PaginaLoja /></PageWrapper>} />
        <Route path="/busca" element={<PageWrapper><PaginaBusca /></PageWrapper>} />
        <Route path="/checkout" element={
          <RotaProtegida perfil="cliente">
            <PageWrapper><FinalizarCompra /></PageWrapper>
          </RotaProtegida>
        } />

        {/* Páginas novas */}
        <Route path="/selecionar-perfil" element={<PageWrapper><SelecionarPerfil /></PageWrapper>} />
        <Route path="/suporte" element={
          <RotaProtegida perfil={['cliente', 'gerente', 'restaurante', 'entregador', 'operador']}>
            <PageWrapper><Suporte /></PageWrapper>
          </RotaProtegida>
        } />
        <Route path="/termos-uso" element={<PageWrapper><TermosUso /></PageWrapper>} />
        <Route path="/politica-privacidade" element={<PageWrapper><PoliticaPrivacidade /></PageWrapper>} />
        <Route path="/termos-parceiros" element={<PageWrapper><TermosParceiros /></PageWrapper>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/pedido/:id" element={
          <RotaProtegida perfil={['cliente', 'gerente', 'operador', 'entregador']}>
            <PageWrapper><DetalhesPedido /></PageWrapper>
          </RotaProtegida>
        } />
        <Route path="/rastrear/:id" element={
          <RotaProtegida perfil={['cliente', 'entregador', 'operador']}>
            <PageWrapper><RastrearPedido /></PageWrapper>
          </RotaProtegida>
        } />

        {/* Painel do restaurante (dono) */}
        <Route path="/painel-restaurante" element={
          <RotaProtegida perfil="restaurante">
            <PageWrapper><PainelRestaurante /></PageWrapper>
          </RotaProtegida>
        } />

        {/* Perfil do cliente */}
        <Route path="/perfil" element={
          <RotaProtegida perfil="cliente">
            <PageWrapper><PerfilCliente /></PageWrapper>
          </RotaProtegida>
        } />

        {/* Dashboard e rotas do gerente */}
        <Route path="/gerente/*" element={
          <RotaProtegida perfil="gerente">
            <PageWrapper><DashboardGerente /></PageWrapper>
          </RotaProtegida>
        } />

        <Route path="/admin/*" element={
          <RotaProtegida perfil="operador">
            <PageWrapper><AdminDashboard /></PageWrapper>
          </RotaProtegida>
        } />

        {/* Painel do entregador */}
        <Route path="/entregador" element={
          <RotaProtegida perfil="entregador">
            <PageWrapper><PaginaEntregador /></PageWrapper>
          </RotaProtegida>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <CartProvider>
          <AnimatedRoutes />
        </CartProvider>
      </AuthProvider>
    </DarkModeProvider>
  )
}

export default App
