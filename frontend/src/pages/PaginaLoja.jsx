import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion as Motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
import { Star, Clock, Truck, Search, ArrowLeft, Plus, Minus, X, ShoppingBag, Users, MapPin, CreditCard, Calendar, ChevronDown, CheckCircle, Flag, Send } from 'lucide-react'
import MobileNavBar from '../components/MobileNavBar'
import CartDrawer from '../components/GavetaCarrinho'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { imagemRestaurante, imagemProduto, emojiRestaurante, emojiProduto } from '../utils/imagens'

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function lerLista(valor, padrao = []) {
  if (Array.isArray(valor)) return valor
  if (!valor) return padrao
  try {
    const lista = JSON.parse(valor)
    return Array.isArray(lista) ? lista : padrao
  } catch {
    return String(valor).split(',').map(item => item.trim()).filter(Boolean)
  }
}

function lojaEstaAberta(loja) {
  if (['fechado', 'inativo'].includes(String(loja?.status || '').toLowerCase())) return false
  if (!loja?.horario_abertura || !loja?.horario_fechamento) return true

  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const valorParte = tipo => partes.find(parte => parte.type === tipo)?.value || ''
  const diaAtual = normalizarTexto(valorParte('weekday'))
  const diasAbertos = lerLista(loja.dias_aberto).map(normalizarTexto)
  if (diasAbertos.length && !diasAbertos.some(dia => dia.startsWith(diaAtual) || diaAtual.startsWith(dia))) return false

  const paraMinutos = horario => {
    const [hora, minuto] = String(horario).split(':').map(Number)
    return hora * 60 + minuto
  }
  const minutosAgora = Number(valorParte('hour')) * 60 + Number(valorParte('minute'))
  const abertura = paraMinutos(loja.horario_abertura)
  const fechamento = paraMinutos(loja.horario_fechamento)
  if (![minutosAgora, abertura, fechamento].every(Number.isFinite)) return true
  if (fechamento < abertura) return minutosAgora >= abertura || minutosAgora <= fechamento
  return minutosAgora >= abertura && minutosAgora <= fechamento
}

function criarComplementosPadrao(item) {
  const texto = normalizarTexto(`${item.nome} ${item.categoria} ${item.descricao}`)
  const mercado = ['mercado', 'conveniencia', 'bebida', 'bebidas'].some(termo => texto.includes(termo))
  const oriental = ['sushi', 'temaki', 'yakisoba', 'japonesa', 'japones', 'hot'].some(termo => texto.includes(termo))
  const lanche = ['burger', 'hamburguer', 'x-', 'sanduiche', 'batata'].some(termo => texto.includes(termo))
  const pizza = texto.includes('pizza')

  if (mercado) {
    return [
      {
        titulo: 'Adicionar ao carrinho',
        max: 4,
        obrigatorio: false,
        opcoes: [
          { id: 'sacola-reforcada', nome: 'Sacola reforçada', preco: 0.5 },
          { id: 'bebida-gelada', nome: 'Separar bebida gelada', preco: 0 },
          { id: 'embalagem-presente', nome: 'Embalagem para presente', preco: 3 },
          { id: 'item-extra', nome: 'Adicionar mais uma unidade', preco: Number(item.preco) || 0 },
        ],
      },
    ]
  }

  const complementos = oriental
    ? [
        { id: 'wasabi', nome: 'Wasabi', preco: 2 },
        { id: 'gengibre', nome: 'Gengibre', preco: 2 },
        { id: 'shoyu-extra', nome: 'Shoyu extra', preco: 1.5 },
        { id: 'tare', nome: 'Molho tarê', preco: 2.5 },
        { id: 'cream-cheese-extra', nome: 'Cream cheese extra', preco: 4 },
        { id: 'hashi-extra', nome: 'Hashi extra', preco: 0.5 },
      ]
    : lanche
      ? [
          { id: 'queijo-extra', nome: 'Queijo extra', preco: 4 },
          { id: 'bacon-extra', nome: 'Bacon extra', preco: 5 },
          { id: 'molho-casa', nome: 'Molho da casa', preco: 2 },
          { id: 'batata-pequena', nome: 'Batata pequena', preco: 8 },
          { id: 'maionese-extra', nome: 'Maionese extra', preco: 2 },
          { id: 'cebola-crispy', nome: 'Cebola crispy', preco: 3 },
        ]
      : pizza
        ? [
            { id: 'borda-catupiry', nome: 'Borda de catupiry', preco: 8 },
            { id: 'queijo-extra', nome: 'Queijo extra', preco: 6 },
            { id: 'molho-tomate', nome: 'Molho de tomate extra', preco: 2 },
            { id: 'azeitona-extra', nome: 'Azeitona extra', preco: 2.5 },
            { id: 'oregano-extra', nome: 'Orégano extra', preco: 0 },
            { id: 'embalagem-reforcada', nome: 'Embalagem reforçada', preco: 2 },
          ]
        : [
            { id: 'porcao-arroz', nome: 'Porção de arroz', preco: 6 },
            { id: 'porcao-feijao', nome: 'Porção de feijão', preco: 6 },
            { id: 'salada-extra', nome: 'Salada extra', preco: 5 },
            { id: 'molho-extra', nome: 'Molho extra', preco: 2 },
            { id: 'batata-extra', nome: 'Batata extra', preco: 7 },
            { id: 'embalagem-reforcada', nome: 'Embalagem reforçada', preco: 2 },
          ]

  return [
    {
      titulo: 'Adicione complementos',
      max: 6,
      obrigatorio: false,
      opcoes: complementos,
    },
    {
      titulo: 'Bebidas',
      max: 2,
      obrigatorio: false,
      opcoes: [
        { id: 'coca-lata', nome: 'Coca-Cola lata', preco: 6 },
        { id: 'guarana-lata', nome: 'Guaraná lata', preco: 6 },
        { id: 'agua-mineral', nome: 'Água mineral', preco: 4 },
        { id: 'suco-natural', nome: 'Suco natural', preco: 8 },
      ],
    },
  ]
}

