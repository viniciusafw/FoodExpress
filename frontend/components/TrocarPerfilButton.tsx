'use client'
import { useAuth0 } from "@auth0/auth0-react"

function getUserRole(user: ReturnType<typeof useAuth0>['user']) {
  const claims = user as Record<string, unknown> | undefined
  return (claims?.role || claims?.['https://foodexpress.com/role']) as string | undefined
}

export function TrocarPerfilButton() {
  const { user, isAuthenticated, isLoading } = useAuth0()
  const role = getUserRole(user)
  
  if (isLoading || !isAuthenticated || !role) return null

  const perfilNomes: Record<string, string> = {
    cliente: '👤 Cliente',
    entregador: '🚴 Entregador',
    restaurante: '🏪 Restaurante',
    gerente: '🔐 Gerente',
  }

  const perfilAtual = perfilNomes[role] || role

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
      <span className="text-sm font-medium text-blue-800">
        Perfil: <strong>{perfilAtual}</strong>
      </span>
      <a
        href="/selecionar-role?trocar=true"
        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
        title="Trocar de perfil"
      >
        🔄 Trocar
      </a>
    </div>
  )
}
