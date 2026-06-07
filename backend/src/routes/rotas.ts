import { Router, Response } from 'express'

const router = Router()

type Coordenada = {
  lat: number
  lng: number
  tipo?: 'origem' | 'intermediario' | 'destino'
}

type RotaCalculada = {
  distancia_km: number
  tempo_estimado_minutos: number
  pontos_rota: Coordenada[]
  fonte_rota: 'openrouteservice' | 'osrm' | 'haversine'
  aviso?: string
}

function numero(valor: unknown): number {
  return Number(valor)
}

function coordenadaValida(lat: number, lng: number): boolean {
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180
    && !(lat === 0 && lng === 0)
}

function arredondar(valor: number, casas = 2): number {
  const fator = 10 ** casas
  return Math.round(valor * fator) / fator
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const raioTerraKm = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return raioTerraKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function gerarPontosRetos(origem: Coordenada, destino: Coordenada, quantidade: number) {
  const pontos: Coordenada[] = [{ ...origem, tipo: 'origem' }]
  for (let i = 1; i < quantidade; i += 1) {
    const t = i / quantidade
    pontos.push({
      lat: arredondar(origem.lat + (destino.lat - origem.lat) * t, 5),
      lng: arredondar(origem.lng + (destino.lng - origem.lng) * t, 5),
      tipo: 'intermediario',
    })
  }
  pontos.push({ ...destino, tipo: 'destino' })
  return pontos
}

function limitarPontos(coordenadas: Coordenada[], maximo = 180): Coordenada[] {
  if (coordenadas.length <= maximo) return coordenadas
  const passo = Math.ceil(coordenadas.length / maximo)
  const reduzidos = coordenadas.filter((_, index) => index % passo === 0)
  const ultimo = coordenadas[coordenadas.length - 1]
  if (reduzidos[reduzidos.length - 1] !== ultimo) reduzidos.push(ultimo)
  return reduzidos
}

function marcarExtremos(pontos: Coordenada[]): Coordenada[] {
  return pontos.map((ponto, index) => ({
    ...ponto,
    tipo: index === 0
      ? 'origem'
      : index === pontos.length - 1
        ? 'destino'
        : 'intermediario',
  }))
}

async function buscarJson(url: string, options: RequestInit = {}, timeoutMs = 5500): Promise<any> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const resposta = await fetch(url, { ...options, signal: controller.signal })
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
    return await resposta.json()
  } finally {
    clearTimeout(timeout)
  }
}

async function calcularComOpenRouteService(origem: Coordenada, destino: Coordenada): Promise<RotaCalculada> {
  const chave = String(process.env.OPENROUTESERVICE_API_KEY || process.env.ORS_API_KEY || '').trim()
  if (!chave) throw new Error('OPENROUTESERVICE_API_KEY não configurada')

  const dados = await buscarJson('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: {
      Authorization: chave,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [[origem.lng, origem.lat], [destino.lng, destino.lat]],
      instructions: false,
      language: 'pt-br',
    }),
  })

  const feature = dados?.features?.[0]
  const coordenadas = feature?.geometry?.coordinates
  const resumo = feature?.properties?.summary
  if (!Array.isArray(coordenadas) || coordenadas.length < 2 || !resumo) {
    throw new Error('Resposta inválida do OpenRouteService')
  }

  const pontos = limitarPontos(coordenadas.map(([lng, lat]: [number, number]) => ({ lat, lng })))
  return {
    distancia_km: arredondar(Number(resumo.distance) / 1000),
    tempo_estimado_minutos: Math.max(1, Math.ceil(Number(resumo.duration) / 60)),
    pontos_rota: marcarExtremos(pontos),
    fonte_rota: 'openrouteservice',
  }
}

async function calcularComOsrm(origem: Coordenada, destino: Coordenada): Promise<RotaCalculada> {
  const origemTexto = `${origem.lng},${origem.lat}`
  const destinoTexto = `${destino.lng},${destino.lat}`
  const url = `https://router.project-osrm.org/route/v1/driving/${origemTexto};${destinoTexto}?overview=full&geometries=geojson&steps=false`
  const dados = await buscarJson(url)
  const rota = dados?.routes?.[0]
  const coordenadas = rota?.geometry?.coordinates
  if (!Array.isArray(coordenadas) || coordenadas.length < 2) {
    throw new Error('Resposta inválida do OSRM')
  }

  const pontos = limitarPontos(coordenadas.map(([lng, lat]: [number, number]) => ({ lat, lng })))
  return {
    distancia_km: arredondar(Number(rota.distance) / 1000),
    tempo_estimado_minutos: Math.max(1, Math.ceil(Number(rota.duration) / 60)),
    pontos_rota: marcarExtremos(pontos),
    fonte_rota: 'osrm',
  }
}

function calcularEstimativaLocal(origem: Coordenada, destino: Coordenada, aviso?: string): RotaCalculada {
  const distanciaReta = haversine(origem.lat, origem.lng, destino.lat, destino.lng)
  const distanciaProvavel = distanciaReta * 1.25
  return {
    distancia_km: arredondar(distanciaProvavel),
    tempo_estimado_minutos: Math.max(1, Math.ceil((distanciaProvavel / 28) * 60)),
    pontos_rota: gerarPontosRetos(origem, destino, 5),
    fonte_rota: 'haversine',
    aviso,
  }
}

// POST /api/rotas/calcular
router.post('/calcular', async (req, res: Response) => {
  try {
    const { origem_lat, origem_lng, destino_lat, destino_lng, modo = 'driving' } = req.body
    const origem = { lat: numero(origem_lat), lng: numero(origem_lng) }
    const destino = { lat: numero(destino_lat), lng: numero(destino_lng) }

    if (!coordenadaValida(origem.lat, origem.lng) || !coordenadaValida(destino.lat, destino.lng)) {
      return res.status(400).json({ erro: 'Coordenadas inválidas' })
    }

    let rota: RotaCalculada
    try {
      rota = await calcularComOpenRouteService(origem, destino)
    } catch (erroOrs) {
      try {
        rota = await calcularComOsrm(origem, destino)
      } catch (erroOsrm) {
        rota = calcularEstimativaLocal(
          origem,
          destino,
          `Rota estimada localmente. ORS: ${erroOrs instanceof Error ? erroOrs.message : 'falhou'}; OSRM: ${erroOsrm instanceof Error ? erroOsrm.message : 'falhou'}`
        )
      }
    }

    return res.json({
      origem,
      destino,
      distancia_km: rota.distancia_km,
      tempo_estimado_minutos: rota.tempo_estimado_minutos,
      pontos_rota: rota.pontos_rota,
      modo_transporte: modo,
      fonte_rota: rota.fonte_rota,
      ...(rota.aviso ? { aviso: rota.aviso } : {}),
    })
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao calcular rota' })
  }
})

export default router
