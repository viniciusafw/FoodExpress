'use client'

import { useAuth0 } from "@auth0/auth0-react"

interface LogoutButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function LogoutButton({ className = '', children }: LogoutButtonProps) {
  const { logout } = useAuth0()

  const handleLogout = () => {
    try {
      logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      })
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  return (
    <button
      onClick={handleLogout}
      className={`px-3 py-2 bg-red-100 hover:bg-red-200 rounded text-sm transition-colors ${className}`}
      title="Sair"
    >
      {children || '🚪'}
    </button>
  )
}
