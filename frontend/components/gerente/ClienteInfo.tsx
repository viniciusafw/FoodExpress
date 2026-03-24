'use client'

import { useUser } from '@clerk/nextjs'

export default function ClienteInfo() {
  const { user } = useUser()
  
  if (!user) return null
  
  const role = user?.publicMetadata?.role || 'cliente'
  
  return (
    <div className="text-sm text-gray-600">
      Logado como: {user.emailAddresses[0]?.emailAddress} 
      ({role})
    </div>
  )
}