import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { estaLogado, usuario, carregando, aplicarSessao } = useAuth()
  const [erro, setErro] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const perfil = searchParams.get('perfil') || 'cliente'
    const erroParam = searchParams.get('erro')

    if (erroParam) {
      const msgs = {
        token_expirado: 'O link expirou. Solicite um novo.',
        token_invalido: 'O link é inválido. Solicite um novo.',
        token_expirado_ou_invalido: 'O link expirou ou já foi usado. Solicite um novo.',
        google_cancelado: 'Login com Google cancelado.',
        google_falhou: 'Não foi possível autenticar com o Google.',
        google_erro: 'Erro ao conectar com o Google.',
        usuario_nao_encontrado: 'Usuário não encontrado.',
        servidor: 'Erro no servidor. Tente novamente.',
      }
      setErro(msgs[erroParam] || 'Erro ao fazer login.')
      setTimeout(() => navigate('/login'), 3000)
      return
    }

    // Fluxo Auth0: redireciona quando o contexto já estiver autenticado
    if (!token) {
      if (carregando) return
      if (estaLogado) {
        const destinos = {
          cliente: '/',
          gerente: '/gerente',
          entregador: '/entregador',
          operador: '/admin',
        }
        navigate(destinos[usuario?.perfil || 'cliente'] || '/', { replace: true })
        return
      }
      setErro('Não foi possível concluir o login.')
      setTimeout(() => navigate('/login', { replace: true }), 2000)
      return
    }

    let usuarioSessao = { perfil }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      usuarioSessao = {
        id: payload.userId,
        perfil: payload.role || perfil,
        email: payload.email || '',
        nome: payload.nome || payload.email?.split('@')[0] || '',
      }
    } catch {
      // não bloqueia o fluxo se o decode falhar
    }

    aplicarSessao(token, usuarioSessao)
  }, [searchParams, carregando, estaLogado, usuario, navigate])

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Motion.div
          className="bg-white rounded-2xl border border-red-200 p-8 text-center max-w-sm w-full shadow-sm"
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-3xl mb-4">⚠️</p>
          <p className="font-display font-bold text-text-primary mb-2">Ops!</p>
          <p className="text-sm text-text-muted">{erro}</p>
          <p className="text-xs text-text-muted mt-3">Redirecionando para o login...</p>
        </Motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        <Motion.div
          className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        />
        <p className="text-sm font-semibold text-text-muted">Entrando na sua conta...</p>
      </Motion.div>
    </div>
  )
}
