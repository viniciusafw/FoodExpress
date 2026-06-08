import { useState, useEffect } from 'react'
import StoreCard from './CartaoLoja'
import api from '../services/api'
import { paramsComLocalizacao } from '../utils/localizacao'
import { statusFuncionamento } from '../utils/horarios'

const CATEGORIAS_MERCADO = new Set(['mercado', 'conveniencia', 'farmacia', 'pet shop', 'petshop', 'shopping', 'bebidas'])

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function normalizarPromocaoLoja(loja) {
  const promocao = String(loja?.promo || '').trim()
  const texto = normalizarTexto(promocao)
  if (!promocao || texto.includes('fake') || texto.includes('cupom')) return null
  const id = String(loja?.id || '')
  if (!id.startsWith('fake_')) return promocao
  const numero = Number(id.match(/(\d+)/)?.[1] || 0)
  return numero > 0 && numero % 11 === 0 ? promocao : null
}

export default function StoreGrid({ tipo = 'restaurante', limite = 50, somenteLinha = false }) {
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [versaoLocalizacao, setVersaoLocalizacao] = useState(0)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    const atualizar = () => setVersaoLocalizacao(v => v + 1)
    window.addEventListener('localizacao-atualizada', atualizar)
    return () => window.removeEventListener('localizacao-atualizada', atualizar)
  }, [])

  useEffect(() => {
    setErro('')
    setCarregando(true)
    api.restaurantes.listar(paramsComLocalizacao({ limite: tipo === 'mercado' ? 1000 : limite }))
      .then(dados => {
        const normalizados = dados
          .filter(r => {
            const categoria = normalizarTexto(r.categoria)
            const mercado = CATEGORIAS_MERCADO.has(categoria)
            return tipo === 'mercado' ? mercado : !mercado
          })
          .slice(0, limite)
          .map(r => {
            const funcionamento = statusFuncionamento(r)
            return {
              ...r,
              promo: normalizarPromocaoLoja(r),
              emoji: r.emoji || '🍽️',
              avaliacao: r.avaliacao_media ?? 0,
              tempoEntrega: r.tempo_medio_preparo ? `${r.tempo_medio_preparo}-${r.tempo_medio_preparo + 10} min` : '30-40 min',
              taxaEntrega: 'Grátis',
              fechado: !funcionamento.aberta,
              statusFuncionamento: funcionamento.texto,
            }
          })
        setLista(normalizados)
      })
      .catch(err => {
        if (err.message?.includes('Backend offline') || err.message?.includes('fetch')) {
          setErro('backend_offline')
        } else {
          console.error(err)
          setErro('erro_generico')
        }
      })
      .finally(() => setCarregando(false))
  }, [tipo, limite, versaoLocalizacao, tentativa])

  if (carregando) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-surface-2 animate-pulse" />
        ))}
      </div>
    )
  }

  if (erro === 'backend_offline') {
    return (
      <div className="text-center py-16 text-text-muted bg-surface-2 rounded-2xl border border-border">
        <p className="text-4xl mb-3">🔌</p>
        <p className="font-bold text-text-primary mb-1">Não foi possível carregar as lojas</p>
        <p className="text-sm font-semibold mb-4">Verifique sua conexão e tente novamente.</p>
        <button
          type="button"
          onClick={() => setTentativa(valor => valor + 1)}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white border-none"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!lista.length) {
    return (
      <div className="text-center py-16 text-text-muted">
        <p className="text-4xl mb-3">🍽️</p>
        <p className="font-semibold">Nenhum restaurante encontrado</p>
      </div>
    )
  }

  return (
    <div className={somenteLinha
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6'
    }>
      {lista.map((loja, i) => (
        <StoreCard key={loja.id} loja={loja} index={i} />
      ))}
    </div>
  )
}
