import { useState, useEffect } from 'react'
import { motion as Motion } from 'framer-motion'
import { Check, Store, Clock, CreditCard, Sun, Moon, MapPin, Power } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useDarkMode } from '../../contexts/DarkModeContext'
import api from '../../services/api'

const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const formasPagamentoOpcoes = ['Dinheiro', 'Crédito', 'Débito', 'Pix', 'Vale Refeição']

function lerLista(valor, padrao = []) {
  if (Array.isArray(valor)) return valor
  if (!valor) return padrao
  try {
    const parsed = JSON.parse(valor)
    return Array.isArray(parsed) ? parsed : padrao
  } catch {
    return String(valor).split(',').map(v => v.trim()).filter(Boolean)
  }
}

export default function ConfiguracoesGerente() {
  const { usuario } = useAuth()
  const { dark, toggle } = useDarkMode()

  const [restauranteId, setRestauranteId] = useState(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [categoria, setCategoria] = useState('')
  const [logo, setLogo] = useState('')
  const [capa, setCapa] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [statusLoja, setStatusLoja] = useState('ativo')
  const [pedidoMinimo, setPedidoMinimo] = useState('0')

  const [diasAberto, setDiasAberto] = useState(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'])
  const [horarioAbertura, setHorarioAbertura] = useState('18:00')
  const [horarioFechamento, setHorarioFechamento] = useState('23:00')
  const [pagamentos, setPagamentos] = useState(['Dinheiro', 'Crédito', 'Débito', 'Pix'])

  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [buscandoLocalizacao, setBuscandoLocalizacao] = useState(false)
  const [alterandoStatus, setAlterandoStatus] = useState(false)

  useEffect(() => {
    const usr = usuario || JSON.parse(localStorage.getItem('usuario') || '{}')
    if (!usr?.email) { setCarregando(false); return }

    api.restaurantes.meuRestauranteOuCriar(usr.email, 'Minha Loja')
      .then(rest => {
        setRestauranteId(rest.id)
        setNome(rest.nome || '')
        setEmail(rest.email || '')
        setTelefone(rest.telefone || '')
        setEndereco(rest.endereco || '')
        setCategoria(rest.categoria || '')
        setLogo(rest.logo || '')
        setCapa(rest.capa || '')
        setLatitude(rest.latitude ?? '')
        setLongitude(rest.longitude ?? '')
        setStatusLoja(rest.status || 'ativo')
        setPedidoMinimo(String(Number(rest.pedido_minimo || 0)))
        setHorarioAbertura(rest.horario_abertura || '18:00')
        setHorarioFechamento(rest.horario_fechamento || '23:00')
        setDiasAberto(lerLista(rest.dias_aberto, ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']))
        setPagamentos(lerLista(rest.formas_pagamento, ['Dinheiro', 'Crédito', 'Débito', 'Pix']))
      })
      .catch(err => {
        console.warn('Não foi possível carregar restaurante:', err)
        setErro('Não foi possível carregar os dados da loja: ' + (err.message || 'erro desconhecido'))
      })
      .finally(() => setCarregando(false))
  }, [usuario])

  const toggleDia = (dia) =>
    setDiasAberto(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia])

  const togglePagamento = (forma) =>
    setPagamentos(prev => prev.includes(forma) ? prev.filter(f => f !== forma) : [...prev, forma])


  const preencherComLocalizacaoAtual = () => {
    if (!navigator.geolocation) {
      setErro('Seu navegador não suporta geolocalização.')
      return
    }
    setErro(null)
    setBuscandoLocalizacao(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setLatitude(String(lat))
        setLongitude(String(lng))

        let enderecoAutomatico = `Localização atual (${lat.toFixed(5)}, ${lng.toFixed(5)})`
        try {
          const resp = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`)
          if (resp.ok) {
            const data = await resp.json()
            const partes = [data.locality, data.city, data.principalSubdivision, data.countryName].filter(Boolean)
            if (partes.length) enderecoAutomatico = partes.join(', ')
          }
        } catch {
          // Sem internet ou API indisponível: mantém o texto com coordenadas.
        }

        setEndereco(prev => prev?.trim() ? prev : enderecoAutomatico)
        localStorage.setItem('localizacao', JSON.stringify({ latitude: lat, longitude: lng }))
        setBuscandoLocalizacao(false)
      },
      (err) => {
        setBuscandoLocalizacao(false)
        if (err.code === 1) setErro('Permissão de localização negada. Ative no navegador.')
        else setErro('Não foi possível obter sua localização.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }

  const handleSalvar = async () => {
    if (!restauranteId) {
      setErro('Restaurante não encontrado. Faça login novamente.')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      await api.restaurantes.atualizar(restauranteId, {
        nome: nome || undefined,
        email: email || undefined,
        telefone: telefone || undefined,
        endereco: endereco || undefined,
        categoria: categoria || undefined,
        logo: logo || undefined,
        capa: capa || undefined,
        latitude: latitude !== '' ? Number(latitude) : undefined,
        longitude: longitude !== '' ? Number(longitude) : undefined,
        horario_abertura: horarioAbertura,
        horario_fechamento: horarioFechamento,
        dias_aberto: diasAberto,
        formas_pagamento: pagamentos,
        pedido_minimo: Math.max(0, Number(pedidoMinimo || 0)),
      })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    } catch (e) {
      setErro('Erro ao salvar: ' + (e.message || 'tente novamente'))
    } finally {
      setSalvando(false)
    }
  }

  const alternarStatusLoja = async () => {
    if (!restauranteId || alterandoStatus) return
    if (!['ativo', 'fechado'].includes(statusLoja)) {
      setErro('A loja precisa ser aprovada pela administração antes de abrir.')
      return
    }
    const anterior = statusLoja
    const proximo = anterior === 'ativo' ? 'fechado' : 'ativo'
    setStatusLoja(proximo)
    setErro(null)
    setAlterandoStatus(true)
    try {
      await api.restaurantes.atualizar(restauranteId, { status: proximo })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
    } catch (error) {
      setStatusLoja(anterior)
      setErro('Não foi possível alterar o status da loja: ' + (error.message || 'tente novamente'))
    } finally {
      setAlterandoStatus(false)
    }
  }

  const inputCls = 'w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary transition-all'
  const labelCls = 'block text-xs font-bold text-text-muted uppercase tracking-wide mb-1.5'
  const lojaAguardandoAprovacao = statusLoja === 'pendente'
  const lojaRejeitada = statusLoja === 'rejeitado'

  if (carregando) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-extrabold text-text-primary">Configurações</h1>
        </div>
        <div className="flex flex-col gap-4 max-w-2xl">
          {[1,2,3].map(i => <div key={i} className="h-40 rounded-2xl bg-surface-2 animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-text-primary">Perfil e configurações</h1>
        <p className="text-sm text-text-muted font-semibold mt-1">Gerencie seu acesso e as informações da loja</p>
      </div>

      <div className="flex flex-col gap-4 max-w-2xl">

        {/* Aparência */}
        <Motion.div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            {dark ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-primary" />}
            <h3 className="font-display text-base font-bold text-text-primary">Aparência</h3>
          </div>
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-text-primary">Modo escuro</p>
              <p className="text-xs text-text-muted font-semibold mt-0.5">Aplica em todas as páginas do sistema</p>
            </div>
            <button
              onClick={toggle}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer border-none ${dark ? 'bg-primary' : 'bg-border'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${dark ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </Motion.div>


        {/* Status da loja */}
        <Motion.div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Power size={16} className={statusLoja === 'ativo' ? 'text-accent' : 'text-red-500'} />
            <h3 className="font-display text-base font-bold text-text-primary">Status da loja</h3>
          </div>
          <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-text-primary">
                {lojaAguardandoAprovacao
                  ? 'Loja aguardando aprovação'
                  : lojaRejeitada
                    ? 'Cadastro da loja rejeitado'
                    : statusLoja === 'ativo'
                      ? 'Loja aberta para pedidos'
                      : 'Loja fechada para pedidos'}
              </p>
              <p className="text-xs text-text-muted font-semibold mt-0.5">
                {lojaAguardandoAprovacao
                  ? 'Cadastre pelo menos um produto. Depois, a administração poderá revisar e publicar sua loja.'
                  : lojaRejeitada
                    ? 'Revise os dados da loja e procure o suporte para solicitar uma nova análise.'
                    : 'Quando estiver fechada, a loja aparece como fechada e o cliente não consegue adicionar itens ao carrinho.'}
              </p>
            </div>
            <button
              type="button"
              onClick={alternarStatusLoja}
              disabled={alterandoStatus || !restauranteId || !['ativo', 'fechado'].includes(statusLoja)}
              className={`px-5 py-2.5 rounded-xl text-sm font-extrabold border transition-all cursor-pointer ${
                statusLoja === 'ativo'
                  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                  : 'bg-accent text-white border-accent hover:opacity-90'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {lojaAguardandoAprovacao
                ? 'Aguardando aprovação'
                : lojaRejeitada
                  ? 'Revisão necessária'
                  : alterandoStatus
                    ? 'Atualizando...'
                    : statusLoja === 'ativo'
                      ? 'Fechar loja'
                      : 'Abrir loja'}
            </button>
          </div>
        </Motion.div>

        {/* Informações da loja */}
        <Motion.div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Store size={16} className="text-primary" />
            <h3 className="font-display text-base font-bold text-text-primary">Informações da loja</h3>
            {restauranteId && (
              <span className="ml-auto text-xs text-text-muted font-semibold">ID: {String(restauranteId).slice(0, 12)}…</span>
            )}
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div>
              <label className={labelCls}>Nome da loja *</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: Pizzaria do João" className={inputCls} />
              {['Minha Loja', 'Meu Restaurante'].includes(String(nome).trim()) && (
                <p className="mt-2 text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  Troque o nome padrão pelo nome real da loja. É esse nome que aparece para o cliente.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>E-mail *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="contato@loja.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Telefone *</label>
                <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)}
                  placeholder="(85) 99999-9999" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Endereço *</label>
              <input type="text" value={endereco} onChange={e => setEndereco(e.target.value)}
                placeholder="Ex: Av. Principal, 123 - Aldeota, Fortaleza" className={inputCls} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <MapPin size={14} className="text-primary" />
                <label className="text-xs font-bold text-text-muted uppercase tracking-wide">Localização da loja</label>
              </div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs text-text-muted font-semibold">Use a localização atual da loja para preencher coordenadas.</p>
                <button type="button" onClick={preencherComLocalizacaoAtual}
                  disabled={buscandoLocalizacao}
                  className="px-3 py-1.5 rounded-lg bg-primary-light text-primary text-xs font-bold border border-primary/20 cursor-pointer disabled:opacity-60">
                  {buscandoLocalizacao ? 'Buscando...' : 'Usar localização atual'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Latitude</label>
                  <input type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)}
                    placeholder="Ex: -3.7319" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Longitude</label>
                  <input type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)}
                    placeholder="Ex: -38.5267" className={inputCls} />
                </div>
              </div>
              <p className="text-xs text-text-muted font-semibold mt-2">Esses valores são salvos no banco e usados no cálculo de rotas/frete.</p>
            </div>
            <div>
              <label className={labelCls}>Categoria *</label>
              <input type="text" value={categoria} onChange={e => setCategoria(e.target.value)}
                placeholder="Ex: Pizzas, Hambúrgueres, Japonesa…" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Pedido mínimo</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pedidoMinimo}
                  onChange={e => setPedidoMinimo(e.target.value)}
                  placeholder="0,00"
                  className={`${inputCls} pl-11`}
                />
              </div>
              <p className="mt-1.5 text-xs font-semibold text-text-muted">
                O cliente só poderá finalizar quando o subtotal alcançar esse valor. Use zero para não exigir mínimo.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Logo da loja</label>
                <input type="text" value={logo} onChange={e => setLogo(e.target.value)}
                  placeholder="URL da logo" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Imagem de capa</label>
                <input type="text" value={capa} onChange={e => setCapa(e.target.value)}
                  placeholder="URL da capa" className={inputCls} />
              </div>
            </div>
          </div>
        </Motion.div>

        {/* Horários */}
        <Motion.div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <h3 className="font-display text-base font-bold text-text-primary">Horário de funcionamento</h3>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div>
              <label className={labelCls}>Dias de funcionamento</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {diasSemana.map(dia => (
                  <button key={dia} onClick={() => toggleDia(dia)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      diasAberto.includes(dia)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-text-secondary border-border hover:border-primary hover:text-primary'
                    }`}>
                    {dia}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Abertura</label>
                <input type="time" value={horarioAbertura} onChange={e => setHorarioAbertura(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Fechamento</label>
                <input type="time" value={horarioFechamento} onChange={e => setHorarioFechamento(e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>
        </Motion.div>

        {/* Formas de pagamento */}
        <Motion.div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <CreditCard size={16} className="text-primary" />
            <h3 className="font-display text-base font-bold text-text-primary">Formas de pagamento aceitas</h3>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {formasPagamentoOpcoes.map(forma => (
                <button key={forma} onClick={() => togglePagamento(forma)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    pagamentos.includes(forma)
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-text-secondary border-border hover:border-accent hover:text-accent'
                  }`}>
                  {forma}
                </button>
              ))}
            </div>
          </div>
        </Motion.div>

        {/* Erro */}
        {erro && (
          <div className="text-red-500 text-sm font-semibold bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            ⚠️ {erro}
          </div>
        )}

        {/* Botão salvar */}
        <Motion.button
          onClick={handleSalvar}
          disabled={salvando || !restauranteId}
          className={`py-3.5 rounded-2xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-60 border-none ${
            salvo ? 'bg-accent text-white' : 'bg-primary text-white hover:bg-primary/90'
          }`}
          whileTap={{ scale: 0.98 }}
        >
          {salvo
            ? <><Check size={16} /> Configurações salvas com sucesso!</>
            : salvando
              ? 'Salvando...'
              : 'Salvar configurações da loja'}
        </Motion.button>
      </div>
    </div>
  )
}
