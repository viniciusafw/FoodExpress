import { useEffect, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { CheckCircle, XCircle, RefreshCw, Store } from 'lucide-react'
import api from '../../services/api'

export default function AprovacoesGerente() {
  const [restaurantes, setRestaurantes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState('')

  const carregar = () => {
    setCarregando(true)
    setErro('')
    api.restaurantes.pendentes()
      .then(lista => setRestaurantes(Array.isArray(lista) ? lista : []))
      .catch(e => setErro(e.message || 'Não foi possível carregar aprovações.'))
      .finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [])

  const decidir = async (id, acao) => {
    const motivo = acao === 'rejeitar' ? window.prompt('Motivo da rejeição') : ''
    if (acao === 'rejeitar' && !motivo?.trim()) return
    setProcessando(id)
    setErro('')
    try {
      await api.restaurantes.aprovar(id, acao, motivo ? { motivo_rejeicao: motivo } : {})
      setRestaurantes(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      setErro(e.message || 'Não foi possível processar a solicitação.')
    } finally {
      setProcessando('')
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Aprovações</h1>
          <p className="mt-1 text-sm font-semibold text-text-muted">Restaurantes aguardando revisão de operador</p>
        </div>
        <button
          onClick={carregar}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-bold text-text-secondary hover:border-primary hover:text-primary"
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {erro && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="py-16 text-center text-sm font-semibold text-text-muted">Carregando solicitações...</div>
      ) : restaurantes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-12 text-center">
          <Store size={32} className="mx-auto mb-3 text-text-muted" />
          <p className="font-bold text-text-primary">Nenhuma solicitação pendente</p>
          <p className="mt-1 text-sm font-semibold text-text-muted">Quando uma loja se cadastrar, ela aparece aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {restaurantes.map((rest, index) => {
            const totalItens = Number(rest.total_itens_cardapio || 0)
            const bloqueado = totalItens < 1
            return (
              <Motion.div
                key={rest.id}
                className="rounded-2xl border border-border bg-white p-5 shadow-sm"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-extrabold text-text-primary">{rest.nome}</p>
                    <p className="text-sm font-semibold text-text-muted">{rest.categoria || 'Sem categoria'}</p>
                  </div>
                  <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-extrabold text-yellow-600">Pendente</span>
                </div>

                <div className="space-y-2 text-sm font-semibold text-text-secondary">
                  <p>{rest.email || 'E-mail não informado'}</p>
                  <p>{rest.telefone || 'Telefone não informado'}</p>
                  <p>{rest.endereco || 'Endereço não informado'}</p>
                  <p className={bloqueado ? 'text-red-500' : 'text-accent'}>
                    {totalItens} item{totalItens === 1 ? '' : 's'} no cardápio
                  </p>
                </div>

                {bloqueado && (
                  <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                    Esta loja precisa cadastrar pelo menos um produto antes da aprovação.
                  </p>
                )}

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => decidir(rest.id, 'aprovar')}
                    disabled={bloqueado || processando === rest.id}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-border disabled:text-text-muted"
                  >
                    <CheckCircle size={16} /> Aprovar
                  </button>
                  <button
                    onClick={() => decidir(rest.id, 'rejeitar')}
                    disabled={processando === rest.id}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 disabled:opacity-60"
                  >
                    <XCircle size={16} /> Rejeitar
                  </button>
                </div>
              </Motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
