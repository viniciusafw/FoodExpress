import { useState, useEffect } from 'react'
import { motion as Motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import MobileNavBar from '../components/MobileNavBar'
import api from '../services/api'
import { formatarDataBanco } from '../utils/datas'
import { geocodificarEnderecoCep } from '../utils/localizacao'
import {
  User, Mail, Phone, MapPin, ShoppingBag, Heart,
  ChevronRight, LogOut, Star, Clock, Edit3, Check, X
} from 'lucide-react'

// aqui e o back gelado - pedidos e endereços de cliente devem vir do backend
const statusColor = {
  Entregue: 'text-accent bg-accent/10',
  'Em andamento': 'text-primary bg-primary-light',
  Cancelado: 'text-red-500 bg-red-50',
  entregue: 'text-accent bg-accent/10',
  pendente: 'text-primary bg-primary-light',
  preparando: 'text-primary bg-primary-light',
  pronto: 'text-primary bg-primary-light',
  entregando: 'text-primary bg-primary-light',
  cancelado: 'text-red-500 bg-red-50',
}

const statusLabel = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  pronto: 'Pronto para entrega',
  entregando: 'A caminho',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

function SecaoCard({ titulo, children, delay = 0, id }) {
  return (
    <Motion.div
      id={id}
      className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden scroll-mt-24"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-display text-base font-bold text-text-primary">{titulo}</h3>
      </div>
      {children}
    </Motion.div>
  )
}

function formatarNome(nome = '') {
  return String(nome)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
    .join(' ')
}

function obterIniciais(nome = '') {
  const partes = formatarNome(nome).split(' ').filter(Boolean)
  if (!partes.length) return 'U'
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase()
  return `${partes[0].charAt(0)}${partes[partes.length - 1].charAt(0)}`.toUpperCase()
}

function numeroPedido(id) {
  return `#${String(id || '').replace(/^ped_/, '').slice(-6).toUpperCase()}`
}

function formatarItensPedido(itens) {
  let lista = itens
  if (typeof lista === 'string') {
    try { lista = JSON.parse(lista) } catch { return lista || 'Itens do pedido' }
  }
  if (!Array.isArray(lista) || !lista.length) return 'Itens do pedido'
  return lista.map((item) => {
    const nome = item?.nome || item?.name || item?.titulo || item?.id || 'Item'
    const quantidade = Number(item?.quantidade || item?.qtd || 1)
    return `${quantidade > 1 ? `${quantidade}x ` : ''}${nome}`
  }).join(', ')
}

function formatarCep(valor) {
  const digitos = String(valor || '').replace(/\D/g, '').slice(0, 8)
  if (digitos.length <= 5) return digitos
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`
}

function montarNomeEndereco(dadosCep, cepFormatado) {
  const logradouro = String(dadosCep?.logradouro || '').trim()
  const bairro = String(dadosCep?.bairro || '').trim()
  const cidade = String(dadosCep?.localidade || '').trim()
  const uf = String(dadosCep?.uf || '').trim()

  if (logradouro && bairro) return `${logradouro}, ${bairro}`
  if (logradouro) return logradouro
  if (bairro && cidade) return `${bairro}, ${cidade}`
  if (cidade && uf) return `${cidade}, ${uf}`
  return `CEP ${cepFormatado}`
}

function montarEnderecoCompleto(dados, cepFormatado, numero, complemento) {
  const logradouro = String(dados?.logradouro || '').trim()
  const bairro = String(dados?.bairro || '').trim()
  const cidade = String(dados?.localidade || '').trim()
  const uf = String(dados?.uf || '').trim()
  const partes = [
    [logradouro || `CEP ${cepFormatado}`, numero].filter(Boolean).join(', '),
    complemento,
    bairro,
    cidade && uf ? `${cidade} - ${uf}` : cidade || uf,
  ].filter(Boolean)
  return partes.join(' · ')
}

function textoEnderecoCompleto(endereco) {
  if (!endereco) return ''
  return String(endereco.endereco || endereco.rua || endereco.address || '')
}

function extrairNumeroComplemento(endereco = '') {
  const texto = String(endereco || '').trim()
  if (!texto) return { numero: '', complemento: '' }

  const partes = texto.split('·').map((parte) => parte.trim()).filter(Boolean)
  let numero = ''
  let complemento = ''

  if (partes.length > 0) {
    const primeiro = partes[0]
    const segmentos = primeiro.split(',').map((item) => item.trim()).filter(Boolean)
    if (segmentos.length > 1) {
      const ultimo = segmentos[segmentos.length - 1]
      if (/^\d+[A-Za-z\-\/\s]*$/.test(ultimo)) {
        numero = ultimo
      }
    }
  }

  if (partes.length > 1) {
    const possiveis = partes.slice(1)
    const achado = possiveis.find((parte) => !/^\s*$/.test(parte))
    if (achado) complemento = achado
  }

  return { numero, complemento }
}

function obterChaveEnderecoLabel(email) {
  return `foodexpress:enderecoLabel:${String(email || '').trim().toLowerCase()}`
}

function lerLabelEndereco(email, labelBanco = '') {
  if (labelBanco) return labelBanco
  if (typeof window === 'undefined') return 'Principal'
  const chave = obterChaveEnderecoLabel(email)
  return localStorage.getItem(chave) || localStorage.getItem('enderecoPrincipalLabel') || 'Principal'
}

function salvarLabelEndereco(email, label) {
  if (typeof window === 'undefined' || !label) return
  localStorage.setItem('enderecoPrincipalLabel', label)
  if (email) localStorage.setItem(obterChaveEnderecoLabel(email), label)
}

function EnderecoCepForm({
  clienteId,
  emailUsuario,
  enderecoId,
  enderecoAtual = '',
  labelAtual = '',
  principalAtual = false,
  onSalvo,
  onCancelar,
  modo = 'adicionar',
}) {
  const [cep, setCep] = useState('')
  const [dadosCep, setDadosCep] = useState(null)
  const enderecoOriginal = String(enderecoAtual || '').trim()
  const { numero: numeroInicial, complemento: complementoInicial } = extrairNumeroComplemento(enderecoOriginal)
  const [numero, setNumero] = useState(numeroInicial)
  const [complemento, setComplemento] = useState(complementoInicial)
  const [enderecoLivre, setEnderecoLivre] = useState(enderecoOriginal)
  const [tipoEndereco, setTipoEndereco] = useState(['Casa', 'Trabalho'].includes(labelAtual) ? labelAtual : (modo === 'editar' && labelAtual ? 'Outro' : 'Casa'))
  const [apelidoEndereco, setApelidoEndereco] = useState(['Casa', 'Trabalho'].includes(labelAtual) ? '' : (labelAtual === 'Principal' ? '' : labelAtual))
  const [status, setStatus] = useState('')
  const [salvando, setSalvando] = useState(false)

  const labelFinal = tipoEndereco === 'Outro'
    ? (apelidoEndereco.trim() || 'Outro')
    : tipoEndereco

  const buscarCep = async () => {
    const cepFormatado = formatarCep(cep)
    const digitos = cepFormatado.replace(/\D/g, '')
    if (digitos.length !== 8) {
      setStatus('Digite um CEP válido com 8 números.')
      return
    }
    try {
      setStatus('Buscando endereço pelo CEP...')
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
      const dados = await resposta.json()
      if (!resposta.ok || dados?.erro) {
        setStatus('CEP não encontrado. Confira os números ou consulte nos Correios.')
        return
      }
      setCep(cepFormatado)
      setDadosCep(dados)
      setEnderecoLivre('')
      setStatus('Endereço encontrado. Informe número e complemento, se houver.')
    } catch {
      setStatus('Não foi possível consultar o CEP agora. Tente novamente.')
    }
  }

  const salvar = async () => {
    if (!clienteId) {
      setStatus('Perfil ainda carregando. Tente novamente em instantes.')
      return
    }
    let enderecoFinal = ''
    if (dadosCep) {
      if (!numero.trim()) {
        setStatus('Informe o número do endereço.')
        return
      }
      enderecoFinal = montarEnderecoCompleto(dadosCep, formatarCep(cep), numero.trim(), complemento.trim())
    } else {
      const enderecoLivreTrim = enderecoLivre.trim()
      enderecoFinal = enderecoLivreTrim || (modo === 'editar' ? enderecoOriginal : '')
      if (!enderecoFinal) {
        setStatus('Busque pelo CEP ou informe o endereço completo.')
        return
      }
    }

    setSalvando(true)
    setStatus('')
    try {
      const coordenadas = dadosCep
        ? await geocodificarEnderecoCep(dadosCep, formatarCep(cep), numero.trim())
        : null
      const payload = {
        label: labelFinal,
        principal: principalAtual,
      }
      if (enderecoFinal) payload.endereco = enderecoFinal

      const salvo = modo === 'editar'
        ? await api.clientes.atualizarEndereco(clienteId, enderecoId, payload)
        : await api.clientes.criarEndereco(clienteId, payload)
      if (salvo?.principal || principalAtual) salvarLabelEndereco(emailUsuario, labelFinal)
      if (dadosCep && (salvo?.principal || principalAtual)) {
        const regiao = montarNomeEndereco(dadosCep, formatarCep(cep))
        localStorage.setItem('cep', formatarCep(cep))
        localStorage.setItem('regiao', regiao)
        localStorage.setItem('enderecoCep', JSON.stringify(dadosCep))
        localStorage.setItem('enderecoNumero', numero.trim())
        localStorage.setItem('enderecoComplemento', complemento.trim())
        localStorage.setItem('enderecoEntrega', enderecoFinal)
        if (coordenadas) {
          localStorage.setItem('localizacao', JSON.stringify(coordenadas))
        } else {
          localStorage.removeItem('localizacao')
        }
        window.dispatchEvent(new Event('localizacao-atualizada'))
      }
      onSalvo({
        id: salvo?.id || enderecoId || Date.now(),
        label: salvo?.label || labelFinal,
        endereco: salvo?.endereco || enderecoFinal,
        rua: salvo?.endereco || enderecoFinal,
        bairro: '',
        cidade: '',
        principal: Boolean(salvo?.principal ?? principalAtual),
      })
    } catch (e) {
      setStatus(e.message || 'Não foi possível salvar o endereço.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
          <MapPin size={16} className="text-primary" />
        </div>
        <div>
          <p className="font-display text-sm font-extrabold text-text-primary">
            {modo === 'editar' ? 'Editar endereço' : 'Adicionar novo endereço'}
          </p>
          <p className="text-xs font-semibold text-text-muted">
            Busque pelo CEP e complete com número, apartamento, bloco ou condomínio.
          </p>
        </div>
      </div>

      <div className="mb-3">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-text-muted">Nome do endereço</p>
        <div className="grid grid-cols-3 gap-2">
          {['Casa', 'Trabalho', 'Outro'].map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoEndereco(tipo)}
              className={`h-10 rounded-xl border text-sm font-extrabold transition-all ${
                tipoEndereco === tipo
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-text-secondary hover:border-primary/40'
              }`}
            >
              {tipo}
            </button>
          ))}
        </div>
        {tipoEndereco === 'Outro' && (
          <input
            type="text"
            value={apelidoEndereco}
            onChange={(e) => setApelidoEndereco(e.target.value.replace(/[^\p{L}\p{N}\s'-]/gu, '').slice(0, 24))}
            placeholder="Ex: Faculdade, casa da mãe"
            className="mt-2 w-full h-11 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-text-primary outline-none focus:border-primary"
          />
        )}
      </div>

      {enderecoAtual && !dadosCep && (
        <div className="mb-3 rounded-xl border border-border bg-white px-4 py-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-text-muted mb-1">Endereço atual</p>
          <p className="text-sm font-bold text-text-primary">{enderecoAtual}</p>
        </div>
      )}

      {dadosCep && (
        <div className="mb-3 rounded-xl border border-primary/20 bg-primary-light px-4 py-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-primary mb-1">Endereço encontrado</p>
          <p className="text-sm font-bold text-text-primary">{montarNomeEndereco(dadosCep, formatarCep(cep))}</p>
          <p className="text-xs font-semibold text-text-muted">
            {[dadosCep.localidade, dadosCep.uf].filter(Boolean).join(' - ')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          value={cep}
          onChange={(e) => {
            setCep(formatarCep(e.target.value))
            setDadosCep(null)
          }}
          placeholder="00000-000"
          className="w-full h-12 rounded-xl border border-border bg-white px-4 text-sm font-bold text-text-primary outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={buscarCep}
          className="h-12 rounded-xl bg-primary px-5 text-sm font-extrabold text-white border-none cursor-pointer hover:bg-primary/90"
        >
          Buscar CEP
        </button>
      </div>

      {dadosCep ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[0.8fr_1.2fr]">
          <input
            type="text"
            autoComplete="address-line2"
            value={numero}
            onChange={(e) => setNumero(e.target.value.replace(/[^\p{L}\p{N}\s/-]/gu, '').slice(0, 24))}
            placeholder="Número"
            className="w-full h-12 rounded-xl border border-border bg-white px-4 text-sm font-bold text-text-primary outline-none focus:border-primary"
          />
          <input
            type="text"
            autoComplete="address-line3"
            value={complemento}
            onChange={(e) => setComplemento(e.target.value.slice(0, 80))}
            placeholder="Complemento: apto, bloco, condomínio"
            className="w-full h-12 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-text-primary outline-none focus:border-primary"
          />
        </div>
      ) : (
        <textarea
          value={enderecoLivre}
          onChange={(e) => setEnderecoLivre(e.target.value.slice(0, 160))}
          placeholder="Ou informe o endereço completo"
          className="mt-3 w-full min-h-24 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary outline-none focus:border-primary"
        />
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <a
          href="https://buscacepinter.correios.com.br/app/endereco/index.php"
          target="_blank"
          rel="noreferrer"
          className="text-sm font-bold text-primary hover:underline"
        >
          Não sei meu CEP
        </a>
        {status && <p className="text-xs font-semibold text-text-muted sm:text-right">{status}</p>}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="h-11 rounded-xl bg-primary text-sm font-extrabold text-white border-none cursor-pointer disabled:opacity-60 w-full"
        >
          {salvando ? 'Salvando...' : 'Salvar endereço'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="h-11 rounded-xl border border-border bg-white text-sm font-bold text-text-secondary cursor-pointer hover:bg-surface-2 w-full"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Componente adicionar endereço ─────────────────────────────────────────────
function AdicionarEndereco({ clienteId, emailUsuario, onSalvo }) {
  const [aberto, setAberto] = useState(false)

  if (!aberto) return (
    <button onClick={() => setAberto(true)}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary-light/40 px-4 py-3 text-sm font-extrabold text-primary hover:bg-primary-light cursor-pointer">
      <MapPin size={15} /> Adicionar novo endereço
    </button>
  )
  return (
    <EnderecoCepForm
      clienteId={clienteId}
      emailUsuario={emailUsuario}
      modo="adicionar"
      onCancelar={() => setAberto(false)}
      onSalvo={(endereco) => {
        onSalvo(endereco)
        setAberto(false)
      }}
    />
  )
}

// ── Componente editar endereço ────────────────────────────────────────────────
function EditarEndereco({ end, clienteId, emailUsuario, onSalvo }) {
  const [editando, setEditando] = useState(false)

  if (!editando) return (
    <button onClick={() => setEditando(true)}
      className="shrink-0 rounded-lg border border-border bg-white px-3 py-2 text-xs font-extrabold text-text-secondary shadow-sm transition-colors hover:border-primary hover:text-primary cursor-pointer">
      Editar
    </button>
  )
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="w-full max-w-3xl max-h-[calc(100vh-4rem)] overflow-auto">
        <EnderecoCepForm
          clienteId={clienteId}
          emailUsuario={emailUsuario}
          enderecoId={end.id}
          enderecoAtual={textoEnderecoCompleto(end)}
          labelAtual={end.label}
          principalAtual={end.principal}
          modo="editar"
          onCancelar={() => setEditando(false)}
          onSalvo={(novo) => {
            onSalvo(novo)
            setEditando(false)
          }}
        />
      </div>
    </div>
  )
}

export default function PerfilCliente() {
  const { usuario, sair, atualizarUsuario } = useAuth()
  const navigate = useNavigate()
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(usuario?.nome || 'Usuário')
  const [nomeTemp, setNomeTemp] = useState(nome)
  const [emailPerfil, setEmailPerfil] = useState(usuario?.email || '')
  const [telefonePerfil, setTelefonePerfil] = useState(usuario?.telefone || '')
  const [dadosTemp, setDadosTemp] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    telefone: usuario?.telefone || '',
  })
  const [editandoDados, setEditandoDados] = useState(false)
  const [pedidos, setPedidos] = useState([])
  const [enderecos, setEnderecos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [clienteId, setClienteId] = useState(null)
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [erroNome, setErroNome] = useState('')
  const [erroPerfil, setErroPerfil] = useState('')
  const [tentativaPerfil, setTentativaPerfil] = useState(0)
  const [favoritos, setFavoritos] = useState([])
  const [pedidoParaAvaliar, setPedidoParaAvaliar] = useState(null)
  const [avaliacoesDispensadas, setAvaliacoesDispensadas] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('avaliacoesDispensadas') || '{}')
    } catch {
      return {}
    }
  })

  useEffect(() => {
    const nomeInicial = formatarNome(usuario?.nome || 'Usuário')
    setNome(nomeInicial)
    setNomeTemp(nomeInicial)
  }, [usuario?.nome])

  useEffect(() => {
    const carregarFavoritos = () => {
      try {
        setFavoritos(JSON.parse(localStorage.getItem('favoritosRestaurantes') || '[]'))
      } catch {
        setFavoritos([])
      }
    }
    carregarFavoritos()
    window.addEventListener('favoritos-atualizados', carregarFavoritos)
    return () => window.removeEventListener('favoritos-atualizados', carregarFavoritos)
  }, [])

  useEffect(() => {
    let ativo = true
    let intervalo = null

    const carregarPerfil = async ({ silencioso = false } = {}) => {
      if (!usuario?.id) {
        setCarregando(false)
        return
      }
      if (!silencioso) {
        setCarregando(true)
      }
      try {
        const [pedidosResultado, clienteResultado] = await Promise.allSettled([
          api.pedidos.listar({ clienteId: usuario.id }),
          api.clientes.meuPerfil().catch(async () => {
            try {
              return await api.clientes.cadastrarInicial()
            } catch {
              throw new Error('Não foi possível carregar os dados pessoais.')
            }
          }),
        ])

        if (!ativo) return

        const listaPedidos = pedidosResultado.status === 'fulfilled' ? pedidosResultado.value : []
        const cliente = clienteResultado.status === 'fulfilled' ? clienteResultado.value : null
        setPedidos(Array.isArray(listaPedidos) ? listaPedidos : [])
        setErroPerfil(
          pedidosResultado.status === 'rejected' || clienteResultado.status === 'rejected'
            ? 'Parte do perfil não pôde ser carregada. Tente novamente.'
            : ''
        )

        if (cliente?.id) setClienteId(cliente.id)
        if (cliente?.nome) {
          const nomeBackend = formatarNome(cliente.nome)
          setNome(nomeBackend)
          setNomeTemp(nomeBackend)
        }
        if (cliente?.email) setEmailPerfil(cliente.email)
        if (cliente?.telefone) setTelefonePerfil(cliente.telefone)
        if (cliente) {
          setDadosTemp({
            nome: formatarNome(cliente.nome || usuario?.nome || ''),
            email: cliente.email || usuario?.email || '',
            telefone: cliente.telefone || usuario?.telefone || '',
          })
        }

        let enderecosBanco = []
        if (cliente?.id) {
          try {
            enderecosBanco = await api.clientes.listarEnderecos(cliente.id)
          } catch {
            enderecosBanco = []
          }
        }

        if (Array.isArray(enderecosBanco) && enderecosBanco.length) {
          setEnderecos(enderecosBanco.map(endereco => ({
            id: endereco.id,
            label: endereco.label || 'Endereço',
            endereco: endereco.endereco,
            rua: endereco.endereco,
            bairro: '',
            cidade: '',
            principal: Boolean(endereco.principal),
          })))
        } else if (cliente?.endereco_principal) {
          const emailEndereco = cliente?.email || usuario?.email
          setEnderecos([{
            id: 'principal',
            label: lerLabelEndereco(emailEndereco, cliente?.endereco_label),
            endereco: cliente.endereco_principal,
            rua: cliente.endereco_principal,
            bairro: '',
            cidade: '',
            principal: true,
          }])
        } else {
          setEnderecos([])
        }
      } catch (err) {
        console.warn('Erro ao carregar perfil:', err)
        if (ativo) setErroPerfil(err.message || 'Não foi possível carregar seu perfil.')
      } finally {
        if (ativo && !silencioso) setCarregando(false)
      }
    }

    carregarPerfil()
    intervalo = setInterval(() => carregarPerfil({ silencioso: true }), 12000)

    const atualizarAoVoltar = () => {
      if (document.visibilityState === 'visible') carregarPerfil({ silencioso: true })
    }
    document.addEventListener('visibilitychange', atualizarAoVoltar)

    return () => {
      ativo = false
      if (intervalo) clearInterval(intervalo)
      document.removeEventListener('visibilitychange', atualizarAoVoltar)
    }
  }, [usuario?.id, usuario?.email, tentativaPerfil])

  useEffect(() => {
    const pendente = pedidos.find((pedido) => {
      const entregue = String(pedido.status || '').toLowerCase() === 'entregue'
      const restauranteAvaliado = Boolean(pedido.avaliacao_restaurante || pedido.avaliacao)
      return entregue && !restauranteAvaliado && !avaliacoesDispensadas[pedido.id]
    })

    setPedidoParaAvaliar(pendente || null)
  }, [pedidos, avaliacoesDispensadas])

  const dispensarAvaliacao = (pedidoId) => {
    const proximas = { ...avaliacoesDispensadas, [pedidoId]: true }
    setAvaliacoesDispensadas(proximas)
    sessionStorage.setItem('avaliacoesDispensadas', JSON.stringify(proximas))
    setPedidoParaAvaliar(null)
  }

  const salvarNome = async () => {
    const nomeFinal = formatarNome(nomeTemp)
    if (!nomeFinal || !/^[\p{L}\s'-]+$/u.test(nomeFinal)) {
      setErroNome('O nome deve conter somente letras.')
      return
    }
    if (!clienteId) {
      setErroNome('Seu perfil ainda está carregando. Tente novamente.')
      return
    }
    setSalvandoNome(true)
    setErroNome('')
    try {
      await api.clientes.atualizar(clienteId, { nome: nomeFinal })
      setNome(nomeFinal)
      atualizarUsuario({ nome: nomeFinal })
      setEditando(false)
    } catch (error) {
      setErroNome(error.message || 'Não foi possível salvar seu nome.')
    } finally {
      setSalvandoNome(false)
    }
  }

  const salvarDadosPessoais = async () => {
    const nomeFinal = formatarNome(dadosTemp.nome)
    const emailFinal = String(dadosTemp.email || '').trim().toLowerCase()
    const telefoneFinal = String(dadosTemp.telefone || '').trim()
    if (!nomeFinal || !/^[\p{L}\s'-]+$/u.test(nomeFinal)) {
      setErroNome('O nome deve conter somente letras.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFinal)) {
      setErroNome('Informe um e-mail válido.')
      return
    }
    if (telefoneFinal.replace(/\D/g, '').length < 10) {
      setErroNome('Informe um telefone válido.')
      return
    }
    if (!clienteId) {
      setErroNome('Seu perfil ainda está carregando. Tente novamente.')
      return
    }

    setSalvandoNome(true)
    setErroNome('')
    try {
      await api.clientes.atualizar(clienteId, {
        nome: nomeFinal,
        email: emailFinal,
        telefone: telefoneFinal,
      })
      setNome(nomeFinal)
      setNomeTemp(nomeFinal)
      setEmailPerfil(emailFinal)
      setTelefonePerfil(telefoneFinal)
      atualizarUsuario({ nome: nomeFinal, email: emailFinal, telefone: telefoneFinal })
      setEditandoDados(false)
    } catch (error) {
      setErroNome(error.message || 'Não foi possível salvar seus dados.')
    } finally {
      setSalvandoNome(false)
    }
  }

  const pedidosFormatados = pedidos.map((pedido) => {
    let itensTexto = 'Itens do pedido'
    try {
      const itens = typeof pedido.itens === 'string' ? JSON.parse(pedido.itens) : pedido.itens
      if (Array.isArray(itens) && itens.length) {
        itensTexto = `${itens.length} item(ns)`
      }
    } catch {}

    return {
      id: pedido.id,
      numero: numeroPedido(pedido.id),
      loja: pedido.loja || pedido.restaurante_nome || `Pedido ${numeroPedido(pedido.id)}`,
      status: statusLabel[pedido.status] || pedido.status || 'Em andamento',
      statusOriginal: pedido.status || '',
      itens: pedido.itens_texto || formatarItensPedido(pedido.itens) || itensTexto,
      data: pedido.created_at ? formatarDataBanco(pedido.created_at) : '—',
      total: Number(pedido.total || 0),
      avaliacao: pedido.avaliacao || pedido.avaliacao_restaurante || 0,
      emoji: '🛍️',
    }
  })
  const iniciaisUsuario = obterIniciais(nome)
  const fotoUsuario = usuario?.fotoUrl || usuario?.avatarUrl || ''

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <Header />

      {pedidoParaAvaliar && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:px-4">
          <Motion.div
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-white p-6 shadow-xl sm:rounded-2xl"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            drag={typeof window !== 'undefined' && window.innerWidth < 640 ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 650) dispensarAvaliacao(pedidoParaAvaliar.id)
            }}
          >
            <div className="-mt-2 mb-4 flex justify-center sm:hidden">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
                <Star size={24} className="text-accent" fill="#FFBA08" stroke="#FFBA08" />
              </div>
              <button
                type="button"
                onClick={() => dispensarAvaliacao(pedidoParaAvaliar.id)}
                className="w-9 h-9 rounded-full border border-border bg-white flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
                aria-label="Fechar avaliação"
              >
                <X size={16} />
              </button>
            </div>

            <h2 className="font-display text-xl font-extrabold text-text-primary mb-2">Pedido entregue!</h2>
            <p className="text-sm text-text-secondary font-semibold mb-5">
              Avalie sua experiência com {pedidoParaAvaliar.restaurante_nome || 'o restaurante'} e a entrega.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => navigate(`/pedido/${pedidoParaAvaliar.id}`)}
                className="flex-1 rounded-full bg-primary text-white px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors border-none cursor-pointer"
              >
                Avaliar agora
              </button>
              <button
                type="button"
                onClick={() => dispensarAvaliacao(pedidoParaAvaliar.id)}
                className="flex-1 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-bold text-text-secondary hover:bg-surface-2 transition-colors cursor-pointer"
              >
                Agora não
              </button>
            </div>
          </Motion.div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-6">
        {erroPerfil && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-red-600">{erroPerfil}</p>
            <button
              type="button"
              onClick={() => setTentativaPerfil(valor => valor + 1)}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white border-none"
            >
              Tentar novamente
            </button>
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── Coluna esquerda — Info do usuário ── */}
          <div className="w-full lg:w-72 flex flex-col gap-4 lg:sticky lg:top-24">

            {/* Avatar + nome */}
            <Motion.div
              className="bg-white rounded-2xl border border-border shadow-sm p-6 text-center"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="relative inline-block mb-4">
                {fotoUsuario ? (
                  <div className="w-20 h-20 rounded-full bg-white border border-border shadow-sm flex items-center justify-center mx-auto overflow-hidden">
                    <img src={fotoUsuario} alt={nome} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-extrabold font-display mx-auto">
                    {iniciaisUsuario}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-accent rounded-full border-2 border-white flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              </div>

              {editando ? (
                <div className="flex items-center gap-2 justify-center mb-1">
                  <input
                    value={nomeTemp} onChange={e => setNomeTemp(e.target.value.replace(/[^\p{L}\s'-]/gu, ''))}
                    className="border border-border rounded-lg px-2 py-1 text-sm font-bold text-center outline-none focus:border-primary w-36"
                    autoFocus
                  />
                  <button onClick={salvarNome} disabled={salvandoNome}
                    className="w-7 h-7 bg-accent rounded-full flex items-center justify-center border-none cursor-pointer disabled:opacity-60">
                    <Check size={13} className="text-white" />
                  </button>
                  <button onClick={() => { setNomeTemp(nome); setEditando(false) }}
                    className="w-7 h-7 bg-surface-2 border border-border rounded-full flex items-center justify-center cursor-pointer">
                    <X size={13} className="text-text-muted" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h2 className="font-display text-lg font-extrabold text-text-primary">{nome}</h2>
                  <button onClick={() => setEditando(true)}
                    className="text-text-muted hover:text-primary transition-colors bg-transparent border-none cursor-pointer">
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
              {erroNome && <p className="mb-2 text-xs font-bold text-red-500">{erroNome}</p>}

              <p className="text-sm text-text-muted font-semibold mb-4">{usuario?.email || 'Sem e-mail'}</p>

              <div className="grid grid-cols-3 gap-2 text-center border-t border-border pt-4">
                {[
                  { label: 'Pedidos', valor: pedidos.length },
                  { label: 'Avaliações', valor: pedidos.filter(p => p.avaliacao_restaurante).length },
                  { label: 'Favoritos', valor: favoritos.length },
                ].map(({ label, valor }) => (
                  <div key={label}>
                    <span className="block font-display text-xl font-extrabold text-text-primary">{valor}</span>
                    <span className="text-xs text-text-muted font-semibold">{label}</span>
                  </div>
                ))}
              </div>
            </Motion.div>

            {/* Menu lateral */}
            <Motion.div
              className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden scroll-mt-24"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {[
                { icon: ShoppingBag, label: 'Meus pedidos', target: 'pedidos' },
                { icon: MapPin, label: 'Endereços salvos', target: 'enderecos' },
                { icon: Heart, label: 'Favoritos', target: 'favoritos' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if (!item.target) return
                      const el = document.getElementById(item.target)
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }}
                    className="flex items-center justify-between px-5 py-3.5 border-b border-border last:border-none hover:bg-surface-2 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Icon size={16} className="text-text-muted group-hover:text-primary transition-colors" />
                      <span className="text-sm font-semibold text-text-primary">{item.label}</span>
                    </div>
                    <ChevronRight size={14} className="text-text-muted" />
                  </button>
                )
              })}
              <button
                onClick={sair}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-red-50 transition-colors cursor-pointer bg-transparent border-none text-left"
              >
                <LogOut size={16} className="text-red-400" />
                <span className="text-sm font-semibold text-red-400">Sair da conta</span>
              </button>
            </Motion.div>
          </div>

          {/* ── Coluna direita ── */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">

            {/* Dados pessoais */}
            <SecaoCard titulo="Dados pessoais" delay={0.15}>
              <div className="p-5">
                {editandoDados ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-extrabold uppercase text-text-muted">Nome *</span>
                      <input
                        value={dadosTemp.nome}
                        onChange={e => setDadosTemp(prev => ({ ...prev, nome: e.target.value.replace(/[^\p{L}\s'-]/gu, '') }))}
                        className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm font-semibold text-text-primary outline-none focus:border-primary"
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-extrabold uppercase text-text-muted">E-mail *</span>
                      <input
                        type="email"
                        value={dadosTemp.email}
                        onChange={e => setDadosTemp(prev => ({ ...prev, email: e.target.value }))}
                        className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm font-semibold text-text-primary outline-none focus:border-primary"
                      />
                    </label>
                    <label>
                      <span className="mb-1.5 block text-xs font-extrabold uppercase text-text-muted">Telefone *</span>
                      <input
                        type="tel"
                        value={dadosTemp.telefone}
                        onChange={e => setDadosTemp(prev => ({ ...prev, telefone: e.target.value }))}
                        className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm font-semibold text-text-primary outline-none focus:border-primary"
                      />
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <button type="button" onClick={salvarDadosPessoais} disabled={salvandoNome}
                        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white border-none disabled:opacity-60">
                        {salvandoNome ? 'Salvando...' : 'Salvar dados'}
                      </button>
                      <button type="button" onClick={() => setEditandoDados(false)}
                        className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-secondary">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setDadosTemp({ nome, email: emailPerfil, telefone: telefonePerfil })
                          setEditandoDados(true)
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs font-extrabold text-text-secondary hover:border-primary hover:text-primary"
                      >
                        <Edit3 size={14} /> Editar dados
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {[
                        { Icon: User, label: 'Nome', valor: nome },
                        { Icon: Mail, label: 'E-mail', valor: emailPerfil || '—' },
                        { Icon: Phone, label: 'Telefone', valor: telefonePerfil || 'Não informado' },
                      ].map((item) => {
                        const Icon = item.Icon
                        return (
                          <div key={item.label} className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0 mt-0.5">
                              <Icon size={15} className="text-text-muted" />
                            </div>
                            <div>
                              <p className="text-xs font-extrabold text-text-muted uppercase tracking-wide mb-0.5">{item.label}</p>
                              <p className="break-all text-sm font-semibold text-text-primary">{item.valor}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
                {erroNome && <p className="mt-3 text-xs font-bold text-red-500">{erroNome}</p>}
              </div>
            </SecaoCard>

            {/* Pedidos recentes */}
            <SecaoCard titulo="Pedidos recentes" delay={0.2} id="pedidos">
              <div className="divide-y divide-border">
                {carregando && (
                  <div className="px-5 py-6 text-sm text-text-muted font-semibold">Carregando pedidos...</div>
                )}
                {!carregando && pedidosFormatados.length === 0 && (
                  <div className="px-5 py-6 text-sm text-text-muted font-semibold">
                    Você ainda não fez pedidos.
                  </div>
                )}
                {pedidosFormatados.map((pedido, i) => (
                  <Motion.div key={pedido.id}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-surface-2 transition-colors cursor-pointer sm:gap-4 sm:px-5"
                    onClick={() => navigate(`/pedido/${pedido.id}`)}
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.07 }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center text-2xl shrink-0">
                      {pedido.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="max-w-full truncate font-display text-sm font-bold text-text-primary">{pedido.loja}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor[pedido.statusOriginal] || statusColor[pedido.status] || 'text-text-secondary bg-surface-2'}`}>{pedido.status}</span>
                      </div>
                      <p className="text-xs text-text-muted font-semibold truncate">{pedido.itens}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-text-muted flex items-center gap-1"><Clock size={10} />{pedido.data}</span>
                        <span className="font-display text-sm font-extrabold text-accent">R$ {Number(pedido.total || 0).toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                    {pedido.avaliacao ? (
                      <div className="hidden items-center gap-0.5 shrink-0 sm:flex">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} size={12} fill={j < pedido.avaliacao ? '#FFBA08' : 'none'} stroke={j < pedido.avaliacao ? '#FFBA08' : '#ccc'} />
                        ))}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); navigate(`/pedido/${pedido.id}`) }}
                        className="shrink-0 rounded-lg border border-primary bg-transparent px-2.5 py-2 text-xs font-bold text-primary transition-all hover:bg-primary-light"
                      >
                        {String(pedido.statusOriginal).toLowerCase() === 'entregue' ? 'Avaliar' : 'Ver pedido'}
                      </button>
                    )}
                  </Motion.div>
                ))}
              </div>
            </SecaoCard>

            {/* Endereços */}
            <SecaoCard titulo="Endereços salvos" delay={0.3} id="enderecos">
              <div className="divide-y divide-border">
                {carregando && (
                  <div className="px-5 py-6 text-sm text-text-muted font-semibold">Carregando endereços...</div>
                )}
                {!carregando && enderecos.length === 0 && (
                  <div className="px-5 py-6 text-sm text-text-muted font-semibold">
                    Nenhum endereço salvo ainda.
                  </div>
                )}
                {enderecos.map((end) => (
                  <div key={end.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin size={15} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-display text-sm font-bold text-text-primary">{end.label}</span>
                        {end.principal && (
                          <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">Principal</span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary font-medium">
                        {[textoEnderecoCompleto(end), end.bairro].filter(Boolean).join(', ') || 'Endereço não informado'}
                      </p>
                      {end.cidade && <p className="text-xs text-text-muted font-medium">{end.cidade}</p>}
                    </div>
                    <EditarEndereco
                      end={end}
                      clienteId={clienteId}
                      emailUsuario={usuario?.email}
                      onSalvo={(novo) => setEnderecos(prev => prev.map(e => e.id === end.id ? { ...e, ...novo, id: e.id, principal: e.principal } : e))}
                    />
                  </div>
                ))}
                <div className="px-5 py-4">
                  <AdicionarEndereco
                    clienteId={clienteId}
                    emailUsuario={usuario?.email}
                    onSalvo={(end) => setEnderecos(prev => [...prev, end])}
                  />
                </div>
              </div>
            </SecaoCard>

            {/* Favoritos */}
            <SecaoCard titulo="Favoritos" delay={0.35} id="favoritos">
              <div className="divide-y divide-border">
                {favoritos.length === 0 && (
                  <div className="px-5 py-6 text-sm text-text-muted font-semibold">
                    Nenhum restaurante favoritado. Toque no coração de uma loja para salvar aqui.
                  </div>
                )}
                {favoritos.map((fav) => (
                  <button
                    key={fav.id}
                    type="button"
                    onClick={() => navigate(`/loja/${fav.id}`)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-2 transition-colors cursor-pointer bg-transparent border-none text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                      {fav.imagem ? <img src={fav.imagem} alt={fav.nome} className="w-full h-full object-cover" /> : (fav.emoji || '🍽️')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm font-bold text-text-primary truncate">{fav.nome}</p>
                      <p className="text-xs text-text-muted font-semibold truncate">{fav.categoria || 'Restaurante'}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-extrabold text-text-primary shrink-0">
                      <Star size={12} fill="#FFBA08" stroke="#FFBA08" />{fav.avaliacao || '—'}
                    </div>
                  </button>
                ))}
              </div>
            </SecaoCard>
          </div>
        </div>
      </main>

      <MobileNavBar />
    </div>
  )
}
