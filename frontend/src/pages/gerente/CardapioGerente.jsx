import { useState, useEffect, useCallback } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight, X, Check, FolderPlus, BadgePercent, Tags, PackagePlus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { imagemProduto } from '../../utils/imagens'

function formatarPreco(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`
}

// ── Modal produto ─────────────────────────────────────────────────────────────
function ModalProduto({ produto, categoriaId, categorias, restauranteId, onFechar, onSalvo }) {
  const [nome, setNome] = useState(produto?.nome || '')
  const [preco, setPreco] = useState(produto?.preco ? String(produto.preco) : '')
  const [categoria, setCategoria] = useState(produto?.categoria || categoriaId || '')
  const [descricao, setDescricao] = useState(produto?.descricao || '')
  const [imagem, setImagem] = useState(produto?.imagem || '')
  const [servePessoas, setServePessoas] = useState(String(produto?.serve_pessoas || 1))
  const [salvando, setSalvando] = useState(false)

  const handleImagemArquivo = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result) setImagem(String(reader.result))
    }
    reader.onerror = () => {
      alert('Não foi possível carregar a imagem. Tente outro arquivo ou URL.')
    }
    reader.readAsDataURL(file)
  }

  const handleSalvar = async () => {
    if (!nome.trim() || !preco || !categoria.trim()) {
      alert('Preencha nome, preço e categoria.')
      return
    }
    setSalvando(true)
    try {
      if (produto?.id) {
        await api.cardapio.atualizar(produto.id, {
          nome, preco: parseFloat(preco), categoria, descricao, imagem, serve_pessoas: Math.max(1, Number(servePessoas || 1)),
        })
      } else {
        await api.cardapio.criar({
          restauranteId, nome, preco: parseFloat(preco), categoria, descricao, imagem,
          serve_pessoas: Math.max(1, Number(servePessoas || 1)), tempo_preparo: 30,
        })
      }
      onSalvo()
      onFechar()
    } catch (e) {
      alert('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Motion.div
      className="fixed inset-0 bg-black/50 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onFechar}
    >
      <Motion.div
        className="max-h-[95dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-bold text-text-primary">
            {produto?.id ? 'Editar produto' : 'Novo produto'}
          </h3>
          <button onClick={onFechar} className="w-8 h-8 rounded-full border border-border flex items-center justify-center cursor-pointer hover:bg-surface-2 transition-all">
            <X size={15} className="text-text-secondary" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Nome do produto *</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Pizza Margherita"
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Preço (R$) *</label>
            <input type="number" step="0.01" min="0" value={preco} onChange={e => setPreco(e.target.value)} placeholder="0,00"
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Categoria *</label>
            <input list="lista-categorias" value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex: Pizzas, Bebidas..."
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all" />
            <datalist id="lista-categorias">
              {categorias.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Descrição</label>
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Breve descrição do produto"
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Serve quantas pessoas? *</label>
            <input
              type="number"
              min="1"
              max="20"
              value={servePessoas}
              onChange={e => setServePessoas(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Imagem do produto</label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input type="text" value={imagem} onChange={e => setImagem(e.target.value)} placeholder="URL da imagem ou caminho salvo"
                className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all" />
              <label className="inline-flex items-center justify-center px-4 py-2 border border-border rounded-xl text-sm font-semibold text-text-primary bg-surface-2 cursor-pointer hover:bg-surface-3 transition-all">
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={handleImagemArquivo} />
              </label>
            </div>
            {imagem && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-border">
                <img src={imagem} alt="Preview do produto" className="w-full h-40 object-cover" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onFechar} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-bold text-text-secondary cursor-pointer hover:bg-surface-2 transition-all">
            Cancelar
          </button>
          <button onClick={handleSalvar} disabled={salvando}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold cursor-pointer hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 border-none">
            <Check size={15} /> {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Motion.div>
    </Motion.div>
  )
}

// ── Modal promoções ───────────────────────────────────────────────────────────
function ModalPromocao({ categorias, restauranteId, onFechar, onSalvo }) {
  const [modo, setModo] = useState('itens')
  const [selecionados, setSelecionados] = useState({})
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(categorias[0]?.nome || '')
  const [desconto, setDesconto] = useState('15')
  const [comboNome, setComboNome] = useState('')
  const [comboPreco, setComboPreco] = useState('')
  const [comboDescricao, setComboDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [erro, setErro] = useState('')

  const produtos = categorias.flatMap(cat => cat.produtos.map(produto => ({ ...produto, categoriaNome: cat.nome })))
  const produtosSelecionados = produtos.filter(produto => selecionados[produto.id])
  const produtosDaCategoria = produtos.filter(produto => produto.categoriaNome === categoriaSelecionada)
  const alvoDesconto = modo === 'categoria' ? produtosDaCategoria : produtosSelecionados
  const somaCombo = produtosSelecionados.reduce((total, produto) => total + Number(produto.preco || 0), 0)

  const alternarProduto = (id) => {
    setSelecionados(prev => ({ ...prev, [id]: !prev[id] }))
    setErro('')
    setFeedback('')
  }

  const aplicarDesconto = async () => {
    const percentual = Number(desconto)
    if (!Number.isFinite(percentual) || percentual <= 0 || percentual >= 100) {
      setErro('Informe um desconto entre 1% e 99%.')
      return
    }
    if (!alvoDesconto.length) {
      setErro(modo === 'categoria' ? 'Essa categoria não tem produtos.' : 'Escolha ao menos um produto.')
      return
    }

    setSalvando(true)
    setErro('')
    setFeedback('')
    try {
      await Promise.all(alvoDesconto.map(produto => {
        const precoOriginal = Number(produto.preco_original || produto.precoOriginal || produto.preco || 0)
        const precoPromocional = Math.max(0.01, Number((precoOriginal * (1 - percentual / 100)).toFixed(2)))
        return api.cardapio.atualizar(produto.id, {
          preco: precoPromocional,
          preco_original: precoOriginal,
          promocao_ativa: true,
          promocao_tipo: modo === 'categoria' ? 'categoria' : 'desconto',
          promocao_label: `${percentual}% OFF`,
        })
      }))
      setFeedback(`${alvoDesconto.length} produto${alvoDesconto.length > 1 ? 's' : ''} em promoção.`)
      await onSalvo()
    } catch (error) {
      setErro(error.message || 'Não foi possível aplicar o desconto.')
    } finally {
      setSalvando(false)
    }
  }

  const limparPromocoes = async () => {
    if (!alvoDesconto.length) {
      setErro('Escolha ao menos um produto para limpar.')
      return
    }
    setSalvando(true)
    setErro('')
    setFeedback('')
    try {
      await Promise.all(alvoDesconto.map(produto => {
        const precoOriginal = Number(produto.preco_original || produto.precoOriginal || produto.preco || 0)
        return api.cardapio.atualizar(produto.id, {
          preco: precoOriginal,
          preco_original: null,
          promocao_ativa: false,
          promocao_tipo: null,
          promocao_label: null,
        })
      }))
      setFeedback('Promoções removidas dos produtos selecionados.')
      await onSalvo()
    } catch (error) {
      setErro(error.message || 'Não foi possível remover as promoções.')
    } finally {
      setSalvando(false)
    }
  }

  const criarCombo = async () => {
    const preco = Number(comboPreco)
    if (!comboNome.trim()) {
      setErro('Dê um nome para o combo.')
      return
    }
    if (produtosSelecionados.length < 2) {
      setErro('Escolha pelo menos dois produtos para criar um combo.')
      return
    }
    if (!Number.isFinite(preco) || preco <= 0 || preco >= somaCombo) {
      setErro('O preço do combo precisa ser maior que zero e menor que a soma dos itens.')
      return
    }

    setSalvando(true)
    setErro('')
    setFeedback('')
    try {
      await api.cardapio.criar({
        restauranteId,
        nome: comboNome,
        preco,
        preco_original: Number(somaCombo.toFixed(2)),
        categoria: 'Combos',
        descricao: comboDescricao || produtosSelecionados.map(produto => produto.nome).join(' + '),
        serve_pessoas: Math.max(2, Math.min(20, produtosSelecionados.reduce((total, produto) => total + Number(produto.serve_pessoas || 1), 0))),
        tempo_preparo: 30,
        promocao_ativa: true,
        promocao_tipo: 'combo',
        promocao_label: 'Combo',
        combo_itens: produtosSelecionados.map(produto => ({ id: produto.id, nome: produto.nome, preco: produto.preco })),
      })
      setFeedback('Combo criado no cardápio.')
      setComboNome('')
      setComboPreco('')
      setComboDescricao('')
      setSelecionados({})
      await onSalvo()
    } catch (error) {
      setErro(error.message || 'Não foi possível criar o combo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Motion.div
      className="fixed inset-0 bg-black/50 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onFechar}
    >
      <Motion.div
        className="flex max-h-[95dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white p-4 shadow-xl sm:max-h-[90vh] sm:rounded-2xl sm:p-6"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="font-display text-lg font-bold text-text-primary">Promoções do cardápio</h3>
            <p className="text-sm text-text-muted font-semibold mt-1">Descontos aqui mudam o preço que o cliente paga.</p>
          </div>
          <button onClick={onFechar} className="w-8 h-8 rounded-full border border-border flex items-center justify-center cursor-pointer hover:bg-surface-2 transition-all shrink-0">
            <X size={15} className="text-text-secondary" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { id: 'itens', label: 'Itens', Icon: Tags },
            { id: 'categoria', label: 'Categoria', Icon: BadgePercent },
            { id: 'combo', label: 'Combo', Icon: PackagePlus },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { setModo(id); setErro(''); setFeedback('') }}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-extrabold transition-all ${
                modo === id ? 'border-primary bg-primary text-white' : 'border-border bg-surface-2 text-text-secondary hover:border-primary hover:text-primary'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_260px] min-h-0">
          <div className="min-h-0">
            {modo === 'categoria' && (
              <div className="mb-3">
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Categoria *</label>
                <select
                  value={categoriaSelecionada}
                  onChange={e => setCategoriaSelecionada(e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all"
                >
                  {categorias.map(cat => <option key={cat.id} value={cat.nome}>{cat.nome}</option>)}
                </select>
              </div>
            )}

            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="px-4 py-3 bg-surface-2 border-b border-border flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wide text-text-muted">
                  {modo === 'categoria' ? 'Itens da categoria' : 'Escolha os produtos'}
                </span>
                <span className="text-xs font-bold text-text-muted">{modo === 'categoria' ? produtosDaCategoria.length : produtosSelecionados.length} selecionados</span>
              </div>
              <div className="max-h-[42vh] overflow-y-auto divide-y divide-border">
                {(modo === 'categoria' ? produtosDaCategoria : produtos).map(produto => {
                  const ativo = modo === 'categoria' || Boolean(selecionados[produto.id])
                  const precoOriginal = Number(produto.preco_original || produto.precoOriginal || 0)
                  return (
                    <button
                      key={produto.id}
                      type="button"
                      disabled={modo === 'categoria'}
                      onClick={() => alternarProduto(produto.id)}
                      className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all ${
                        ativo ? 'bg-primary-light' : 'bg-white hover:bg-surface-2'
                      } ${modo === 'categoria' ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        ativo ? 'bg-primary border-primary text-white' : 'border-border bg-white'
                      }`}>
                        {ativo && <Check size={13} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-text-primary truncate">{produto.nome}</span>
                        <span className="block text-xs font-semibold text-text-muted truncate">{produto.categoriaNome}</span>
                      </span>
                      <span className="text-right shrink-0">
                        {precoOriginal > Number(produto.preco || 0) && (
                          <span className="block text-[0.68rem] text-text-muted line-through font-bold">{formatarPreco(precoOriginal)}</span>
                        )}
                        <span className="block text-xs font-extrabold text-accent">{formatarPreco(produto.preco)}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-2 p-4 h-fit">
            {modo !== 'combo' ? (
              <>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Desconto *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={desconto}
                    onChange={e => setDesconto(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all"
                  />
                  <span className="text-sm font-extrabold text-text-muted">%</span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={aplicarDesconto}
                    disabled={salvando}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white border-none disabled:opacity-60"
                  >
                    <BadgePercent size={15} /> Aplicar desconto
                  </button>
                  <button
                    type="button"
                    onClick={limparPromocoes}
                    disabled={salvando}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-secondary hover:border-primary hover:text-primary disabled:opacity-60"
                  >
                    Limpar seleção
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Nome do combo *</label>
                <input value={comboNome} onChange={e => setComboNome(e.target.value)} placeholder="Ex: Combo casal"
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all" />
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mt-3 mb-1.5">Preço do combo *</label>
                <input type="number" min="0" step="0.01" value={comboPreco} onChange={e => setComboPreco(e.target.value)} placeholder="0,00"
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all" />
                <p className="text-xs font-semibold text-text-muted mt-2">Soma dos itens: <span className="font-extrabold text-text-primary">{formatarPreco(somaCombo)}</span></p>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mt-3 mb-1.5">Descrição</label>
                <textarea value={comboDescricao} onChange={e => setComboDescricao(e.target.value)} rows={3} placeholder="Opcional"
                  className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all resize-none" />
                <button
                  type="button"
                  onClick={criarCombo}
                  disabled={salvando}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white border-none disabled:opacity-60"
                >
                  <PackagePlus size={15} /> Criar combo
                </button>
              </>
            )}

            {erro && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{erro}</p>}
            {feedback && <p className="mt-3 rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-xs font-bold text-accent">{feedback}</p>}
          </div>
        </div>
      </Motion.div>
    </Motion.div>
  )
}

// ── Modal nova categoria ──────────────────────────────────────────────────────
function ModalNovaCategoria({ restauranteId, onFechar, onSalvo }) {
  const [nomeCategoria, setNomeCategoria] = useState('')
  const [nomeProduto, setNomeProduto] = useState('')
  const [preco, setPreco] = useState('')
  const [salvando, setSalvando] = useState(false)

  const handleSalvar = async () => {
    if (!nomeCategoria.trim() || !nomeProduto.trim() || !preco) {
      alert('Preencha o nome da categoria, um produto e seu preço para criar.')
      return
    }
    setSalvando(true)
    try {
      await api.cardapio.criar({
        restauranteId,
        nome: nomeProduto,
        preco: parseFloat(preco),
        categoria: nomeCategoria,
        tempo_preparo: 30,
      })
      onSalvo()
      onFechar()
    } catch (e) {
      alert('Erro ao criar categoria: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Motion.div
      className="fixed inset-0 bg-black/50 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onFechar}
    >
      <Motion.div
        className="max-h-[95dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-bold text-text-primary">Nova categoria</h3>
          <button onClick={onFechar} className="w-8 h-8 rounded-full border border-border flex items-center justify-center cursor-pointer hover:bg-surface-2 transition-all">
            <X size={15} className="text-text-secondary" />
          </button>
        </div>
        <p className="text-sm text-text-muted font-semibold mb-4">Para criar uma categoria, adicione um produto inicial.</p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Nome da categoria *</label>
            <input type="text" value={nomeCategoria} onChange={e => setNomeCategoria(e.target.value)} placeholder="Ex: Pizzas, Bebidas, Sobremesas..."
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Primeiro produto *</label>
            <input type="text" value={nomeProduto} onChange={e => setNomeProduto(e.target.value)} placeholder="Ex: Pizza Margherita"
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all" />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5">Preço (R$) *</label>
            <input type="number" step="0.01" min="0" value={preco} onChange={e => setPreco(e.target.value)} placeholder="0,00"
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onFechar} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-bold text-text-secondary cursor-pointer hover:bg-surface-2 transition-all">
            Cancelar
          </button>
          <button onClick={handleSalvar} disabled={salvando}
            className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold cursor-pointer hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 border-none">
            <FolderPlus size={15} /> {salvando ? 'Criando...' : 'Criar categoria'}
          </button>
        </div>
      </Motion.div>
    </Motion.div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CardapioGerente() {
  const { usuario } = useAuth()
  const [categorias, setCategorias] = useState([])
  const [restauranteId, setRestauranteId] = useState(null)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(null)         // { produto, categoriaId } | null
  const [modalCategoria, setModalCategoria] = useState(false)
  const [modalPromocao, setModalPromocao] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const carregarCardapio = useCallback((restId) => {
    return api.cardapio.listarGerenciamento(restId).then(itens => {
      const cats = {}
      itens.forEach(item => {
        const cat = item.categoria || 'Geral'
        if (!cats[cat]) cats[cat] = { id: cat, nome: cat, produtos: [] }
        cats[cat].produtos.push({
          ...item,
          preco: Number(item.preco),
          preco_original: item.preco_original ? Number(item.preco_original) : null,
          promocao_ativa: Boolean(Number(item.promocao_ativa || 0)),
        })
      })
      setCategorias(Object.values(cats))
    })
  }, [])

  useEffect(() => {
    const usr = usuario || JSON.parse(localStorage.getItem('usuario') || '{}')
    if (!usr?.email) { setCarregando(false); return }

    api.restaurantes.meuRestauranteOuCriar(usr.email, 'Minha Loja')
      .then(rest => {
        setRestauranteId(rest.id)
        return carregarCardapio(rest.id)
      })
      .catch(err => {
        console.warn('Cardápio: erro ao carregar restaurante:', err)
      })
      .finally(() => setCarregando(false))
  }, [carregarCardapio, usuario])

  const toggleDisponivel = async (prodId, disponivel) => {
    try {
      await api.cardapio.atualizar(prodId, { disponivel: !disponivel })
      setCategorias(prev => prev.map(cat => ({
        ...cat,
        produtos: cat.produtos.map(p => p.id === prodId ? { ...p, disponivel: !p.disponivel } : p)
      })))
    } catch (e) { alert('Erro: ' + e.message) }
  }

  const excluirProduto = async (prodId) => {
    if (!confirm('Deseja excluir este produto?')) return
    try {
      await api.cardapio.remover(prodId)
      setCategorias(prev => prev
        .map(cat => ({ ...cat, produtos: cat.produtos.filter(p => p.id !== prodId) }))
        .filter(cat => cat.produtos.length > 0)
      )
    } catch (e) { alert('Erro: ' + e.message) }
  }

  const nomesCategorias = categorias.map(c => c.nome)

  const categoriasFiltradas = categorias
    .map(cat => ({
      ...cat,
      produtos: cat.produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
    }))
    .filter(cat => cat.produtos.length > 0 || busca === '')

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Cardápio</h1>
          <p className="text-sm text-text-muted font-semibold mt-1">Gerencie os produtos e categorias da sua loja</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {restauranteId && (
            <>
              <button
                onClick={() => setModalCategoria(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-secondary border border-secondary/30 bg-secondary/8 px-4 py-2.5 rounded-xl cursor-pointer hover:bg-secondary hover:text-white transition-all"
              >
                <FolderPlus size={14} /> Nova categoria
              </button>
              <button
                onClick={() => setModalPromocao(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-accent border border-accent/30 bg-accent/10 px-4 py-2.5 rounded-xl cursor-pointer hover:bg-accent hover:text-white transition-all"
              >
                <BadgePercent size={14} /> Promoções
              </button>
              <button
                onClick={() => setModal({ produto: null, categoriaId: nomesCategorias[0] || '' })}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-primary px-4 py-2.5 rounded-xl cursor-pointer hover:bg-primary/90 transition-all border-none"
              >
                <Plus size={14} /> Novo produto
              </button>
            </>
          )}
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Buscar produto..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all"
        />
      </div>

      {/* Estados */}
      {carregando && (
        <div className="text-center py-16 text-text-muted font-semibold">Carregando cardápio...</div>
      )}

      {!carregando && categoriasFiltradas.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-text-muted font-semibold mb-4">Seu cardápio está vazio.</p>
          {restauranteId && (
            <button
              onClick={() => setModalCategoria(true)}
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:bg-primary/90 transition-all border-none"
            >
              <FolderPlus size={16} /> Criar primeira categoria
            </button>
          )}
        </div>
      )}

      {/* Categorias */}
      <div className="flex flex-col gap-4">
        {categoriasFiltradas.map(cat => (
          <Motion.div key={cat.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-text-primary">{cat.nome}</h3>
              <button
                onClick={() => setModal({ produto: null, categoriaId: cat.id })}
                className="flex items-center gap-1.5 text-xs font-bold text-primary border border-primary/20 bg-primary-light px-3 py-1.5 rounded-lg cursor-pointer hover:bg-primary hover:text-white transition-all"
              >
                <Plus size={13} /> Adicionar produto
              </button>
            </div>

            <div className="divide-y divide-border">
              {cat.produtos.map(produto => (
                <div key={produto.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                    {imagemProduto(produto) ? <img src={imagemProduto(produto)} alt={produto.nome} className="w-full h-full object-cover" /> : '🍽️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${produto.disponivel ? 'text-text-primary' : 'text-text-muted line-through'}`}>
                      {produto.nome}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {produto.preco_original > produto.preco && (
                        <span className="text-[0.68rem] font-bold text-text-muted line-through">{formatarPreco(produto.preco_original)}</span>
                      )}
                      <span className="text-xs font-bold text-accent">{formatarPreco(produto.preco)}</span>
                      {produto.promocao_ativa && (
                        <span className="rounded-full bg-primary-light px-2 py-0.5 text-[0.65rem] font-extrabold text-primary">
                          {produto.promocao_label || 'Oferta'}
                        </span>
                      )}
                    </div>
                    {produto.descricao && (
                      <p className="text-xs text-text-muted mt-0.5 truncate">{produto.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleDisponivel(produto.id, produto.disponivel)}
                      className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                        produto.disponivel
                          ? 'text-accent bg-accent/10 border-accent/20 hover:bg-accent/20'
                          : 'text-text-muted bg-surface-2 border-border'
                      }`}
                    >
                      {produto.disponivel ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {produto.disponivel ? 'Disponível' : 'Inativo'}
                    </button>
                    <button
                      onClick={() => setModal({ produto, categoriaId: cat.id })}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center cursor-pointer hover:border-primary hover:text-primary hover:bg-primary-light transition-all text-text-secondary"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => excluirProduto(produto.id)}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center cursor-pointer hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all text-text-secondary"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Motion.div>
        ))}
      </div>

      {/* Modais */}
      <AnimatePresence>
        {modal !== null && restauranteId && (
          <ModalProduto
            produto={modal.produto}
            categoriaId={modal.categoriaId}
            categorias={nomesCategorias}
            restauranteId={restauranteId}
            onFechar={() => setModal(null)}
            onSalvo={() => carregarCardapio(restauranteId)}
          />
        )}
        {modalCategoria && restauranteId && (
          <ModalNovaCategoria
            restauranteId={restauranteId}
            onFechar={() => setModalCategoria(false)}
            onSalvo={() => carregarCardapio(restauranteId)}
          />
        )}
        {modalPromocao && restauranteId && (
          <ModalPromocao
            categorias={categorias}
            restauranteId={restauranteId}
            onFechar={() => setModalPromocao(false)}
            onSalvo={() => carregarCardapio(restauranteId)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
