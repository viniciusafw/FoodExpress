import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation } from 'lucide-react'
import api from '../services/api'
import { coordenadasValidas } from '../utils/mapas'

function normalizarCoordenadas(ponto) {
  if (!ponto) return null
  const lat = Number(ponto.latitude ?? ponto.lat)
  const lng = Number(ponto.longitude ?? ponto.lng)
  if (!coordenadasValidas(lat, lng)) return null
  return { lat, lng }
}

function chavePonto(ponto) {
  return ponto ? `${ponto.lat.toFixed(6)},${ponto.lng.toFixed(6)}` : ''
}

function criarMarcador(cor, label) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: ${cor};
        border: 3px solid white;
        box-shadow: 0 8px 18px rgba(17,24,39,.24);
        display: grid;
        place-items: center;
        color: white;
        font-size: 11px;
        font-weight: 900;
      ">${label}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function normalizarPontosRota(pontos, origem, destino) {
  const pontosValidos = Array.isArray(pontos)
    ? pontos
        .map((ponto) => normalizarCoordenadas(ponto))
        .filter(Boolean)
    : []

  if (pontosValidos.length >= 2) return pontosValidos
  return [origem, destino].filter(Boolean)
}

export default function MapaOSM({
  origem,
  destino,
  destinoTexto,
  titulo = 'Mapa da entrega',
  legendaOrigem = 'Você',
  legendaDestino = 'Destino',
  urlNavegacao = '',
  className = '',
  alturaClasse = 'h-56',
}) {
  const containerRef = useRef(null)
  const mapaRef = useRef(null)
  const camadasRef = useRef([])
  const [rota, setRota] = useState(null)
  const [carregandoRota, setCarregandoRota] = useState(false)

  const origemCoords = normalizarCoordenadas(origem)
  const destinoCoords = normalizarCoordenadas(destino)
  const origemKey = chavePonto(origemCoords)
  const destinoKey = chavePonto(destinoCoords)
  const podeCalcularRota = Boolean(origemCoords && destinoCoords)
  const temPontoMapa = Boolean(origemCoords || destinoCoords)

  useEffect(() => {
    if (!podeCalcularRota) {
      setRota(null)
      setCarregandoRota(false)
      return undefined
    }

    let ativo = true
    setCarregandoRota(true)
    api.rotas.calcular(origemCoords.lat, origemCoords.lng, destinoCoords.lat, destinoCoords.lng)
      .then((dados) => {
        if (ativo) setRota(dados)
      })
      .catch(() => {
        if (ativo) setRota(null)
      })
      .finally(() => {
        if (ativo) setCarregandoRota(false)
      })

    return () => {
      ativo = false
    }
  }, [podeCalcularRota, origemKey, destinoKey])

  useEffect(() => {
    if (!containerRef.current || mapaRef.current || !temPontoMapa) return undefined

    mapaRef.current = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      tap: true,
    })

    L.control.zoom({ position: 'bottomleft' }).addTo(mapaRef.current)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapaRef.current)

    return () => {
      mapaRef.current?.remove()
      mapaRef.current = null
      camadasRef.current = []
    }
  }, [temPontoMapa])

  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa || !temPontoMapa) return

    camadasRef.current.forEach((camada) => mapa.removeLayer(camada))
    camadasRef.current = []

    const pontosRota = normalizarPontosRota(rota?.pontos_rota, origemCoords, destinoCoords)
    if (pontosRota.length >= 2) {
      const linha = L.polyline(
        pontosRota.map((ponto) => [ponto.lat, ponto.lng]),
        {
          color: '#E85D04',
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }
      ).addTo(mapa)
      camadasRef.current.push(linha)
    }

    if (origemCoords) {
      camadasRef.current.push(
        L.marker([origemCoords.lat, origemCoords.lng], {
          icon: criarMarcador('#2A9D8F', legendaOrigem[0] || 'V'),
          title: legendaOrigem,
        }).addTo(mapa)
      )
    }

    if (destinoCoords) {
      camadasRef.current.push(
        L.marker([destinoCoords.lat, destinoCoords.lng], {
          icon: criarMarcador('#E85D04', legendaDestino[0] || 'D'),
          title: legendaDestino,
        }).addTo(mapa)
      )
    }

    const bounds = L.latLngBounds(
      normalizarPontosRota(rota?.pontos_rota, origemCoords, destinoCoords)
        .map((ponto) => [ponto.lat, ponto.lng])
    )
    mapa.fitBounds(bounds, { padding: [34, 34], maxZoom: 16 })
    setTimeout(() => mapa.invalidateSize(), 80)
  }, [origemKey, destinoKey, temPontoMapa, rota, legendaOrigem, legendaDestino])

  if (!temPontoMapa) {
    return (
      <div className={`relative w-full ${alturaClasse} rounded-2xl overflow-hidden bg-surface-2 border border-border ${className}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
            {destinoTexto ? <Navigation size={23} /> : <MapPin size={23} />}
          </div>
          <p className="text-sm font-extrabold text-text-primary">
            {destinoTexto ? 'Abrir rota externa' : 'Mapa indisponível'}
          </p>
          <p className="mt-1 max-w-sm text-xs font-semibold text-text-muted">
            {destinoTexto || 'Ainda não há localização cadastrada para mostrar esta rota.'}
          </p>
          {urlNavegacao && (
            <a
              href={urlNavegacao}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-white shadow-lg hover:bg-primary/90 transition-colors"
            >
              <Navigation size={13} /> Abrir navegação
            </a>
          )}
        </div>
      </div>
    )
  }

  const distancia = Number(rota?.distancia_km)
  const tempo = Number(rota?.tempo_estimado_minutos)
  const fonte = rota?.fonte_rota || (podeCalcularRota ? 'calculando' : 'osm')

  return (
    <div className={`relative w-full ${alturaClasse} rounded-2xl overflow-hidden bg-surface-2 border border-border ${className}`}>
      <div ref={containerRef} className="absolute inset-0 z-0" aria-label={titulo} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 bg-gradient-to-b from-black/35 to-transparent">
        <div className="inline-flex max-w-[calc(100%-5rem)] items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-text-primary shadow-sm">
          <Navigation size={13} className="text-primary shrink-0" />
          <span className="truncate">{titulo}</span>
        </div>
      </div>

      <div className="absolute left-3 bottom-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
        {destinoCoords && (
          <div className="flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-accent shadow-sm">
            <span className="h-2 w-2 rounded-full bg-accent" /> {legendaDestino}
          </div>
        )}
        {origemCoords && (
          <div className="flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-secondary shadow-sm">
            <span className="h-2 w-2 rounded-full bg-secondary" /> {legendaOrigem}
          </div>
        )}
        {(distancia || tempo || carregandoRota) && (
          <div className="rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-extrabold text-text-primary shadow-sm">
            {carregandoRota ? 'Calculando rota...' : `${distancia ? `${distancia.toFixed(1)} km` : ''}${distancia && tempo ? ' · ' : ''}${tempo ? `${Math.round(tempo)} min` : ''}`}
          </div>
        )}
        <div className="rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase text-text-muted shadow-sm">
          {fonte === 'openrouteservice' ? 'ORS' : fonte === 'osrm' ? 'OSRM' : fonte === 'haversine' ? 'Estimado' : 'OSM'}
        </div>
      </div>

      {urlNavegacao && (
        <a
          href={urlNavegacao}
          target="_blank"
          rel="noreferrer"
          className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-extrabold text-white shadow-lg hover:bg-primary/90 transition-colors sm:px-4"
        >
          <Navigation size={13} /> Navegar
        </a>
      )}
    </div>
  )
}
