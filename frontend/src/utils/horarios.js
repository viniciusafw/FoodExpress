const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
const ROTULOS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

function normalizar(valor) {
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

function minutos(horario) {
  const [hora, minuto] = String(horario || '').split(':').map(Number)
  if (!Number.isFinite(hora) || !Number.isFinite(minuto)) return null
  return hora * 60 + minuto
}

function agoraFortaleza() {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const valor = tipo => partes.find(parte => parte.type === tipo)?.value || ''
  const diaNormalizado = normalizar(valor('weekday'))
  const dia = DIAS.findIndex(nome => diaNormalizado.startsWith(nome))
  return {
    dia: dia >= 0 ? dia : new Date().getDay(),
    minutos: Number(valor('hour')) * 60 + Number(valor('minute')),
  }
}

export function statusFuncionamento(loja) {
  const status = normalizar(loja?.status || 'ativo')
  const aberturaTexto = String(loja?.horario_abertura || '').slice(0, 5)
  const fechamentoTexto = String(loja?.horario_fechamento || '').slice(0, 5)
  const abertura = minutos(aberturaTexto)
  const fechamento = minutos(fechamentoTexto)
  const configurados = lerLista(loja?.dias_aberto).map(normalizar)
  const diasAbertos = DIAS.map(nome => (
    !configurados.length || configurados.some(dia => dia.startsWith(nome) || nome.startsWith(dia))
  ))

  if (status === 'inativo') {
    return { aberta: false, texto: 'Fechada temporariamente', proximaAbertura: null }
  }

  if (abertura == null || fechamento == null) {
    const aberta = status !== 'fechado'
    return { aberta, texto: aberta ? 'Aberta agora' : 'Fechada no momento', proximaAbertura: null }
  }

  const agora = agoraFortaleza()
  const atravessaMeiaNoite = fechamento < abertura
  const dentroDoHorario = atravessaMeiaNoite
    ? agora.minutos >= abertura || agora.minutos <= fechamento
    : agora.minutos >= abertura && agora.minutos <= fechamento
  const aberta = status !== 'fechado' && diasAbertos[agora.dia] && dentroDoHorario

  if (aberta) {
    return { aberta: true, texto: `Aberta agora · fecha às ${fechamentoTexto}`, proximaAbertura: null }
  }

  for (let deslocamento = 0; deslocamento <= 7; deslocamento += 1) {
    const dia = (agora.dia + deslocamento) % 7
    if (!diasAbertos[dia]) continue
    if (deslocamento === 0 && agora.minutos >= abertura) continue
    const quando = deslocamento === 0 ? 'hoje' : deslocamento === 1 ? 'amanhã' : ROTULOS[dia]
    const proximaAbertura = `Abre ${quando} às ${aberturaTexto}`
    return { aberta: false, texto: proximaAbertura, proximaAbertura }
  }

  return { aberta: false, texto: 'Fechada sem próximo horário informado', proximaAbertura: null }
}
