import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  Clock3,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Store,
  Tag,
  Truck,
  X,
} from 'lucide-react'
import StoreCard from './CartaoLoja'
import api from '../services/api'
import { garantirLocalizacaoCepSalvo, paramsComLocalizacao } from '../utils/localizacao'
import { statusFuncionamento } from '../utils/horarios'

const CATEGORIAS_MERCADO = new Set([
  'mercado',
  'conveniencia',
  'farmacia',
  'pet shop',
  'petshop',
  'shopping',
  'bebidas',
])
const ITENS_POR_PAGINA = 24

const opcoesOrdenacao = [
  { value: 'recomendados', label: 'Recomendados' },
  { value: 'avaliacao', label: 'Melhor avaliados' },
  { value: 'tempo', label: 'Entrega mais rápida' },
  { value: 'distancia', label: 'Mais próximos' },
  { value: 'nome', label: 'Nome A-Z' },
]

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function lerLista(valor) {
  if (Array.isArray(valor)) return valor
  if (!valor) return []
  try {
    const lista = JSON.parse(valor)
    return Array.isArray(lista) ? lista : []
  } catch {
    return String(valor).split(',').map(item => item.trim()).filter(Boolean)
  }
}

function formatarDistancia(valor) {
  const distancia = Number(valor)
  if (!Number.isFinite(distancia)) return null
  if (distancia < 1) return `${Math.round(distancia * 1000)} m`
  return `${distancia.toFixed(1).replace('.', ',')} km`
}

function deveMostrarPromoFake(loja) {
  const id = String(loja?.id || '')
  if (!id.startsWith('fake_')) return true
  const numero = Number(id.match(/(\d+)/)?.[1] || 0)
  return numero > 0 && numero % 11 === 0
}

function normalizarPromocaoLoja(loja) {
  const promocao = String(loja?.promo || '').trim()
  const texto = normalizarTexto(promocao)
  if (!promocao || texto.includes('fake') || texto.includes('cupom')) return null
  if (!deveMostrarPromoFake(loja)) return null
  return promocao
}

function normalizarLoja(loja) {
  const promocao = normalizarPromocaoLoja(loja)
  const freteGratis = normalizarTexto(promocao).includes('frete gratis')
  const tempo = Number(loja.tempo_medio_preparo)
  const distanciaKm = loja.distancia_km == null ? null : Number(loja.distancia_km)
  const categoriaNormalizada = normalizarTexto(loja.categoria)
  const funcionamento = statusFuncionamento(loja)

  return {
    ...loja,
    promo: promocao,
    categoriaNormalizada,
    avaliacao: Number(loja.avaliacao_media || 0),
    tempoMin: Number.isFinite(tempo) ? tempo : 40,
    tempoEntrega: Number.isFinite(tempo) ? `${tempo}-${tempo + 10} min` : '30-40 min',
    taxaEntrega: freteGratis ? 'Grátis' : 'A calcular',
    gratis: freteGratis,
    distanciaKm: Number.isFinite(distanciaKm) ? distanciaKm : null,
    distancia: loja.distancia || formatarDistancia(distanciaKm),
    pagamentos: lerLista(loja.formas_pagamento),
    abertaAgora: funcionamento.aberta,
    fechado: !funcionamento.aberta,
    statusFuncionamento: funcionamento.texto,
  }
}

function pertenceAoCatalogo(loja, tipo) {
  if (tipo === 'todos') return true
  const mercado = CATEGORIAS_MERCADO.has(loja.categoriaNormalizada)
  return tipo === 'mercado' ? mercado : !mercado
}

