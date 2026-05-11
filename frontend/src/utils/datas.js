export const APP_TIME_ZONE = 'America/Fortaleza'

export function parseDataBanco(valor) {
  if (!valor) return null
  if (valor instanceof Date) return valor
  if (typeof valor === 'number') return new Date(valor)

  const texto = String(valor).trim()
  if (!texto) return null

  // SQLite/Turso CURRENT_TIMESTAMP vem em UTC sem sufixo: "YYYY-MM-DD HH:mm:ss".
  // Sem o "Z", o navegador interpreta como horário local e mostra +3h no Brasil.
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(texto)) {
    return new Date(texto.replace(' ', 'T') + 'Z')
  }

  return new Date(texto)
}

export function dataValida(data) {
  return data instanceof Date && !Number.isNaN(data.getTime())
}

export function formatarHoraBanco(valor) {
  const data = parseDataBanco(valor)
  if (!dataValida(data)) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIME_ZONE,
  }).format(data)
}

export function formatarDataBanco(valor) {
  const data = parseDataBanco(valor)
  if (!dataValida(data)) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: APP_TIME_ZONE,
  }).format(data)
}

export function formatarDataHoraBanco(valor) {
  const data = parseDataBanco(valor)
  if (!dataValida(data)) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIME_ZONE,
  }).format(data)
}

export function mesmoDiaLocal(a, b = new Date()) {
  const da = parseDataBanco(a)
  const db = parseDataBanco(b)
  if (!dataValida(da) || !dataValida(db)) return false
  return formatarDataBanco(da) === formatarDataBanco(db)
}

export function dataISOHojeLocal(diasAtras = 0) {
  const agora = new Date()
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora).reduce((acc, parte) => {
    if (parte.type !== 'literal') acc[parte.type] = parte.value
    return acc
  }, {})
  const base = new Date(`${partes.year}-${partes.month}-${partes.day}T12:00:00Z`)
  base.setUTCDate(base.getUTCDate() - diasAtras)
  return base.toISOString().slice(0, 10)
}
