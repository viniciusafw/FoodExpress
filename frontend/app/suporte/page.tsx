'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Ticket {
  id: number
  titulo: string
  descricao: string
  categoria: string
  status: string
  created_at: string
  resolvido_em?: string
}

export default function SuportePage() {
  const [tickets] = useState<Ticket[]>([
    {
      id: 1,
      titulo: 'Pedido não chegou',
      descricao: 'Realizei um pedido mas ele não chegou até agora',
      categoria: 'pedido',
      status: 'resolvido',
      created_at: new Date().toISOString(),
      resolvido_em: new Date().toISOString()
    }
  ])

  const [abaSelecionada, setAbaSelecionada] = useState<'tickets' | 'novo'>('tickets')
  const [novoTicket, setNovoTicket] = useState({
    titulo: '',
    descricao: '',
    categoria: 'outro'
  })

  const categorias = [
    { id: 'pedido', nome: 'Problema com Pedido' },
    { id: 'entrega', nome: 'Problema com Entrega' },
    { id: 'pagamento', nome: 'Problema de Pagamento' },
    { id: 'conta', nome: 'Problema com Conta' },
    { id: 'outro', nome: 'Outro' }
  ]

  const obterCor = (status: string) => {
    switch (status) {
      case 'aberto': return 'bg-yellow-100 text-yellow-800'
      case 'em_atendimento': return 'bg-blue-100 text-blue-800'
      case 'resolvido': return 'bg-green-100 text-green-800'
      case 'fechado': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const enviarTicket = async () => {
    if (!novoTicket.titulo || !novoTicket.descricao) {
      alert('Preencha todos os campos')
      return
    }

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoTicket)
      })

      if (res.ok) {
        alert('Ticket criado! Entraremos em contato em breve')
        setNovoTicket({ titulo: '', descricao: '', categoria: 'outro' })
        setAbaSelecionada('tickets')
      }
    } catch (erro) {
      console.error('Erro:', erro)
      alert('Erro ao criar ticket')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/cliente" className="text-orange-600 text-sm hover:text-orange-700">
            ← Voltar
          </Link>
          <h1 className="text-3xl font-bold mt-2">💬 Suporte</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 flex gap-4">
          <button
            onClick={() => setAbaSelecionada('tickets')}
            className={`py-4 px-4 border-b-2 font-medium ${
              abaSelecionada === 'tickets'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600'
            }`}
          >
            Meus Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setAbaSelecionada('novo')}
            className={`py-4 px-4 border-b-2 font-medium ${
              abaSelecionada === 'novo'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-600'
            }`}
          >
            Novo Ticket
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {abaSelecionada === 'tickets' ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Meus Tickets</h2>
            {tickets.length === 0 ? (
              <div className="bg-gray-100 p-12 rounded text-center">
                <p className="text-gray-600 mb-4">Você não possui tickets abertos</p>
                <button
                  onClick={() => setAbaSelecionada('novo')}
                  className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700"
                >
                  Criar um Ticket
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="bg-white p-6 rounded-lg border hover:shadow-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Ticket #{ticket.id}</p>
                        <h3 className="text-xl font-semibold text-gray-800">{ticket.titulo}</h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${obterCor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{ticket.descricao}</p>
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>Categoria: {ticket.categoria}</span>
                      <span>Aberto em: {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">Criar Novo Ticket</h2>
            <div className="bg-white rounded-lg border p-8">
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Categoria do Problema</label>
                <select
                  value={novoTicket.categoria}
                  onChange={(e) => setNovoTicket({ ...novoTicket, categoria: e.target.value })}
                  className="w-full border rounded px-4 py-2"
                >
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Assunto</label>
                <input
                  type="text"
                  value={novoTicket.titulo}
                  onChange={(e) => setNovoTicket({ ...novoTicket, titulo: e.target.value })}
                  placeholder="Resumo do problema"
                  className="w-full border rounded px-4 py-2"
                />
              </div>

              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Descrição Detalhada</label>
                <textarea
                  value={novoTicket.descricao}
                  onChange={(e) => setNovoTicket({ ...novoTicket, descricao: e.target.value })}
                  placeholder="Descreva o problema em detalhes..."
                  className="w-full border rounded px-4 py-3 h-40 resize-none"
                />
              </div>

              <button
                onClick={enviarTicket}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded transition-colors"
              >
                Enviar Ticket
              </button>
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-bold text-blue-900 mb-2">📞 Tempo de Resposta</h4>
              <p className="text-blue-800">
                Respondemos tickets em até 24 horas. Você receberá um email com atualizações.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
