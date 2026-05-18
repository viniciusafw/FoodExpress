'use client'

import { useState, useEffect } from 'react'
import { useAuth0 } from "@auth0/auth0-react"

interface Restaurante {
  id: string
  nome: string
  cnpj: string
  email: string
  telefone: string
  endereco: string
  categoria: string
  status: string
  avaliacao_media: number
  created_at: string
}

export default function AprovacaoRestaurantesModal({ restauranteId, onClose, onAprovado }: {
  restauranteId: string
  onClose: () => void
  onAprovado: () => void
}) {
  const { isAuthenticated, isLoading } = useAuth0()
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [taxa, setTaxa] = useState(15)
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregarRestaurante()
  }, [restauranteId])

  const carregarRestaurante = async () => {
    try {
      const res = await fetch(`/api/restaurantes/${restauranteId}`)
      if (res.ok) {
        const dados = await res.json()
        setRestaurante(dados)
      }
    } catch (e) {
      setErro('Erro ao carregar restaurante')
    } finally {
      setCarregando(false)
    }
  }

  const aprovar = async () => {
    setProcessando(true)
    setErro('')
    try {
      const res = await fetch(`/api/restaurantes/${restauranteId}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'aprovar',
          taxa_comissao: taxa
        })
      })

      if (res.ok) {
        onAprovado()
        onClose()
      } else {
        const data = await res.json()
        setErro(data.erro)
      }
    } catch (e) {
      setErro('Erro ao aprovar restaurante')
    } finally {
      setProcessando(false)
    }
  }

  const rejeitar = async () => {
    if (!motivo.trim()) {
      setErro('Motivo é obrigatório para rejeitar')
      return
    }

    setProcessando(true)
    setErro('')
    try {
      const res = await fetch(`/api/restaurantes/${restauranteId}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'rejeitar',
          motivo_rejeicao: motivo
        })
      })

      if (res.ok) {
        onAprovado()
        onClose()
      } else {
        const data = await res.json()
        setErro(data.erro)
      }
    } catch (e) {
      setErro('Erro ao rejeitar restaurante')
    } finally {
      setProcessando(false)
    }
  }

  if (isLoading || carregando) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <p className="text-red-600">Usuário não autenticado</p>
          <button
            onClick={onClose}
            className="mt-4 w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  if (!restaurante) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <p className="text-red-600">Restaurante não encontrado</p>
          <button
            onClick={onClose}
            className="mt-4 w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Análise de Restaurante</h2>

        {/* Informações do Restaurante */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-600 text-sm">Nome</p>
              <p className="font-semibold">{restaurante.nome}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">CNPJ</p>
              <p className="font-semibold">{restaurante.cnpj}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Email</p>
              <p className="font-semibold">{restaurante.email}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Telefone</p>
              <p className="font-semibold">{restaurante.telefone}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Categoria</p>
              <p className="font-semibold capitalize">{restaurante.categoria}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Data Cadastro</p>
              <p className="font-semibold">{new Date(restaurante.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Endereço</p>
            <p className="font-semibold">{restaurante.endereco}</p>
          </div>
        </div>

        {erro && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {erro}
          </div>
        )}

        {/* Seção de Aprovação */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">Taxa de Comissão</h3>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="0"
              max="100"
              value={taxa}
              onChange={(e) => setTaxa(Number(e.target.value))}
              className="border rounded px-4 py-2 w-32"
            />
            <span className="text-gray-600">%</span>
            <p className="text-sm text-gray-600 flex-1">Percentual de comissão padrão é 15%</p>
          </div>
        </div>

        {/* Seção de Rejeição */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">Motivo da Rejeição (se aplicável)</h3>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Descreva o motivo da rejeição..."
            className="w-full border rounded px-4 py-3 h-24 resize-none"
          />
        </div>

        {/* Botões */}
        <div className="flex gap-4">
          <button
            onClick={aprovar}
            disabled={processando}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded transition-colors"
          >
            {processando ? '⏳ Processando...' : '✅ Aprovar Restaurante'}
          </button>
          <button
            onClick={rejeitar}
            disabled={processando || !motivo.trim()}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 rounded transition-colors"
          >
            {processando ? '⏳ Processando...' : '❌ Rejeitar'}
          </button>
          <button
            onClick={onClose}
            disabled={processando}
            className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-bold py-3 rounded transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