function normalizarOpcionais(item) {
  const bruto = item.opcionais || item.complementos
  if (Array.isArray(bruto) && bruto.length) return bruto
  if (bruto) {
    try {
      const lista = JSON.parse(bruto)
      if (Array.isArray(lista) && lista.length) return lista
    } catch {
      return criarComplementosPadrao(item)
    }
  }
  return criarComplementosPadrao(item)
}

function detalhesSelecionados(produto, selecionados) {
  return (produto.opcionais || []).flatMap(op => {
    const ids = selecionados[op.titulo] || []
    return ids.map(id => {
      const opcao = op.opcoes.find(o => o.id === id)
      if (!opcao) return null
      return {
        grupo: op.titulo,
        id: opcao.id,
        nome: opcao.nome,
        preco: Number(opcao.preco || 0),
      }
    }).filter(Boolean)
  })
}


// ─── Modal produto ────────────────────────────────────────────────────────────
function ProdutoModal({ produto, loja, onClose, onItemAdded }) {
  const [quantidade, setQuantidade] = useState(1)
  const [selecionados, setSelecionados] = useState({})
  const [comentario, setComentario] = useState('')
  const [denunciaRegistrada, setDenunciaRegistrada] = useState(false)
  const [denunciaAberta, setDenunciaAberta] = useState(false)
  const [motivoDenuncia, setMotivoDenuncia] = useState('')
  const [detalheDenuncia, setDetalheDenuncia] = useState('')
  const [denunciaEnviando, setDenunciaEnviando] = useState(false)
  const [denunciaErro, setDenunciaErro] = useState('')
  const imagemRef = useRef(null)
  const { adicionarItem } = useCart()
  const { estaLogado } = useAuth()

  const MAX_COMENTARIO = 140
  const motivosDenuncia = [
    'Foto ou descrição enganosa',
    'Preço incorreto',
    'Produto impróprio',
    'Item duplicado',
    'Outro problema',
  ]

  const handleOpcao = (tituloOpcional, opcaoId, max) => {
    setSelecionados(prev => {
      const atual = prev[tituloOpcional] || []
      if (max === 1) return { ...prev, [tituloOpcional]: [opcaoId] }
      if (atual.includes(opcaoId)) return { ...prev, [tituloOpcional]: atual.filter(id => id !== opcaoId) }
      if (atual.length >= max) return prev
      return { ...prev, [tituloOpcional]: [...atual, opcaoId] }
    })
  }

  const opcionaisValidos = produto.opcionais?.every(op => {
    if (!op.obrigatorio) return true
    return (selecionados[op.titulo] || []).length > 0
  }) ?? true

  const extraTotal = produto.opcionais?.reduce((acc, op) => {
    const ids = selecionados[op.titulo] || []
    return acc + ids.reduce((s, id) => {
      const opc = op.opcoes.find(o => o.id === id)
      return s + Number(opc?.preco || 0)
    }, 0)
  }, 0) || 0

  const precoFinal = (produto.preco + extraTotal) * quantidade
  const complementosSelecionados = detalhesSelecionados(produto, selecionados)

  const lojaFechada = loja?.fechado || loja?.status === 'fechado' || loja?.status === 'inativo'

  const handleAdicionar = () => {
    if (lojaFechada) {
      alert('Esta loja está fechada no momento.')
      return
    }
    const item = {
      id: `${produto.id}-${JSON.stringify(selecionados)}-${comentario.trim()}`,
      cardapioId: produto.id,
      produtoId: produto.id,
      name: produto.nome,
      price: produto.preco + extraTotal,
      emoji: produto.emoji,
      quantidade,
      comentario,
      complementos: complementosSelecionados,
      restauranteId: produto.restauranteId,
      imagem: produto.imagem,
    }
    const adicionado = adicionarItem(item)
    if (!adicionado) return
    onItemAdded?.({
      produto,
      quantidade,
      origem: imagemRef.current?.getBoundingClientRect(),
    })
    onClose()
  }

  const handleEnviarDenuncia = async () => {
    if (!motivoDenuncia || denunciaEnviando) return
    if (!estaLogado) {
      setDenunciaErro('Entre na sua conta para denunciar este item.')
      return
    }

    setDenunciaEnviando(true)
    setDenunciaErro('')
    try {
      await api.denuncias.produtos.criar({
        produtoId: produto.id,
        restauranteId: produto.restauranteId,
        produtoNome: produto.nome,
        motivo: motivoDenuncia,
        detalhe: detalheDenuncia,
      })
      setDenunciaRegistrada(true)
      setDenunciaAberta(false)
    } catch (error) {
      setDenunciaErro(error.message || 'Não foi possível enviar a denúncia agora.')
    } finally {
      setDenunciaEnviando(false)
    }
  }

  return (
    <Motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <Motion.div
        className="bg-white w-full sm:max-w-6xl sm:rounded-lg rounded-t-3xl overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90vh]"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Alça mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Layout desktop: lado a lado | mobile: empilhado */}
        <div className="flex flex-col md:flex-row overflow-hidden flex-1 min-h-0">

          {/* Imagem — desktop fica na esquerda */}
          <div ref={imagemRef} className="relative md:w-[52%] h-52 md:h-auto md:min-h-[32rem] bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center text-8xl shrink-0 overflow-hidden md:m-6 md:rounded-sm">
            {produto.imagem ? <img src={produto.imagem} alt={produto.nome} className="absolute inset-0 w-full h-full object-cover" /> : produto.emoji}
            <button onClick={onClose}
              className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full border border-border flex items-center justify-center cursor-pointer hover:bg-surface-2 transition-all shadow-sm">
              <X size={16} className="text-text-secondary" />
            </button>
          </div>

          {/* Conteúdo scrollável */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-5 md:px-6">
                {/* Nome e info básica */}
                <p className="text-xs font-extrabold text-text-primary uppercase tracking-wide mb-3">{produto.nome}</p>
                <h2 className="font-display text-xl font-extrabold text-text-primary mb-1 leading-tight md:hidden">{produto.nome}</h2>

                {produto.serve && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted mb-2">
                    <Users size={12} /> Serve {produto.serve} {produto.serve === 1 ? 'pessoa' : 'pessoas'}
                  </div>
                )}
                <p className="text-sm text-text-secondary font-medium leading-relaxed mb-3">{produto.desc}</p>

                {/* Preço */}
                <div className="flex items-center gap-2 mb-4">
                  {produto.promocaoLabel && (
                    <span className="rounded-md bg-primary text-white px-2 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-wide">
                      {produto.promocaoLabel}
                    </span>
                  )}
                  <span className="font-display text-2xl font-extrabold text-accent">
                    R$ {produto.preco.toFixed(2).replace('.', ',')}
                  </span>
                  {produto.precoAnterior && (
                    <span className="text-sm text-text-muted line-through font-semibold">
                      R$ {produto.precoAnterior.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>

                {/* Info da loja */}
                <div className="flex items-center justify-between p-3 bg-white rounded-md mb-3 border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{loja.emoji}</span>
                    <span className="text-sm font-bold text-text-primary">{loja.nome}</span>
                    {loja.superRestaurante && (
                      <span className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <Star size={9} fill="white" stroke="white" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-yellow-500">
                    <Star size={12} fill="#FFBA08" stroke="#FFBA08" />
                    {loja.avaliacao}
                  </div>
                </div>
                <div className="text-xs text-text-muted font-semibold mb-5 flex gap-3">
                  <span className="flex items-center gap-1"><Clock size={11} className="text-accent" />{loja.tempoEntrega}</span>
                  <span>·</span>
                  <span>{loja.taxaEntrega === 'Grátis' ? <span className="text-accent font-bold">Entrega Grátis</span> : loja.taxaEntrega}</span>
                </div>

                {/* Opcionais */}
                {produto.opcionais?.map(op => (
                  <div key={op.titulo} className="mb-5">
                    <div className="flex items-center justify-between -mx-5 md:-mx-6 bg-surface-2 px-5 md:px-6 py-3 mb-3 border-y border-border">
                      <div>
                        <p className="font-display font-bold text-base text-text-primary">{op.titulo}</p>
                        <p className="text-xs text-text-muted font-semibold">Escolha {op.max === 1 ? '1 opção' : `até ${op.max} opções`}.</p>
                      </div>
                      {op.obrigatorio && (
                        <span className="text-xs font-extrabold bg-secondary text-white px-2 py-0.5 rounded-md tracking-wide">OBRIGATÓRIO</span>
                      )}
                    </div>
                    <div className="flex flex-col divide-y divide-border">
                      {op.opcoes.map(opcao => {
                        const selecionado = (selecionados[op.titulo] || []).includes(opcao.id)
                        return (
                          <button key={opcao.id}
                            onClick={() => handleOpcao(op.titulo, opcao.id, op.max)}
                            className={`flex items-center justify-between gap-4 px-0 py-4 transition-all cursor-pointer text-left w-full bg-white ${
                              selecionado ? 'text-primary' : 'text-text-primary hover:text-primary'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-text-primary">{opcao.nome}</p>
                              {opcao.preco > 0 && (
                                <p className="mt-0.5 text-sm font-bold text-text-secondary">
                                  + R$ {Number(opcao.preco).toFixed(2).replace('.', ',')}
                                </p>
                              )}
                            </div>
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                              selecionado ? 'border-primary bg-primary text-white' : 'border-transparent bg-white text-primary'
                            }`}>
                              {selecionado ? (
                                <CheckCircle size={17} />
                              ) : (
                                <Plus size={17} />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Comentário */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-display font-bold text-sm text-text-primary">Algum comentário?</label>
                    <span className="text-xs text-text-muted font-semibold">{comentario.length} / {MAX_COMENTARIO}</span>
                  </div>
                  <textarea
                    value={comentario}
                    onChange={e => setComentario(e.target.value.slice(0, MAX_COMENTARIO))}
                    placeholder="Ex: tirar a cebola, maionese à parte etc."
                    rows={3}
                    className="w-full px-4 py-3 border border-border rounded-xl text-sm font-medium text-text-primary bg-surface-2 outline-none resize-none transition-all focus:border-primary focus:bg-white placeholder:text-text-muted"
                  />
                </div>

                <div className="mt-3 rounded-2xl border border-border bg-surface-2 p-3">
                  {!denunciaAberta && !denunciaRegistrada && (
                    <button
                      type="button"
                      onClick={() => setDenunciaAberta(true)}
                      className="flex w-full items-center justify-between gap-3 text-left bg-transparent border-none cursor-pointer"
                    >
                      <span className="flex items-center gap-2 text-sm font-extrabold text-text-primary">
                        <Flag size={15} className="text-primary" />
                        Denunciar este item
                      </span>
                      <span className="text-xs font-bold text-text-muted">Produto errado?</span>
                    </button>
                  )}

                  {denunciaAberta && !denunciaRegistrada && (
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-extrabold text-text-primary">Qual o problema?</p>
                          <p className="text-xs font-semibold text-text-muted">Produto: <span className="text-text-primary">{produto.nome}</span></p>
                        </div>
                        <button type="button" onClick={() => setDenunciaAberta(false)}
                          className="w-8 h-8 rounded-full border border-border bg-white flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        {motivosDenuncia.map((motivo) => (
                          <button
                            key={motivo}
                            type="button"
                            onClick={() => setMotivoDenuncia(motivo)}
                            className={`rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${
                              motivoDenuncia === motivo
                                ? 'border-primary bg-primary-light text-primary'
                                : 'border-border bg-white text-text-secondary hover:border-primary hover:text-primary'
                            }`}
                          >
                            {motivo}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={detalheDenuncia}
                        onChange={(e) => setDetalheDenuncia(e.target.value.slice(0, 180))}
                        placeholder="Conte rapidamente o que aconteceu"
                        rows={3}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-text-primary outline-none resize-none focus:border-primary placeholder:text-text-muted"
                      />
                      {denunciaErro && (
                        <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                          {denunciaErro}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-text-muted">{detalheDenuncia.length}/180</span>
                        <button
                          type="button"
                          disabled={!motivoDenuncia || denunciaEnviando}
                          onClick={handleEnviarDenuncia}
                          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-white border-none disabled:bg-border disabled:text-text-muted disabled:cursor-not-allowed"
                        >
                          <Send size={13} /> {denunciaEnviando ? 'Enviando...' : 'Enviar denúncia'}
                        </button>
                      </div>
                    </div>
                  )}

                  {denunciaRegistrada && (
                    <div className="rounded-xl border border-accent/20 bg-accent/10 px-3 py-3">
                      <p className="text-xs font-extrabold uppercase tracking-wide text-accent mb-1">Denúncia registrada</p>
                      <p className="text-sm font-bold text-text-primary">{produto.nome}</p>
                      <p className="text-xs font-semibold text-text-muted mt-1">
                        Motivo: {motivoDenuncia}. O restaurante recebeu isso no painel dele.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer fixo */}
            <div className="px-5 py-4 border-t border-border bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-3 py-2.5">
                  <Motion.button onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-full bg-white border border-border flex items-center justify-center cursor-pointer text-text-secondary hover:border-primary hover:text-primary transition-all"
                    whileTap={{ scale: 0.85 }}><Minus size={14} /></Motion.button>
                  <span className="font-display text-lg font-extrabold text-text-primary w-5 text-center">{quantidade}</span>
                  <Motion.button onClick={() => setQuantidade(q => q + 1)}
                    className="w-7 h-7 rounded-full bg-primary border-none flex items-center justify-center cursor-pointer text-white hover:bg-primary-dark transition-all"
                    whileTap={{ scale: 0.85 }}><Plus size={14} /></Motion.button>
                </div>

                <Motion.button onClick={handleAdicionar} disabled={!opcionaisValidos || lojaFechada}
                  className="flex-1 py-3.5 bg-primary text-white border-none rounded-xl font-display font-bold text-base cursor-pointer flex items-center justify-center gap-2 disabled:bg-border disabled:text-text-muted disabled:cursor-not-allowed"
                  whileHover={opcionaisValidos && !lojaFechada ? { scale: 1.02 } : {}}
                  whileTap={opcionaisValidos && !lojaFechada ? { scale: 0.97 } : {}}
                >
                  {lojaFechada ? 'Loja fechada' : `Adicionar · R$ ${precoFinal.toFixed(2).replace('.', ',')}`}
                </Motion.button>
              </div>
            </div>
          </div>
        </div>
      </Motion.div>
    </Motion.div>
  )
}

// ─── Card produto ─────────────────────────────────────────────────────────────
function ProdutoCard({ produto, onAbrir, index }) {
  return (
    <Motion.div
      className="flex items-stretch gap-4 rounded-2xl border border-transparent px-3 py-3 cursor-pointer group transition-all hover:border-border hover:bg-white hover:shadow-sm"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: 'easeOut' }}
      onClick={() => onAbrir(produto)}
    >
      <div className="flex-1 min-w-0 py-1">
        <h4 className="font-display font-extrabold text-base text-text-primary mb-1 group-hover:text-primary transition-colors leading-snug">{produto.nome}</h4>
        {produto.serve && (
          <div className="flex items-center gap-1 text-xs text-text-muted font-semibold mb-1.5">
            <Users size={11} /> Serve {produto.serve} pessoas
          </div>
        )}
        {produto.desc && (
          <p className="text-sm text-text-secondary font-medium leading-relaxed line-clamp-2 mb-3">{produto.desc}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {produto.promocaoLabel && (
            <span className="rounded-md bg-primary text-white px-2 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-wide">
              {produto.promocaoLabel}
            </span>
          )}
          <span className="font-display text-base font-extrabold text-accent">R$ {produto.preco.toFixed(2).replace('.', ',')}</span>
          {produto.precoAnterior && (
            <span className="text-xs text-text-muted line-through font-semibold">R$ {produto.precoAnterior.toFixed(2).replace('.', ',')}</span>
          )}
        </div>
      </div>
      <Motion.div
        className="w-32 h-32 sm:w-40 sm:h-32 rounded-2xl flex items-center justify-center text-5xl shrink-0 bg-gradient-to-br from-orange-50 to-orange-100 relative overflow-hidden border border-border/60"
        whileHover={{ scale: 1.03 }}
      >
        {produto.imagem ? <img src={produto.imagem} alt={produto.nome} className="absolute inset-0 w-full h-full object-cover" loading="lazy" /> : produto.emoji}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-2 right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all shadow-lg">
          <Plus size={16} className="text-white" />
        </div>
      </Motion.div>
    </Motion.div>
  )
}

// ─── Sidebar info da loja ─────────────────────────────────────────────────────
function SidebarInfo({ loja }) {
  const [aba, setAba] = useState('sobre')

  return (
    <div className="bg-white rounded-2xl border border-border overflow-hidden">
      <div className="flex border-b border-border">
        {['sobre', 'horário', 'pagamento'].map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={`flex-1 py-3.5 text-sm font-bold capitalize transition-all cursor-pointer border-b-2 bg-transparent ${
              aba === a ? 'text-primary border-primary' : 'text-text-muted border-transparent hover:text-text-primary'
            }`}
          >{a.charAt(0).toUpperCase() + a.slice(1)}</button>
        ))}
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">
          {aba === 'sobre' && (
            <Motion.div key="sobre" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-sm text-text-secondary font-medium leading-relaxed mb-4">{loja.sobre}</p>
              {loja.superRestaurante && (
                <div className="bg-surface-2 rounded-xl p-4 mb-4 border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center shrink-0">
                      <Star size={16} fill="white" stroke="white" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm text-text-primary">Super-Restaurante</p>
                      <p className="text-xs text-text-muted font-medium">Selo pelo alto nível de qualidade</p>
                    </div>
                  </div>
                  {['Um dos mais pedidos da região', 'Entrega no tempo prometido', 'Muitas avaliações 5 estrelas'].map(item => (
                    <div key={item} className="flex items-center gap-2 mb-1.5 last:mb-0">
                      <CheckCircle size={14} className="text-accent shrink-0" />
                      <span className="text-xs font-semibold text-text-secondary">{item}</span>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p className="font-display font-bold text-sm text-text-primary mb-2">Endereço</p>
                <p className="text-sm text-text-secondary font-medium leading-relaxed">{loja.endereco}</p>
              </div>
            </Motion.div>
          )}

          {aba === 'horário' && (
            <Motion.div key="horario" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="font-display font-bold text-sm text-text-primary mb-3">Funcionamento</p>
              <div className="flex flex-col gap-3">
                {loja.horarios.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-none">
                    <span className="text-sm font-semibold text-text-secondary">{h.dia}</span>
                    <span className="text-sm font-bold text-text-primary">{h.horario}</span>
                  </div>
                ))}
              </div>
            </Motion.div>
          )}

          {aba === 'pagamento' && (
            <Motion.div key="pagamento" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="font-display font-bold text-sm text-text-primary mb-3">Formas aceitas</p>
              <div className="flex flex-wrap gap-2">
                {loja.pagamentos.map(p => (
                  <div key={p} className="flex items-center gap-1.5 bg-surface-2 border border-border px-3 py-2 rounded-xl">
                    <CreditCard size={13} className="text-accent" />
                    <span className="text-xs font-bold text-text-primary">{p}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-surface-2 border border-border rounded-xl">
                <p className="text-xs font-semibold text-text-muted">
                  Pedido mínimo: <span className="font-bold text-text-primary">{loja.pedidoMinimo}</span>
                </p>
              </div>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function StorePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [produtoAberto, setProdutoAberto] = useState(null)
  const [categoriaAtiva, setCategoriaAtiva] = useState(null)
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const [tipoEntrega, setTipoEntrega] = useState('Entrega')
  const [navOculta, setNavOculta] = useState(false)
  const [ultimoScroll, setUltimoScroll] = useState(0)
  const [infoAberta, setInfoAberta] = useState(false)
  const [flyItem, setFlyItem] = useState(null)
  const [cartPulse, setCartPulse] = useState(0)
  const categoriasRef = useRef({})
  const { quantidadeTotal } = useCart()

  const [loja, setLoja] = useState(null)
  const [cardapio, setCardapio] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState('')

  useEffect(() => {
    setErroCarregamento('')
    Promise.all([
      api.restaurantes.buscarPorId(id),
      api.cardapio.listar(id),
    ]).then(([rest, itens]) => {
      // Agrupa itens do cardápio por categoria
      const cats = {}
      itens.forEach(item => {
        if (!cats[item.categoria]) cats[item.categoria] = { id: item.categoria, nome: item.categoria, produtos: [] }
        cats[item.categoria].produtos.push({
          id: item.id,
          nome: item.nome,
          desc: item.descricao,
          preco: Number(item.preco) || 0,
          precoAnterior: item.preco_original && Number(item.preco_original) > Number(item.preco)
            ? Number(item.preco_original)
            : null,
          promocaoLabel: item.promocao_label || null,
          promocaoTipo: item.promocao_tipo || null,
          emoji: emojiProduto(item),
          imagem: imagemProduto(item),
          serve: 1,
          opcionais: normalizarOpcionais(item),
          restauranteId: id,
        })
      })
      setLoja({
        ...rest,
        emoji: emojiRestaurante(rest),
        imagem: imagemRestaurante(rest),
        categorias: Object.values(cats),
        avaliacao: rest.avaliacao_media ?? '—',
        tempoEntrega: rest.tempo_medio_preparo ? `${rest.tempo_medio_preparo}-${rest.tempo_medio_preparo + 10} min` : '30-40 min',
        taxaEntrega: 'Grátis',
        sobre: rest.descricao || `${rest.nome} — ${rest.categoria || 'Restaurante'} em ${rest.endereco || 'sua cidade'}`,
        pedidoMinimo: 'R$ 15,00',
        status: rest.status || 'ativo',
        fechado: !lojaEstaAberta(rest),
        superRestaurante: (rest.avaliacao_media || 0) >= 4.8,
        horarios: (() => {
          if (rest.status === 'fechado' || rest.status === 'inativo') {
            return [{ dia: 'Status da loja', horario: 'Fechada temporariamente no app' }]
          }
          let dias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
          try { dias = rest.dias_aberto ? JSON.parse(rest.dias_aberto) : dias } catch { dias = String(rest.dias_aberto || '').split(',').map(d => d.trim()).filter(Boolean) || dias }
          return [{ dia: dias.join(', ') || 'Todos os dias', horario: `${rest.horario_abertura || '18:00'} - ${rest.horario_fechamento || '23:00'}` }]
        })(),
        pagamentos: (() => {
          try { return rest.formas_pagamento ? JSON.parse(rest.formas_pagamento) : ['Dinheiro', 'Crédito', 'Débito', 'Pix'] }
          catch { return String(rest.formas_pagamento || '').split(',').map(p => p.trim()).filter(Boolean) || ['Dinheiro', 'Crédito', 'Débito', 'Pix'] }
        })(),
      })
      setCardapio(itens)
    }).catch(err => {
      console.error(err)
      setErroCarregamento(err.message || 'Erro ao carregar')
    })
      .finally(() => setCarregando(false))
  }, [id])

  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (atual) => {
    if (atual < 80) { setNavOculta(false) }
    else if (atual > ultimoScroll + 5) { setNavOculta(true) }
    else if (atual < ultimoScroll - 5) { setNavOculta(false) }
    setUltimoScroll(atual)
  })

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setCategoriaAtiva(e.target.id) }),
      { rootMargin: '-20% 0px -70% 0px' }
    )
    Object.values(categoriasRef.current).forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [loja])

  if (carregando) return <div className="min-h-screen flex items-center justify-center"><span className="text-text-muted">Carregando...</span></div>
  if (!loja) return <div className="min-h-screen flex items-center justify-center text-center px-4"><p className="text-4xl mb-3">🔌</p><p className="font-bold text-text-primary mb-1">{erroCarregamento || 'Restaurante não encontrado'}</p></div>

  const categoriasFiltradas = loja.categorias
    .map(cat => ({
      ...cat,
      produtos: cat.produtos.filter(p =>
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.desc?.toLowerCase().includes(busca.toLowerCase())
      ),
    }))
    .filter(cat => cat.produtos.length > 0)

  const scrollParaCategoria = (catId) => {
    const el = categoriasRef.current[catId]
    if (el) {
      const offset = el.getBoundingClientRect().top + window.scrollY - 170
      window.scrollTo({ top: offset, behavior: 'smooth' })
    }
  }

  const alvoCarrinho = () => {
    const alvos = Array.from(document.querySelectorAll('[data-cart-target]'))
    return alvos.find((el) => {
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight
    }) || null
  }

  const animarProdutoParaCarrinho = ({ produto, origem }) => {
    const alvo = alvoCarrinho()?.getBoundingClientRect()
    if (!origem || !alvo) {
      setCartPulse(v => v + 1)
      return
    }
    setFlyItem({
      id: `${produto.id}-${Date.now()}`,
      emoji: produto.emoji,
      imagem: produto.imagem,
      from: {
        x: origem.left + origem.width / 2 - 28,
        y: origem.top + origem.height / 2 - 28,
      },
      to: {
        x: alvo.left + alvo.width / 2 - 18,
        y: alvo.top + alvo.height / 2 - 18,
      },
    })
    setCartPulse(v => v + 1)
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">

      {/* Navbar da loja */}
      <Motion.div
        className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border shadow-sm"
        animate={{ y: navOculta ? '-100%' : '0%' }}
        initial={false}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Motion.button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full border border-border bg-transparent flex items-center justify-center cursor-pointer text-text-secondary hover:bg-surface-2 hover:text-primary transition-all shrink-0"
            whileTap={{ scale: 0.9 }}><ArrowLeft size={18} /></Motion.button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl">{loja.emoji}</span>
            <div className="min-w-0">
              <h1 className="font-display text-base font-extrabold text-text-primary truncate leading-tight">{loja.nome}</h1>
              <div className="flex items-center gap-3 text-xs text-text-muted font-semibold">
                <span className="flex items-center gap-1"><Star size={10} fill="#FFBA08" stroke="#FFBA08" />{loja.avaliacao}</span>
                <span className="flex items-center gap-1"><Clock size={10} className="text-accent" />{loja.tempoEntrega}</span>
                <span className="flex items-center gap-1"><Truck size={10} className="text-accent" />{loja.taxaEntrega}</span>
              </div>
            </div>
          </div>

          <Motion.button
            data-cart-target="store-cart"
            onClick={() => setCarrinhoAberto(true)}
            className="relative flex items-center gap-2 bg-transparent border border-border rounded-full py-2 pr-3 pl-2.5 cursor-pointer transition-all hover:border-primary hover:bg-primary-light shrink-0"
            animate={cartPulse ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative w-5 h-5 flex items-center justify-center text-text-primary">
              <ShoppingBag size={18} />
              <AnimatePresence>
                {quantidadeTotal > 0 && (
                  <Motion.span className="absolute -top-1.5 -right-1.5 bg-primary text-white rounded-full min-w-3.5 h-3.5 text-[0.55rem] font-extrabold flex items-center justify-center px-px border border-white"
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500 }}
                  >{quantidadeTotal}</Motion.span>
                )}
              </AnimatePresence>
            </div>
            <span className="hidden sm:block text-xs font-bold text-text-primary">Carrinho</span>
          </Motion.button>
        </div>

        {/* Só as pills de categoria ficam no sticky navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:-mx-6 sm:px-6">
            {loja.categorias.map(cat => (
              <Motion.button key={cat.id} onClick={() => scrollParaCategoria(cat.id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  categoriaAtiva === cat.id ? 'bg-primary text-white border-primary' : 'bg-white text-text-secondary border-border hover:border-primary hover:text-primary'
                }`} whileTap={{ scale: 0.95 }}
              >{cat.nome}</Motion.button>
            ))}
          </div>
        </div>
      </Motion.div>

      {/* Espaçador — altura do sticky navbar para evitar que o conteúdo fique escondido atrás dela */}
      <div className="h-[108px]" />

      {/* Banner */}
      <div className="relative w-full h-40 sm:h-56 bg-gradient-to-br from-secondary to-secondary overflow-hidden">
        {loja.imagem ? (
          <img src={loja.imagem} alt={loja.nome} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[8rem] opacity-20 select-none">{loja.emoji}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* ── Barra de info abaixo do banner ── */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">

          {/* Linha 1: logo flutuante + nome + avaliação + ver mais + pedido mínimo */}
          <div className="flex items-center gap-4 mb-4">
            {/* Logo flutua sobre o banner */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 -mt-10 rounded-2xl bg-white border-2 border-border shadow-lg flex items-center justify-center text-4xl shrink-0 relative z-10 overflow-hidden">
              {loja.imagem ? <img src={loja.imagem} alt={loja.nome} className="w-full h-full object-cover" /> : loja.emoji}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-text-primary leading-tight">{loja.nome}</h2>
                {loja.fechado && (
                  <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-extrabold text-red-600">FECHADA</span>
                )}
                {loja.superRestaurante && (
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                    <Star size={11} fill="white" stroke="white" />
                  </div>
                )}
                <div className="flex items-center gap-1 text-sm font-extrabold text-yellow-500">
                  <Star size={14} fill="#FFBA08" stroke="#FFBA08" />
                  {loja.avaliacao}
                </div>
              </div>
              <p className="text-sm text-text-muted font-semibold">{loja.categoria}</p>
            </div>

            {/* Ver mais + pedido mínimo — desktop */}
            <div className="hidden md:flex items-center gap-4 shrink-0 pt-1">
              <button
                onClick={() => setInfoAberta(true)}
                className="text-sm font-bold text-primary cursor-pointer bg-transparent border-none hover:underline"
              >
                Ver mais
              </button>
              <div className="w-px h-8 bg-border" />
              <div className="flex items-center gap-1.5 text-sm text-text-muted font-semibold">
                <span className="w-5 h-5 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs">$</span>
                Pedido mínimo {loja.pedidoMinimo}
              </div>
            </div>
          </div>

          {/* Linha 2: busca + entrega + horário */}
          <div className="flex gap-3 items-stretch">
            {/* Busca */}
            <div className="flex-1 flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-4 h-11 focus-within:border-primary focus-within:bg-white transition-all">
              <Search size={15} className="text-primary shrink-0" />
              <input
                type="text"
                placeholder="Buscar no cardápio"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-text-primary placeholder:text-text-muted placeholder:font-normal min-w-0"
              />
            </div>

            {/* Entrega */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setTipoEntrega(t => t === 'Entrega' ? 'Retirada' : 'Entrega') }}
              className="hidden sm:flex items-center gap-2 px-4 h-11 bg-surface-2 border border-border rounded-xl text-sm font-bold text-text-primary cursor-pointer hover:border-primary transition-all whitespace-nowrap shrink-0"
              title="Alternar entre entrega e retirada"
            >
              <Truck size={15} className="text-text-muted" />
              {tipoEntrega}
              <ChevronDown size={14} className="text-text-muted" />
            </button>

            {/* Hoje / horário */}
            <div className="hidden sm:flex flex-col justify-center px-4 h-11 bg-surface-2 border border-border rounded-xl text-xs shrink-0">
              <span className="font-extrabold text-text-primary leading-tight">Hoje</span>
              <span className="text-text-muted font-semibold">{tipoEntrega === 'Retirada' ? 'Retirar no balcão' : `${loja.tempoEntrega} · ${loja.taxaEntrega === 'Grátis' ? 'Grátis' : loja.taxaEntrega}`}</span>
            </div>
          </div>

          {/* Ver mais mobile */}
          <button
            onClick={() => setInfoAberta(true)}
            className="md:hidden mt-2 text-sm font-bold text-primary cursor-pointer bg-transparent border-none hover:underline"
          >
            Ver mais informações
          </button>
        </div>
      </div>

      {loja.fechado && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            Esta loja está fechada agora. O cardápio pode ser consultado, mas novos pedidos estão bloqueados.
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {categoriasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="text-5xl">🔍</div>
            <h3 className="font-display text-lg font-bold text-text-secondary">Nenhum produto encontrado</h3>
          </div>
        ) : (
          categoriasFiltradas.map(cat => (
            <section key={cat.id} id={cat.id} ref={el => (categoriasRef.current[cat.id] = el)} className="mb-8 scroll-mt-48">
              <h2 className="font-display text-lg font-extrabold text-text-primary mb-2 pb-2 border-b-2 border-primary/20">{cat.nome}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-x-8">
                {cat.produtos.map((produto, i) => (
                  <ProdutoCard key={produto.id} produto={produto} onAbrir={setProdutoAberto} index={i} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <MobileNavBar />
      <CartDrawer isOpen={carrinhoAberto} onClose={() => setCarrinhoAberto(false)} />

      <AnimatePresence>
        {flyItem && (
          <Motion.div
            key={flyItem.id}
            className="fixed z-[260] pointer-events-none h-14 w-14 rounded-2xl bg-white border border-border shadow-xl flex items-center justify-center overflow-hidden text-2xl"
            initial={{ x: flyItem.from.x, y: flyItem.from.y, scale: 1, opacity: 1 }}
            animate={{ x: flyItem.to.x, y: flyItem.to.y, scale: 0.62, opacity: 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.58, ease: [0.2, 0.8, 0.2, 1] }}
            onAnimationComplete={() => setFlyItem(null)}
          >
            {flyItem.imagem ? <img src={flyItem.imagem} alt="" className="h-full w-full object-cover" /> : flyItem.emoji}
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Modal Ver mais */}
      <AnimatePresence>
        {infoAberta && (
          <Motion.div
            className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setInfoAberta(false)}
          >
            <Motion.div
              className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl overflow-hidden"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-border rounded-full" />
              </div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-display text-base font-extrabold text-text-primary">{loja.nome}</h3>
                <button onClick={() => setInfoAberta(false)}
                  className="w-8 h-8 rounded-full border border-border bg-transparent flex items-center justify-center cursor-pointer hover:bg-surface-2 transition-all">
                  <X size={15} className="text-text-secondary" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto max-h-[70vh]">
                <SidebarInfo loja={loja} />
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {produtoAberto && (
          <ProdutoModal produto={produtoAberto} loja={loja} onClose={() => setProdutoAberto(null)} onItemAdded={animarProdutoParaCarrinho} />
        )}
      </AnimatePresence>
    </div>
  )
}
