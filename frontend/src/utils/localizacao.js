export function obterLocalizacaoSalva() {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem('localizacao')
    if (!raw) return null

    const dados = JSON.parse(raw)
    const latitude = Number(dados?.latitude)
    const longitude = Number(dados?.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    if (latitude === 0 && longitude === 0) return null

    return { latitude, longitude }
  } catch {
    return null
  }
}

function normalizarParte(valor) {
  return String(valor || '').trim()
}

function chaveCacheCep(dadosCep, cep, numero = '') {
  return [
    'foodexpress:coordsCep',
    normalizarParte(cep).replace(/\D/g, ''),
    normalizarParte(numero).toLowerCase(),
    normalizarParte(dadosCep?.logradouro).toLowerCase(),
    normalizarParte(dadosCep?.bairro).toLowerCase(),
    normalizarParte(dadosCep?.localidade).toLowerCase(),
    normalizarParte(dadosCep?.uf).toLowerCase(),
  ].join(':')
}

function montarConsultasEndereco(dadosCep, cep, numero = '') {
  const logradouro = normalizarParte(dadosCep?.logradouro)
  const bairro = normalizarParte(dadosCep?.bairro)
  const cidade = normalizarParte(dadosCep?.localidade)
  const uf = normalizarParte(dadosCep?.uf)
  const cepFormatado = normalizarParte(cep)
  const numeroLimpo = normalizarParte(numero)

  return [
    [logradouro, numeroLimpo, bairro, cidade, uf, 'Brasil'],
    [logradouro, bairro, cidade, uf, 'Brasil'],
    [cepFormatado, cidade, uf, 'Brasil'],
    [cidade, uf, 'Brasil'],
  ]
    .map(partes => partes.filter(Boolean).join(', '))
    .filter((consulta, index, lista) => consulta && lista.indexOf(consulta) === index)
}

export async function geocodificarEnderecoCep(dadosCep, cep, numero = '') {
  if (typeof window === 'undefined' || !dadosCep) return null

  const cacheKey = chaveCacheCep(dadosCep, cep, numero)
  try {
    const salvo = JSON.parse(localStorage.getItem(cacheKey) || 'null')
    const latitude = Number(salvo?.latitude)
    const longitude = Number(salvo?.longitude)
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) return { latitude, longitude, origem: 'cep' }
  } catch {
    localStorage.removeItem(cacheKey)
  }

  const consultas = montarConsultasEndereco(dadosCep, cep, numero)
  for (const consulta of consultas) {
    try {
      const params = new URLSearchParams({
        format: 'json',
        limit: '1',
        addressdetails: '0',
        countrycodes: 'br',
        'accept-language': 'pt-BR',
        q: consulta,
      })
      const resposta = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
      if (!resposta.ok) continue
      const resultados = await resposta.json()
      const primeiro = Array.isArray(resultados) ? resultados[0] : null
      const latitude = Number(primeiro?.lat)
      const longitude = Number(primeiro?.lon)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue

      const coordenadas = { latitude, longitude, origem: 'cep' }
      localStorage.setItem(cacheKey, JSON.stringify(coordenadas))
      return coordenadas
    } catch {
      // Tenta a próxima consulta mais genérica.
    }
  }

  return null
}

export async function garantirLocalizacaoCepSalvo() {
  if (typeof window === 'undefined' || obterLocalizacaoSalva()) return null

  try {
    const cep = localStorage.getItem('cep') || ''
    const dadosCep = JSON.parse(localStorage.getItem('enderecoCep') || 'null')
    const numero = localStorage.getItem('enderecoNumero') || ''
    if (!cep || !dadosCep) return null

    const coordenadas = await geocodificarEnderecoCep(dadosCep, cep, numero)
    if (!coordenadas) return null

    localStorage.setItem('localizacao', JSON.stringify(coordenadas))
    return coordenadas
  } catch {
    return null
  }
}

export function paramsComLocalizacao(params = {}) {
  const localizacao = obterLocalizacaoSalva()
  if (!localizacao) return params

  return {
    ...params,
    latitude: localizacao.latitude,
    longitude: localizacao.longitude,
    ordenar: params.ordenar || 'distancia',
  }
}

export function nomeRegiaoAproximada(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Sua região'

  if (lat >= -3.78 && lat <= -3.72 && lng >= -38.55 && lng <= -38.49) return 'Tauape'
  if (lat >= -3.90 && lat <= -3.65 && lng >= -38.65 && lng <= -38.40) return 'Fortaleza'
  if (lat >= -23.75 && lat <= -23.40 && lng >= -46.85 && lng <= -46.35) return 'São Paulo'
  return 'Sua região'
}
