'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Perfil {
  nome: string
  email: string
  telefone: string
  cidade: string
  endereco: string
}

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<Perfil>({
    nome: 'João Silva',
    email: 'joao@example.com',
    telefone: '11999999999',
    cidade: 'São Paulo',
    endereco: 'Rua das Flores, 123'
  })

  const [editando, setEditando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPerfil({ ...perfil, [name]: value })
  }

  const salvarPerfil = async () => {
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(perfil)
      })

      if (res.ok) {
        setSalvo(true)
        setEditando(false)
        setTimeout(() => setSalvo(false), 3000)
      }
    } catch (erro) {
      console.error('Erro:', erro)
      alert('Erro ao salvar perfil')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/cliente" className="text-orange-600 text-sm hover:text-orange-700">
            ← Voltar
          </Link>
          <h1 className="text-3xl font-bold mt-2">👤 Meu Perfil</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border p-8">
          {salvo && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded p-4">
              <p className="text-green-800 font-semibold">✓ Perfil atualizado com sucesso!</p>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Informações Pessoais</h2>

            {editando ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Nome</label>
                    <input
                      type="text"
                      name="nome"
                      value={perfil.nome}
                      onChange={handleChange}
                      className="w-full border rounded px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={perfil.email}
                      onChange={handleChange}
                      className="w-full border rounded px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Telefone</label>
                    <input
                      type="tel"
                      name="telefone"
                      value={perfil.telefone}
                      onChange={handleChange}
                      className="w-full border rounded px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Cidade</label>
                    <input
                      type="text"
                      name="cidade"
                      value={perfil.cidade}
                      onChange={handleChange}
                      className="w-full border rounded px-4 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Endereço Principal</label>
                    <input
                      type="text"
                      name="endereco"
                      value={perfil.endereco}
                      onChange={handleChange}
                      className="w-full border rounded px-4 py-2"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={salvarPerfil}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded font-semibold"
                  >
                    Salvar Alterações
                  </button>
                  <button
                    onClick={() => setEditando(false)}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded border">
                    <div>
                      <p className="text-sm text-gray-600">Nome</p>
                      <p className="text-lg font-semibold">{perfil.nome}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded border">
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-lg font-semibold">{perfil.email}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded border">
                    <div>
                      <p className="text-sm text-gray-600">Telefone</p>
                      <p className="text-lg font-semibold">{perfil.telefone}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded border">
                    <div>
                      <p className="text-sm text-gray-600">Cidade</p>
                      <p className="text-lg font-semibold">{perfil.cidade}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded border">
                    <div>
                      <p className="text-sm text-gray-600">Endereço Principal</p>
                      <p className="text-lg font-semibold">{perfil.endereco}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setEditando(true)}
                  className="mt-6 bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded font-semibold"
                >
                  ✏️ Editar Perfil
                </button>
              </>
            )}
          </div>

          <hr className="my-8" />

          <div>
            <h2 className="text-2xl font-bold mb-6">Segurança</h2>

            <div className="space-y-3">
              <button className="w-full p-4 bg-gray-50 rounded border hover:bg-gray-100 text-left font-semibold">
                🔐 Alterar Senha
              </button>
              <button className="w-full p-4 bg-gray-50 rounded border hover:bg-gray-100 text-left font-semibold">
                📱 Verificação de 2 Fatores
              </button>
              <button className="w-full p-4 bg-gray-50 rounded border hover:bg-gray-100 text-left font-semibold">
                🔑 Sessões Ativas
              </button>
            </div>
          </div>

          <hr className="my-8" />

          <div>
            <h2 className="text-2xl font-bold mb-6">Preferências</h2>

            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded border cursor-pointer">
              <input type="checkbox" defaultChecked className="w-5 h-5" />
              <span className="font-semibold">Receber notificações de pedidos</span>
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded border cursor-pointer mt-2">
              <input type="checkbox" defaultChecked className="w-5 h-5" />
              <span className="font-semibold">Receber promoções e ofertas</span>
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded border cursor-pointer mt-2">
              <input type="checkbox" className="w-5 h-5" />
              <span className="font-semibold">Compartilhar histórico de pedidos para análise</span>
            </label>
          </div>

          <hr className="my-8" />

          <div>
            <h2 className="text-2xl font-bold mb-6 text-red-600">Zona de Perigo</h2>
            <button className="w-full p-4 bg-red-50 border border-red-200 rounded hover:bg-red-100 text-red-700 font-semibold">
              🚫 Deletar Conta Permanentemente
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
