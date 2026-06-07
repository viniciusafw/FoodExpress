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