function BotaoFiltro({ ativo, children, onClick, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 flex-shrink-0 inline-flex items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors ${
        ativo
          ? 'border-primary bg-primary text-white'
          : 'border-border bg-white text-text-secondary hover:border-primary hover:text-primary'
      }`}
    >
      {Icon && <Icon size={14} />}
      {children}
      {ativo && <Check size={13} />}
    </button>
  )
}

function GrupoOpcoes({ titulo, opcoes, valor, onChange }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-extrabold uppercase text-text-muted">{titulo}</legend>
      <div className="grid grid-cols-2 gap-2">
        {opcoes.map(opcao => (
          <button
            type="button"
            key={opcao.value}
            onClick={() => onChange(opcao.value)}
            className={`min-h-9 rounded-lg border px-2.5 py-2 text-left text-xs font-bold transition-colors ${
              valor === opcao.value
                ? 'border-primary bg-primary-light text-primary'
                : 'border-border bg-white text-text-secondary hover:border-primary'
            }`}
          >
            {opcao.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function PainelFiltros({
  categorias,
  categoria,
  setCategoria,
  avaliacaoMin,
  setAvaliacaoMin,
  tempoMax,
  setTempoMax,
  distanciaMax,
  setDistanciaMax,
  pagamento,
  setPagamento,
  temDistancias,
  limparFiltros,
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-extrabold text-text-primary">Filtros</h2>
        <button
          type="button"
          onClick={limparFiltros}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-primary"
        >
          <RotateCcw size={13} />
          Limpar
        </button>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-extrabold uppercase text-text-muted">Categoria</legend>
        <div className="max-h-52 space-y-1 overflow-y-auto pr-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setCategoria('todas')}
            className={`flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-bold ${
              categoria === 'todas' ? 'bg-primary-light text-primary' : 'text-text-secondary hover:bg-surface-2'
            }`}
          >
            Todas
            {categoria === 'todas' && <Check size={14} />}
          </button>
          {categorias.map(item => (
            <button
              type="button"
              key={item.valor}
              onClick={() => setCategoria(item.valor)}
              className={`flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-bold ${
                categoria === item.valor ? 'bg-primary-light text-primary' : 'text-text-secondary hover:bg-surface-2'
              }`}
            >
              <span className="truncate">{item.nome}</span>
              <span className="ml-2 text-xs text-text-muted">{item.total}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <GrupoOpcoes
        titulo="Avaliação mínima"
        valor={avaliacaoMin}
        onChange={setAvaliacaoMin}
        opcoes={[
          { value: 0, label: 'Qualquer' },
          { value: 4, label: '4,0 ou mais' },
          { value: 4.5, label: '4,5 ou mais' },
          { value: 4.8, label: '4,8 ou mais' },
        ]}
      />

      <GrupoOpcoes
        titulo="Tempo de entrega"
        valor={tempoMax}
        onChange={setTempoMax}
        opcoes={[
          { value: 0, label: 'Qualquer' },
          { value: 20, label: 'Até 20 min' },
          { value: 30, label: 'Até 30 min' },
          { value: 45, label: 'Até 45 min' },
        ]}
      />

      {temDistancias && (
        <GrupoOpcoes
          titulo="Distância"
          valor={distanciaMax}
          onChange={setDistanciaMax}
          opcoes={[
            { value: 0, label: 'Qualquer' },
            { value: 2, label: 'Até 2 km' },
            { value: 5, label: 'Até 5 km' },
            { value: 10, label: 'Até 10 km' },
          ]}
        />
      )}

      <label className="block">
        <span className="mb-2 block text-xs font-extrabold uppercase text-text-muted">Pagamento</span>
        <select
          value={pagamento}
          onChange={event => setPagamento(event.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-bold text-text-secondary outline-none focus:border-primary"
        >
          <option value="">Todos</option>
          <option value="pix">Pix</option>
          <option value="credito">Crédito</option>
          <option value="debito">Débito</option>
          <option value="dinheiro">Dinheiro</option>
        </select>
      </label>
    </div>
  )
}

export default function CatalogoLojas({ tipo = 'restaurante' }) {
  const [searchParams] = useSearchParams()
  const termoInicial = String(searchParams.get('termo') || searchParams.get('q') || searchParams.get('categoria') || '').trim()
  const abrirFiltrosInicial = searchParams.get('filtros') === '1'
  const [lojas, setLojas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [versaoLocalizacao, setVersaoLocalizacao] = useState(0)
  const [tentativa, setTentativa] = useState(0)
  const [busca, setBusca] = useState(() => String(searchParams.get('busca') || '').trim())
  const [categoria, setCategoria] = useState('todas')
  const [ordenacao, setOrdenacao] = useState('recomendados')
  const [somenteAbertos, setSomenteAbertos] = useState(false)
  const [somentePromocoes, setSomentePromocoes] = useState(false)
  const [freteGratis, setFreteGratis] = useState(false)
  const [avaliacaoMin, setAvaliacaoMin] = useState(0)
  const [tempoMax, setTempoMax] = useState(0)
  const [distanciaMax, setDistanciaMax] = useState(0)
  const [pagamento, setPagamento] = useState('')
  const [filtrosMobileAbertos, setFiltrosMobileAbertos] = useState(() => abrirFiltrosInicial)
  const [paginaAtual, setPaginaAtual] = useState(1)

  const ehMercado = tipo === 'mercado'
  const tituloBase = tipo === 'todos' ? 'Explorar lojas' : ehMercado ? 'Mercados e conveniência' : 'Restaurantes'
  const titulo = termoInicial ? `${tituloBase}: ${termoInicial}` : tituloBase
  const descricao = tipo === 'todos'
    ? 'Encontre lojas, restaurantes e produtos com filtros completos.'
    : ehMercado
    ? 'Compras do dia a dia, bebidas e itens essenciais perto de você.'
    : 'Descubra cozinhas, ofertas e entregas que combinam com seu momento.'

  useEffect(() => {
    const atualizar = () => setVersaoLocalizacao(versao => versao + 1)
    window.addEventListener('localizacao-atualizada', atualizar)
    return () => window.removeEventListener('localizacao-atualizada', atualizar)
  }, [])

  useEffect(() => {
    let ativo = true
    garantirLocalizacaoCepSalvo().then((coordenadas) => {
      if (ativo && coordenadas) setVersaoLocalizacao(versao => versao + 1)
    })
    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    setCarregando(true)
    setErro('')
    api.restaurantes.listar(paramsComLocalizacao({
      limite: 1000,
      ...(termoInicial ? { categoria: termoInicial } : {}),
    }))
      .then(dados => {
        const normalizadas = (Array.isArray(dados) ? dados : [])
          .map(normalizarLoja)
          .filter(loja => pertenceAoCatalogo(loja, tipo))
        setLojas(normalizadas)
      })
      .catch(error => {
        console.error(error)
        setErro(error.message?.includes('Backend offline') ? 'backend_offline' : 'erro_generico')
      })
      .finally(() => setCarregando(false))
  }, [tipo, termoInicial, versaoLocalizacao, tentativa])

  useEffect(() => {
    if (!filtrosMobileAbertos) return undefined
    const fecharComEsc = event => {
      if (event.key === 'Escape') setFiltrosMobileAbertos(false)
    }
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', fecharComEsc)
    return () => {
      document.body.style.overflow = overflowAnterior
      window.removeEventListener('keydown', fecharComEsc)
    }
  }, [filtrosMobileAbertos])

  const categorias = useMemo(() => {
    const contagem = new Map()
    lojas.forEach(loja => {
      const chave = loja.categoriaNormalizada
      if (!chave) return
      const atual = contagem.get(chave) || { valor: chave, nome: loja.categoria, total: 0 }
      atual.total += 1
      contagem.set(chave, atual)
    })
    return Array.from(contagem.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [lojas])

  const temDistancias = useMemo(() => lojas.some(loja => loja.distanciaKm != null), [lojas])

  const lojasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca)
    return lojas
      .filter(loja => {
        if (termo) {
          const conteudo = normalizarTexto(`${loja.nome} ${loja.categoria} ${loja.descricao}`)
          if (!conteudo.includes(termo)) return false
        }
        if (categoria !== 'todas' && loja.categoriaNormalizada !== categoria) return false
        if (somenteAbertos && !loja.abertaAgora) return false
        if (somentePromocoes && !loja.promo) return false
        if (freteGratis && !loja.gratis) return false
        if (avaliacaoMin && loja.avaliacao < avaliacaoMin) return false
        if (tempoMax && loja.tempoMin > tempoMax) return false
        if (distanciaMax && (loja.distanciaKm == null || loja.distanciaKm > distanciaMax)) return false
        if (pagamento && !loja.pagamentos.some(item => normalizarTexto(item) === pagamento)) return false
        return true
      })
      .sort((a, b) => {
        if (ordenacao === 'avaliacao') return b.avaliacao - a.avaliacao
        if (ordenacao === 'tempo') return a.tempoMin - b.tempoMin
        if (ordenacao === 'distancia') {
          return (a.distanciaKm ?? Number.POSITIVE_INFINITY) - (b.distanciaKm ?? Number.POSITIVE_INFINITY)
        }
        if (ordenacao === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR')

        const pontos = loja =>
          (loja.abertaAgora ? 3 : 0) +
          (loja.promo ? 2 : 0) +
          loja.avaliacao +
          Math.max(0, 2 - loja.tempoMin / 30)
        return pontos(b) - pontos(a)
      })
  }, [
    lojas,
    busca,
    categoria,
    somenteAbertos,
    somentePromocoes,
    freteGratis,
    avaliacaoMin,
    tempoMax,
    distanciaMax,
    pagamento,
    ordenacao,
  ])

  useEffect(() => {
    setPaginaAtual(1)
  }, [busca, categoria, somenteAbertos, somentePromocoes, freteGratis, avaliacaoMin, tempoMax, distanciaMax, pagamento, ordenacao, tipo])

  const totalPaginas = Math.max(1, Math.ceil(lojasFiltradas.length / ITENS_POR_PAGINA))
  const paginaSegura = Math.min(paginaAtual, totalPaginas)
  const inicioPagina = (paginaSegura - 1) * ITENS_POR_PAGINA
  const lojasPagina = lojasFiltradas.slice(inicioPagina, inicioPagina + ITENS_POR_PAGINA)
  const paginasVisiveis = Array.from({ length: totalPaginas }, (_, index) => index + 1)
    .filter(pagina => (
      pagina === 1 ||
      pagina === totalPaginas ||
      Math.abs(pagina - paginaSegura) <= 1
    ))

  const quantidadeFiltros = [
    categoria !== 'todas',
    somenteAbertos,
    somentePromocoes,
    freteGratis,
    avaliacaoMin > 0,
    tempoMax > 0,
    distanciaMax > 0,
    Boolean(pagamento),
  ].filter(Boolean).length

  const limparFiltros = () => {
    setCategoria('todas')
    setSomenteAbertos(false)
    setSomentePromocoes(false)
    setFreteGratis(false)
    setAvaliacaoMin(0)
    setTempoMax(0)
    setDistanciaMax(0)
    setPagamento('')
  }

  const propriedadesPainel = {
    categorias,
    categoria,
    setCategoria,
    avaliacaoMin,
    setAvaliacaoMin,
    tempoMax,
    setTempoMax,
    distanciaMax,
    setDistanciaMax,
    pagamento,
    setPagamento,
    temDistancias,
    limparFiltros,
  }

  return (
    <>
      <section className="border-b border-border pb-6">
        <Motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5"
        >
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
              <Store size={21} />
            </span>
            <h1 className="font-display text-2xl font-extrabold text-text-primary sm:text-3xl">{titulo}</h1>
          </div>
          <p className="max-w-2xl text-sm font-medium text-text-secondary sm:text-base">{descricao}</p>
        </Motion.div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="flex h-12 items-center gap-3 rounded-lg border border-border bg-white px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
            <Search size={18} className="flex-shrink-0 text-text-muted" />
            <input
              type="search"
              value={busca}
              onChange={event => setBusca(event.target.value)}
              placeholder={ehMercado ? 'Buscar mercado ou categoria' : 'Buscar restaurante ou cozinha'}
              className="min-w-0 flex-1 border-none bg-transparent text-sm font-semibold text-text-primary outline-none placeholder:font-normal placeholder:text-text-muted"
            />
            {busca && (
              <button type="button" onClick={() => setBusca('')} title="Limpar busca" className="text-text-muted hover:text-text-primary">
                <X size={16} />
              </button>
            )}
          </label>

          <select
            value={ordenacao}
            onChange={event => setOrdenacao(event.target.value)}
            className="h-12 rounded-lg border border-border bg-white px-3 text-sm font-bold text-text-secondary outline-none focus:border-primary"
            aria-label="Ordenar resultados"
          >
            {opcoesOrdenacao.map(opcao => (
              <option key={opcao.value} value={opcao.value}>{opcao.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setFiltrosMobileAbertos(true)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-extrabold text-text-primary hover:border-primary hover:text-primary lg:hidden"
          >
            <SlidersHorizontal size={17} />
            Filtros
            {quantidadeFiltros > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] text-white">
                {quantidadeFiltros}
              </span>
            )}
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <BotaoFiltro ativo={somenteAbertos} onClick={() => setSomenteAbertos(valor => !valor)} icon={Clock3}>
            Abertos agora
          </BotaoFiltro>
          <BotaoFiltro ativo={somentePromocoes} onClick={() => setSomentePromocoes(valor => !valor)} icon={Tag}>
            Com promoção
          </BotaoFiltro>
          <BotaoFiltro ativo={freteGratis} onClick={() => setFreteGratis(valor => !valor)} icon={Truck}>
            Frete grátis
          </BotaoFiltro>
          <BotaoFiltro ativo={tempoMax === 30} onClick={() => setTempoMax(valor => valor === 30 ? 0 : 30)} icon={Clock3}>
            Até 30 min
          </BotaoFiltro>
          <BotaoFiltro ativo={avaliacaoMin === 4.5} onClick={() => setAvaliacaoMin(valor => valor === 4.5 ? 0 : 4.5)} icon={Star}>
            Nota 4,5+
          </BotaoFiltro>
          {temDistancias && (
            <BotaoFiltro ativo={distanciaMax === 5} onClick={() => setDistanciaMax(valor => valor === 5 ? 0 : 5)} icon={MapPin}>
              Até 5 km
            </BotaoFiltro>
          )}
        </div>
      </section>

      <div className="grid gap-7 pt-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border pr-5 lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2 pb-5">
            <PainelFiltros {...propriedadesPainel} />
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex min-h-9 flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-text-secondary">
              <strong className="text-text-primary">{lojasFiltradas.length}</strong>{' '}
              {lojasFiltradas.length === 1 ? 'resultado' : 'resultados'}
              {lojasFiltradas.length > ITENS_POR_PAGINA && (
                <span className="ml-1 text-text-muted">
                  · exibindo {inicioPagina + 1}-{Math.min(inicioPagina + ITENS_POR_PAGINA, lojasFiltradas.length)}
                </span>
              )}
            </p>
            {quantidadeFiltros > 0 && (
              <button
                type="button"
                onClick={limparFiltros}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <X size={13} />
                Remover {quantidadeFiltros === 1 ? 'filtro' : 'filtros'}
              </button>
            )}
          </div>

          {carregando ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-xl border border-border bg-surface-2" />
              ))}
            </div>
          ) : erro ? (
            <div className="border-y border-border py-16 text-center">
              <p className="font-display text-lg font-bold text-text-primary">
                {erro === 'backend_offline' ? 'Não foi possível conectar ao serviço' : 'Não foi possível carregar as lojas'}
              </p>
              <p className="mt-2 text-sm text-text-muted">Tente novamente em alguns instantes.</p>
              <button
                type="button"
                onClick={() => setTentativa(valor => valor + 1)}
                className="mt-5 h-10 rounded-lg bg-primary px-5 text-sm font-bold text-white border-none"
              >
                Tentar novamente
              </button>
            </div>
          ) : lojasFiltradas.length === 0 ? (
            <div className="border-y border-border py-16 text-center">
              <Search size={32} className="mx-auto mb-3 text-text-muted" />
              <p className="font-display text-lg font-bold text-text-primary">Nenhuma loja combina com os filtros</p>
              <p className="mt-2 text-sm text-text-muted">Remova alguns critérios para ampliar os resultados.</p>
              <button
                type="button"
                onClick={limparFiltros}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white"
              >
                <RotateCcw size={15} />
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {lojasPagina.map((loja, index) => (
                  <StoreCard key={loja.id} loja={loja} index={index} />
                ))}
              </div>

              {totalPaginas > 1 && (
                <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Paginação de lojas">
                  <button
                    type="button"
                    onClick={() => setPaginaAtual(pagina => Math.max(1, pagina - 1))}
                    disabled={paginaSegura === 1}
                    className="h-10 rounded-lg border border-border bg-white px-4 text-sm font-extrabold text-text-primary transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Anterior
                  </button>

                  {paginasVisiveis.map((pagina, index) => {
                    const anterior = paginasVisiveis[index - 1]
                    const temIntervalo = anterior && pagina - anterior > 1
                    return (
                      <span key={pagina} className="inline-flex items-center gap-2">
                        {temIntervalo && <span className="text-sm font-bold text-text-muted">...</span>}
                        <button
                          type="button"
                          onClick={() => setPaginaAtual(pagina)}
                          className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-extrabold transition-colors ${
                            pagina === paginaSegura
                              ? 'border-primary bg-primary text-white'
                              : 'border-border bg-white text-text-primary hover:border-primary hover:text-primary'
                          }`}
                          aria-current={pagina === paginaSegura ? 'page' : undefined}
                        >
                          {pagina}
                        </button>
                      </span>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => setPaginaAtual(pagina => Math.min(totalPaginas, pagina + 1))}
                    disabled={paginaSegura === totalPaginas}
                    className="h-10 rounded-lg border border-border bg-white px-4 text-sm font-extrabold text-text-primary transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Próxima
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>

      <AnimatePresence>
        {filtrosMobileAbertos && (
          <>
            <Motion.button
              type="button"
              aria-label="Fechar filtros"
              className="fixed inset-0 z-[119] bg-black/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFiltrosMobileAbertos(false)}
            />
            <Motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Filtros avançados"
              className="fixed inset-x-0 bottom-0 z-[120] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-xl bg-white shadow-2xl lg:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              <div className="px-5 pt-4">
                <div className="-mt-1 mb-3 flex justify-center lg:hidden">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>
              <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="font-display text-lg font-extrabold text-text-primary">Filtros avançados</p>
                  <p className="text-xs font-semibold text-text-muted">{lojasFiltradas.length} resultados agora</p>
                </div>
                <button
                  type="button"
                  title="Fechar"
                  onClick={() => setFiltrosMobileAbertos(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary"
                >
                  <X size={18} />
                </button>
              </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 overscroll-contain">
                <PainelFiltros {...propriedadesPainel} />
              </div>
              <div className="border-t border-border bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
                <button
                  type="button"
                  onClick={() => setFiltrosMobileAbertos(false)}
                  className="h-12 w-full rounded-lg bg-primary text-sm font-extrabold text-white"
                >
                  Ver {lojasFiltradas.length} {lojasFiltradas.length === 1 ? 'resultado' : 'resultados'}
                </button>
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
