import { NextResponse } from 'next/server'

// Função para calcular distância usando Haversine
function calcularDistancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// POST - Calcular rota e tempo estimado (UC012)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { origem_lat, origem_lng, destino_lat, destino_lng, modo = 'driving' } = body

    // Validar parâmetros
    if (
      typeof origem_lat !== 'number' ||
      typeof origem_lng !== 'number' ||
      typeof destino_lat !== 'number' ||
      typeof destino_lng !== 'number'
    ) {
      return NextResponse.json(
        { erro: 'Coordenadas inválidas' },
        { status: 400 }
      )
    }

    // Calcular distância em linha reta (Haversine)
    const distancia_km = calcularDistancia(origem_lat, origem_lng, destino_lat, destino_lng)

    // Estimar tempo e distância real
    // Em média, um entregador faz ~20-30 km/h em área urbana
    // Vamos usar 25 km/h como média
    const velocidade_media = 25 // km/h
    const tempo_estimado_minutos = Math.ceil((distancia_km / velocidade_media) * 60)

    // Simular rota (em produção, usar Mapbox ou Google Maps)
    // Para agora, retornar linha reta com alguns pontos interpolados
    const pontos_rota = gerarPontosRota(origem_lat, origem_lng, destino_lat, destino_lng, 5)

    return NextResponse.json({
      origem: {
        lat: origem_lat,
        lng: origem_lng
      },
      destino: {
        lat: destino_lat,
        lng: destino_lng
      },
      distancia_km: Math.round(distancia_km * 100) / 100,
      tempo_estimado_minutos: tempo_estimado_minutos,
      pontos_rota: pontos_rota,
      modo_transporte: modo
    })
  } catch (error) {
    console.error('Erro ao calcular rota:', error)
    return NextResponse.json(
      { erro: 'Erro ao calcular rota' },
      { status: 500 }
    )
  }
}

// Função para gerar pontos intermediários da rota
function gerarPontosRota(
  lat_origem: number,
  lng_origem: number,
  lat_destino: number,
  lng_destino: number,
  num_pontos: number
) {
  const pontos = []
  
  // Adicionar ponto de origem
  pontos.push({
    lat: lat_origem,
    lng: lng_origem,
    tipo: 'origem'
  })

  // Gerar pontos intermediários
  for (let i = 1; i < num_pontos; i++) {
    const t = i / num_pontos
    const lat = lat_origem + (lat_destino - lat_origem) * t
    const lng = lng_origem + (lng_destino - lng_origem) * t
    pontos.push({
      lat: Math.round(lat * 100000) / 100000,
      lng: Math.round(lng * 100000) / 100000,
      tipo: 'intermediario'
    })
  }

  // Adicionar ponto de destino
  pontos.push({
    lat: lat_destino,
    lng: lng_destino,
    tipo: 'destino'
  })

  return pontos
}
