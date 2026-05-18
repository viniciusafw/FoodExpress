'use client'

import { useAuth0 } from "@auth0/auth0-react"

function getUserRole(user: ReturnType<typeof useAuth0>['user']) {
  const claims = user as Record<string, unknown> | undefined
  return (claims?.role || claims?.['https://foodexpress.com/role'] || 'cliente') as string
}

export default function ClienteInfo() {
  const { user, isAuthenticated, isLoading } = useAuth0()
  
  if (isLoading || !isAuthenticated || !user) return null
  
  const role = getUserRole(user)
  
  return (
    <div className="text-sm text-gray-600">
      Logado como: {user.email || user.name || 'Usuário'} 
      ({role})
    </div>
  )
}
