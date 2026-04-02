'use client'

import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

interface LogoutButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function LogoutButton({ className = '', children }: LogoutButtonProps) {
  const { signOut } = useClerk()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/sign-in')
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