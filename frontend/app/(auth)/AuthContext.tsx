'use client'

import { createContext, useContext, useState, useEffect } from 'react'

interface Usuario {
  id: string
  nome: string
  email: string
  perfil: 'cliente' | 'entregador' | 'restaurante' | 'operador' | 'gerente'
}

interface AuthContextType {
  usuario: Usuario | null
  carregando: boolean
  login: (email: string, senha: string) => Promise<void>
  cadastro: (nome: string, email: string, senha: string, perfil: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Carregar usuário do localStorage ao iniciar
  useEffect(() => {
    const usuarioSalvo = localStorage.getItem('usuario')
    if (usuarioSalvo) {
      try {
        setUsuario(JSON.parse(usuarioSalvo))
      } catch (erro) {
        console.error('Erro ao carregar usuário:', erro)
      }
    }
    setCarregando(false)
  }, [])

  const login = async (email: string, senha: string) => {
    // Simular validação (em produção seria com um servidor)
    if (!email || !senha) {
      throw new Error('Email e senha são obrigatórios')
    }

    // Usuários pré-criados para testes
    const usuariosDemo: Record<string, Usuario> = {
      'cliente@test.com': {
        id: '1',
        nome: 'João Silva',
        email: 'cliente@test.com',
        perfil: 'cliente'
      },
      'entregador@test.com': {
        id: '2',
        nome: 'Maria Silva',
        email: 'entregador@test.com',
        perfil: 'entregador'
      },
      'restaurante@test.com': {
        id: '3',
        nome: 'Pizzaria do João',
        email: 'restaurante@test.com',
        perfil: 'restaurante'
      },
      'operador@test.com': {
        id: '4',
        nome: 'Carlos',
        email: 'operador@test.com',
        perfil: 'operador'
      },
      'gerente@test.com': {
        id: '5',
        nome: 'Admin',
        email: 'gerente@test.com',
        perfil: 'gerente'
      }
    }

    const usuarioEncontrado = usuariosDemo[email]
    if (!usuarioEncontrado) {
      throw new Error('Usuário não encontrado. Tente: cliente@test.com')
    }

    // Simular validação de senha
    if (senha !== 'senha123') {
      throw new Error('Senha incorreta. Use: senha123')
    }

    setUsuario(usuarioEncontrado)
    localStorage.setItem('usuario', JSON.stringify(usuarioEncontrado))
  }

  const cadastro = async (nome: string, email: string, senha: string, perfil: string) => {
    if (!nome || !email || !senha || !perfil) {
      throw new Error('Todos os campos são obrigatórios')
    }

    const novoUsuario: Usuario = {
      id: Math.random().toString(36).substr(2, 9),
      nome,
      email,
      perfil: perfil as any
    }

    setUsuario(novoUsuario)
    localStorage.setItem('usuario', JSON.stringify(novoUsuario))
  }

  const logout = () => {
    setUsuario(null)
    localStorage.removeItem('usuario')
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, cadastro, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
