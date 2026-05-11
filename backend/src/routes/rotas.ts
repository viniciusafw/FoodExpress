// @ts-nocheck
import { Router, Response } from 'express'

const router = Router()

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function gerarPontos(lat1: number, lng1: number, lat2: number, lng2: number, n: number) {
  const pontos = [{ lat: lat1, lng: lng1, tipo: 'origem' }]
  for (let i = 1; i < n; i++) {
    const t = i / n
    pontos.push({
      lat: Math.round((lat1 + (lat2 - lat1) * t) * 1e5) / 1e5,
      lng: Math.round((lng1 + (lng2 - lng1) * t) * 1e5) / 1e5,
      tipo: 'intermediario'
    })
  }
  pontos.push({ lat: lat2, lng: lng2, tipo: 'destino' })
  return pontos
}

// POST /api/rotas/calcular
router.post('/calcular', (req, res: Response) => {
  try {
    const { origem_lat, origem_lng, destino_lat, destino_lng, modo = 'driving' } = req.body

    if ([origem_lat, origem_lng, destino_lat, destino_lng].some(v => typeof v !== 'number')) {
      return res.status(400).json({ erro: 'Coordenadas inválidas' })
    }

    const distancia_km = haversine(origem_lat, origem_lng, destino_lat, destino_lng)
    const tempo_estimado_minutos = Math.ceil((distancia_km / 25) * 60)

    res.json({
      origem: { lat: origem_lat, lng: origem_lng },
      destino: { lat: destino_lat, lng: destino_lng },
      distancia_km: Math.round(distancia_km * 100) / 100,
      tempo_estimado_minutos,
      pontos_rota: gerarPontos(origem_lat, origem_lng, destino_lat, destino_lng, 5),
      modo_transporte: modo
    })
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao calcular rota' })
  }
})

export default router
