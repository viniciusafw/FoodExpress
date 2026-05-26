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
