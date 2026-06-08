import { useState } from 'react'
import { mascaraTelefone } from '../utils/mascaras'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Phone, ArrowLeft, User, MapPin, LocateFixed, Search, ChevronRight, Check } from 'lucide-react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import logoSrc from '../imgs/Logo-site.png'
import CampoSenhaForte from '../components/CampoSenhaForte'
import { senhaForteValida } from '../utils/senha'
import { geocodificarEnderecoCep } from '../utils/localizacao'

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
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

function obterChaveEnderecoLabel(email) {
  return `foodexpress:enderecoLabel:${String(email || '').trim().toLowerCase()}`
}

export default function CadastroUsuario() {
  const [passo, setPasso] = useState(1)
  const [dados, setDados] = useState({
    nome: '',
    telefone: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    cep: '',
    numero: '',
    complemento: '',
    endereco: '',
    tipoEndereco: 'Casa',
    apelidoEndereco: '',
    latitude: null,
    longitude: null,
  })
  const [dadosCep, setDadosCep] = useState(null)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [buscandoLocalizacao, setBuscandoLocalizacao] = useState(false)
  const [modoCep, setModoCep] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [erro, setErro] = useState('')
  const { cadastrarCliente, aplicarSessao } = useAuth()
  const navigate = useNavigate()

  const inputClass = 'w-full pl-10 pr-4 py-3.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-surface-2 outline-none transition-all focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(255,107,53,0.08)] placeholder:text-text-muted placeholder:font-normal'
  const labelClass = 'text-xs font-extrabold text-text-secondary uppercase tracking-wide'

  const setCampo = (name, value) => setDados(prev => ({ ...prev, [name]: value }))

  const obterLabelEndereco = () => {
    if (dados.tipoEndereco === 'Outro') return dados.apelidoEndereco.trim() || 'Outro'
    return dados.tipoEndereco
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    let valor = value
    if (name === 'telefone') valor = mascaraTelefone(value)
    if (name === 'nome') valor = value.replace(/[^\p{L}\s'-]/gu, '').slice(0, 100)
    if (name === 'cep') {
      valor = formatarCep(value)
      setDadosCep(null)
    }
    setDados(prev => ({ ...prev, [name]: valor }))
  }

  const validarPasso1 = () => {
    if (!dados.nome.trim()) return 'Informe seu nome.'
    if (!/^[\p{L}\s'-]+$/u.test(dados.nome.trim())) return 'O nome deve conter somente letras.'
    if (dados.telefone.replace(/\D/g, '').length < 10) return 'Informe um telefone válido.'
    return ''
  }

  const validarPasso2 = () => {
    if (dados.latitude && dados.longitude) return ''
    if (dados.endereco.trim()) return ''
    return 'Informe sua localização ou endereço por CEP.'
  }

  const irProximo = (e) => {
    e.preventDefault()
    const mensagem = passo === 1 ? validarPasso1() : validarPasso2()
    if (mensagem) {
      setErro(mensagem)
      return
    }
    setErro('')
    setPasso(p => Math.min(p + 1, 3))
  }

  const buscarCep = async (e) => {
    e?.preventDefault()
    const cepFormatado = formatarCep(dados.cep)
    const digitos = cepFormatado.replace(/\D/g, '')
    if (digitos.length !== 8) {
      setErro('Digite um CEP válido com 8 números.')
      return
    }

    setBuscandoCep(true)
    setErro('')
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
      const cepData = await resposta.json()
      if (!resposta.ok || cepData?.erro) {
        setErro('CEP não encontrado. Confira os números ou consulte nos Correios.')
        return
      }
      setDadosCep(cepData)
      setDados(prev => ({
        ...prev,
        cep: cepFormatado,
        endereco: '',
        latitude: null,
        longitude: null,
      }))
    } catch {
      setErro('Não foi possível consultar o CEP agora. Tente novamente ou consulte nos Correios.')
    } finally {
      setBuscandoCep(false)
    }
  }

  const confirmarCep = async () => {
    if (!dadosCep) return
    if (!dados.numero.trim()) {
      setErro('Informe o número do endereço.')
      return
    }
    const endereco = montarEnderecoCompleto(dadosCep, formatarCep(dados.cep), dados.numero.trim(), dados.complemento.trim())
    const regiao = montarNomeEndereco(dadosCep, formatarCep(dados.cep))
    const coordenadas = await geocodificarEnderecoCep(dadosCep, formatarCep(dados.cep), dados.numero.trim())
    setDados(prev => ({
      ...prev,
      endereco,
      latitude: coordenadas?.latitude ?? null,
      longitude: coordenadas?.longitude ?? null,
    }))
    localStorage.setItem('cep', formatarCep(dados.cep))
    localStorage.setItem('regiao', regiao)
    localStorage.setItem('enderecoCep', JSON.stringify(dadosCep))
    localStorage.setItem('enderecoNumero', dados.numero.trim())
    localStorage.setItem('enderecoComplemento', dados.complemento.trim())
    localStorage.setItem('enderecoEntrega', endereco)
    localStorage.setItem('enderecoPrincipalLabel', obterLabelEndereco())
    if (coordenadas) {
      localStorage.setItem('localizacao', JSON.stringify(coordenadas))
    } else {
      localStorage.removeItem('localizacao')
    }
    window.dispatchEvent(new Event('localizacao-atualizada'))
    setErro('')
  }

  const usarLocalizacao = () => {
    if (!navigator.geolocation) {
      setModoCep(true)
      setErro('Não foi possível acessar a localização neste navegador. Informe seu CEP.')
      return
    }

    setBuscandoLocalizacao(true)
    setErro('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const endereco = `Localização atual (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`
        setDados(prev => ({ ...prev, latitude, longitude, endereco }))
        localStorage.setItem('localizacao', JSON.stringify({ latitude, longitude }))
        localStorage.setItem('regiao', 'Sua região')
        localStorage.setItem('enderecoPrincipalLabel', obterLabelEndereco())
        localStorage.removeItem('cep')
        localStorage.removeItem('enderecoCep')
        localStorage.removeItem('enderecoNumero')
        localStorage.removeItem('enderecoComplemento')
        localStorage.removeItem('enderecoEntrega')
        window.dispatchEvent(new Event('localizacao-atualizada'))
        setModoCep(false)
        setBuscandoLocalizacao(false)
      },
      (err) => {
        setModoCep(true)
        setBuscandoLocalizacao(false)
        setErro(err.code === 1
          ? 'Permissão de localização negada. Informe seu CEP para continuar.'
          : 'Não foi possível obter sua localização. Informe seu CEP para continuar.'
        )
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleEnviar = async (e) => {
    e.preventDefault()
    if (!aceitouTermos) return
    if (!dados.email.trim()) {
      setErro('Informe seu e-mail.')
      return
    }
    if (!senhaForteValida(dados.senha, dados.confirmarSenha)) {
      setErro('Confira os requisitos da senha antes de continuar.')
      return
    }

    setCarregando(true)
    setErro('')
    try {
      const resposta = await cadastrarCliente({
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        senha: dados.senha,
        endereco: dados.endereco,
        endereco_label: obterLabelEndereco(),
        latitude: dados.latitude,
        longitude: dados.longitude,
      })
      localStorage.setItem('enderecoPrincipalLabel', obterLabelEndereco())
      localStorage.setItem(obterChaveEnderecoLabel(dados.email), obterLabelEndereco())
      aplicarSessao(resposta.token, resposta.usuario)
    } catch (err) {
      console.error(err)
      setErro(err?.message || 'Não foi possível criar sua conta.')
    } finally {
      setCarregando(false)
    }
  }

  const passos = ['Dados', 'Endereço', 'Acesso']

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-center items-start p-12 xl:p-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#FF6B35 0%,#e55a2b 50%,#2E294E 100%)' }}>
        <div className="absolute top-[80px] right-[80px] w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[60px] left-[60px] w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)' }} />

        <button onClick={() => navigate('/')} className="absolute top-6 left-11 text-white/80 hover:text-white transition-colors flex items-center gap-1">
          <img src={logoSrc} alt="FoodExpress" className="h-16 w-auto mb-12" />
        </button>

        <Motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Crie sua conta<br />no <span className="text-yellow-300">FoodExpress</span>
          </h1>
          <p className="text-white/75 text-base font-medium leading-relaxed max-w-85">
            A gente pede uma coisa por vez para deixar seu cadastro mais simples.
          </p>
        </Motion.div>
      </div>

      <div className="flex items-center justify-center p-4 sm:p-8 bg-surface-2 min-h-screen lg:min-h-0">
        <Motion.div
          className="bg-white rounded-3xl shadow-2xl border border-border p-7 sm:p-10 w-full max-w-[26rem]"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          <div className="lg:hidden flex justify-center mb-7">
            <img src={logoSrc} alt="FoodExpress" className="h-11 w-auto" />
          </div>

          <button onClick={() => passo === 1 ? navigate('/login') : setPasso(p => p - 1)}
            className="flex items-center gap-1.5 text-text-muted text-sm font-bold bg-transparent border-none cursor-pointer mb-6 hover:text-text-primary transition-colors">
            <ArrowLeft size={15} /> {passo === 1 ? 'Voltar para login' : 'Voltar'}
          </button>

          <div className="flex items-center gap-2 mb-6">
            {passos.map((label, index) => {
              const numero = index + 1
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 transition-all ${numero <= passo ? 'bg-primary text-white' : 'bg-surface-2 border border-border text-text-muted'}`}>
                    {numero < passo ? <Check size={13} /> : numero}
                  </div>
                  <span className={`text-xs font-bold hidden sm:block ${numero <= passo ? 'text-primary' : 'text-text-muted'}`}>{label}</span>
                  {numero < passos.length && <div className={`flex-1 h-0.5 rounded-full ${passo > numero ? 'bg-primary' : 'bg-border'}`} />}
                </div>
              )
            })}
          </div>

          <h2 className="font-display text-2xl font-extrabold text-text-primary mb-1 tracking-tight">
            {passo === 1 ? 'Seus dados' : passo === 2 ? 'Onde entregar?' : 'Dados de acesso'}
          </h2>
          <p className="text-sm text-text-muted font-semibold mb-5">
            {passo === 1
              ? 'Comece com nome e telefone.'
              : passo === 2
                ? 'Use localização ou informe seu CEP.'
                : 'Finalize com e-mail, senha e aceite dos termos.'}
          </p>

          {erro && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {erro}
            </div>
          )}

          <AnimatePresence mode="wait">
            {passo === 1 && (
              <Motion.form key="passo-1" onSubmit={irProximo} className="flex flex-col gap-4"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Motion.div className="flex flex-col gap-1.5" variants={itemVariants} initial="hidden" animate="show">
                  <label className={labelClass}>Seu nome *</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input name="nome" type="text" placeholder="Como podemos te chamar?"
                      value={dados.nome} onChange={handleChange} required className={inputClass} />
                  </div>
                </Motion.div>

                <Motion.div className="flex flex-col gap-1.5" variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.08 }}>
                  <label className={labelClass}>WhatsApp / Telefone *</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input name="telefone" type="tel" placeholder="(85) 99999-9999"
                      value={dados.telefone} onChange={handleChange} required className={inputClass} />
                  </div>
                </Motion.div>

                <Motion.button type="submit"
                  className="w-full py-4 bg-primary text-white border-none rounded-xl font-display font-bold text-base cursor-pointer flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(255,107,53,0.35)' }}
                  whileTap={{ scale: 0.98 }}>
                  Continuar <ChevronRight size={17} />
                </Motion.button>
              </Motion.form>
            )}

            {passo === 2 && (
              <Motion.form key="passo-2" onSubmit={irProximo} className="flex flex-col gap-4"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex flex-col gap-2">
                  <span className={labelClass}>Nome do endereço *</span>
                  <div className="grid grid-cols-3 gap-2">
                    {['Casa', 'Trabalho', 'Outro'].map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setCampo('tipoEndereco', tipo)}
                        className={`h-10 rounded-xl border text-sm font-extrabold transition-all ${
                          dados.tipoEndereco === tipo
                            ? 'border-primary bg-primary text-white'
                            : 'border-border bg-white text-text-secondary hover:border-primary/40'
                        }`}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                  {dados.tipoEndereco === 'Outro' && (
                    <input
                      type="text"
                      value={dados.apelidoEndereco}
                      onChange={(e) => setCampo('apelidoEndereco', e.target.value.replace(/[^\p{L}\p{N}\s'-]/gu, '').slice(0, 24))}
                      placeholder="Ex: Faculdade, casa da mãe"
                      className="w-full px-4 py-3 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary"
                    />
                  )}
                </div>

                {dados.endereco && (
                  <div className="rounded-xl border border-primary/20 bg-primary-light px-4 py-3">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-primary mb-1">{obterLabelEndereco()}</p>
                    <p className="text-sm font-bold text-text-primary">{dados.endereco}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={usarLocalizacao}
                  disabled={buscandoLocalizacao}
                  className="w-full py-4 border border-primary/25 bg-primary-light text-primary rounded-xl font-display font-bold text-base cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <LocateFixed size={17} /> {buscandoLocalizacao ? 'Buscando localização...' : 'Usar minha localização'}
                </button>

                <button
                  type="button"
                  onClick={() => setModoCep(true)}
                  className="w-full py-3.5 border border-border bg-white text-text-secondary rounded-xl font-bold text-sm cursor-pointer flex items-center justify-center gap-2 hover:border-primary/40"
                >
                  <MapPin size={16} /> Informar CEP manualmente
                </button>

                {modoCep && (
                  <div className="rounded-2xl border border-border bg-surface-2 p-4 flex flex-col gap-3">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <div className="relative">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        <input name="cep" type="text" inputMode="numeric" placeholder="00000-000"
                          value={dados.cep} onChange={handleChange}
                          className={inputClass} />
                      </div>
                      <button type="button" onClick={buscarCep}
                        disabled={buscandoCep}
                        className="px-4 rounded-xl bg-primary text-white text-sm font-bold border-none cursor-pointer disabled:opacity-60">
                        {buscandoCep ? '...' : 'Buscar'}
                      </button>
                    </div>

                    {dadosCep && (
                      <>
                        <div className="rounded-xl border border-border bg-white px-3 py-2">
                          <p className="text-xs font-extrabold uppercase tracking-wide text-text-muted mb-0.5">Rua encontrada</p>
                          <p className="text-sm font-bold text-text-primary">{montarNomeEndereco(dadosCep, formatarCep(dados.cep))}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-[0.8fr_1.2fr] gap-2">
                          <input type="text" placeholder="Número"
                            value={dados.numero}
                            onChange={e => setCampo('numero', e.target.value.replace(/[^\p{L}\p{N}\s/-]/gu, '').slice(0, 24))}
                            className="w-full px-4 py-3.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary" />
                          <input type="text" placeholder="Complemento: apto, bloco, condomínio"
                            value={dados.complemento}
                            onChange={e => setCampo('complemento', e.target.value.slice(0, 80))}
                            className="w-full px-4 py-3.5 border border-border rounded-xl text-sm font-semibold text-text-primary bg-white outline-none focus:border-primary" />
                        </div>

                        <button type="button" onClick={confirmarCep}
                          className="w-full py-3 bg-white border border-primary/25 text-primary rounded-xl text-sm font-bold cursor-pointer">
                          Confirmar endereço
                        </button>
                      </>
                    )}

                    <a href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                      target="_blank" rel="noreferrer"
                      className="text-xs font-bold text-primary hover:underline">
                      Não sei meu CEP
                    </a>
                  </div>
                )}

                <Motion.button type="submit"
                  className="w-full py-4 bg-primary text-white border-none rounded-xl font-display font-bold text-base cursor-pointer flex items-center justify-center gap-2 disabled:bg-border disabled:text-text-muted disabled:cursor-not-allowed"
                  disabled={!dados.endereco}
                  whileHover={dados.endereco ? { scale: 1.02, boxShadow: '0 4px 20px rgba(255,107,53,0.35)' } : {}}
                  whileTap={dados.endereco ? { scale: 0.98 } : {}}>
                  Continuar <ChevronRight size={17} />
                </Motion.button>
              </Motion.form>
            )}

            {passo === 3 && (
              <Motion.form key="passo-3" onSubmit={handleEnviar} className="flex flex-col gap-4"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <Motion.div className="flex flex-col gap-1.5" variants={itemVariants} initial="hidden" animate="show">
                  <label className={labelClass}>E-mail *</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input name="email" type="email" placeholder="seu@email.com"
                      value={dados.email} onChange={handleChange} required className={inputClass} />
                  </div>
                </Motion.div>

                <Motion.div variants={itemVariants} initial="hidden" animate="show" transition={{ delay: 0.08 }}>
                  <CampoSenhaForte
                    senha={dados.senha}
                    confirmarSenha={dados.confirmarSenha}
                    onSenhaChange={valor => setDados(d => ({ ...d, senha: valor }))}
                    onConfirmarSenhaChange={valor => setDados(d => ({ ...d, confirmarSenha: valor }))}
                    focusClass="focus:border-primary focus:bg-white focus:shadow-[0_0_0_3px_rgba(255,107,53,0.08)]"
                  />
                </Motion.div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={aceitouTermos} onChange={e => setAceitouTermos(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-primary shrink-0 cursor-pointer" />
                  <span className="text-xs text-text-secondary font-semibold leading-snug">
                    Li e aceito os <Link to="/termos-uso" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">Termos de Uso</Link> e a <Link to="/politica-privacidade" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">Política de Privacidade</Link>
                  </span>
                </label>

                <Motion.button type="submit" disabled={carregando || !aceitouTermos || !senhaForteValida(dados.senha, dados.confirmarSenha)}
                  className="w-full py-4 bg-primary text-white border-none rounded-xl font-display font-bold text-base cursor-pointer disabled:bg-border disabled:text-text-muted disabled:cursor-not-allowed"
                  whileHover={!carregando && aceitouTermos && senhaForteValida(dados.senha, dados.confirmarSenha) ? { scale: 1.02, boxShadow: '0 4px 20px rgba(255,107,53,0.35)' } : {}}
                  whileTap={!carregando && aceitouTermos ? { scale: 0.98 } : {}}>
                  {carregando ? 'Criando conta...' : 'Criar conta'}
                </Motion.button>
              </Motion.form>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-4 my-5 text-text-muted text-xs font-bold">
            <div className="flex-1 h-px bg-border" /> já tem conta? <div className="flex-1 h-px bg-border" />
          </div>

          <button type="button" onClick={() => navigate('/login')}
            className="w-full py-3 bg-transparent border border-border rounded-xl text-sm font-bold text-text-secondary cursor-pointer transition-all hover:border-primary hover:text-primary hover:bg-primary-light">
            Entrar na minha conta
          </button>
        </Motion.div>
      </div>
    </div>
  )
}
