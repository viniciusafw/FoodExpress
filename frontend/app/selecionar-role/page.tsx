'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SelecionarRole() {
  const { user } = useUser()
  const router = useRouter()
  const [selecionado, setSelecionado] = useState<string>('')

  const roles = [
    {
      id: 'cliente',
      nome: 'Cliente',
      descricao: 'Fazer pedidos e acompanhar entregas',
      icon: '👤',
      rota: '/cliente'
    },
    {
      id: 'entregador',
      nome: 'Entregador',
      descricao: 'Aceitar e realizar entregas',
      icon: '🚗',
      rota: '/entregador'
    },
    {
      id: 'restaurante',
      nome: 'Restaurante',
      descricao: 'Gerenciar cardápio e pedidos',
      icon: '🍽️',
      rota: '/restaurante'
    },
    {
      id: 'operador',
      nome: 'Operador',
      descricao: 'Aprovar restaurantes e monitorar pedidos',
      icon: '⚙️',
      rota: '/operador'
    },
    {
      id: 'gerente',
      nome: 'Gerente',
      descricao: 'Ver relatórios e configurações',
      icon: '📊',
      rota: '/gerente'
    }
  ]

  const continuar = async () => {
    const role = roles.find(r => r.id === selecionado)
    if (!role) return

    if (user) {
      try {
        await user.setPublicMetadata({ role: selecionado })
      } catch (err) {
        console.error('Erro ao salvar role no Clerk:', err)
      }
    }

    localStorage.setItem('userRole', selecionado)
    router.push(role.rota)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-orange-600 mb-2">🍕 FoodExpress</h1>
          <p className="text-xl text-gray-700">Bem-vindo, {user?.firstName}!</p>
          <p className="text-gray-600 mt-2">Escolha seu perfil para continuar</p>
        </div>

        {/* Grid de Roles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => setSelecionado(role.id)}
              className={`p-6 rounded-lg transition-all transform hover:scale-105 border-2 ${
                selecionado === role.id
                  ? 'bg-orange-500 border-orange-600 text-white shadow-lg'
                  : 'bg-white border-gray-200 text-gray-800 hover:border-orange-300 hover:shadow-md'
              }`}
            >
              <div className="text-4xl mb-3">{role.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{role.nome}</h3>
              <p className={`text-sm ${selecionado === role.id ? 'text-orange-100' : 'text-gray-600'}`}>
                {role.descricao}
              </p>
            </button>
          ))}
        </div>

        {/* Botão Continuar */}
        <div className="flex justify-center">
          <button
            onClick={continuar}
            disabled={!selecionado}
            className={`px-12 py-4 rounded-lg font-semibold text-lg transition-colors ${
              selecionado
                ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continuar como {selecionado ? roles.find(r => r.id === selecionado)?.nome : '...'}
          </button>
        </div>
      </div>
    </div>
  )
}
