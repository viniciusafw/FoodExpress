// backend/functions/calcular-rota.ts

export const config = {
  runtime: 'edge',
  regions: ['gru1'] // São Paulo
}

export default async function handler(request: Request) {
  const { origem, destino } = await request.json()

  const MAPBOX_TOKEN = (globalThis as any).process?.env?.MAPBOX_TOKEN

  const response = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/` +
    `${origem.lng},${origem.lat};${destino.lng},${destino.lat}` +
    `?access_token=${MAPBOX_TOKEN}&geometries=geojson`
  )

  const data = await response.json()

  if (data.routes && data.routes.length > 0) {
    const route = data.routes[0]
    return new Response(
      JSON.stringify({
        distance: route.distance / 1000,
        duration: route.duration / 60,
        geometry: route.geometry
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ error: 'Verifique sua conexão com a internet' }),
    { status: 404 }
  )
}