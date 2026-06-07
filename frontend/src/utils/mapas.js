export function coordenadasValidas(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
}

export function coordenadasTexto(latitude, longitude) {
  if (!coordenadasValidas(latitude, longitude)) return ''
  return `${Number(latitude)},${Number(longitude)}`
}

export function textoEnderecoValido(valor) {
  const texto = String(valor || '').trim()
  if (!texto || /não informado/i.test(texto)) return ''
  return texto
}

export function montarPontoMapa(destino, tipo = 'cliente') {
  if (!destino) return ''
  const latitude = destino.latitude ?? destino.lat
  const longitude = destino.longitude ?? destino.lng
  const coordenadas = coordenadasTexto(latitude, longitude)
  if (coordenadas) return coordenadas

  const endereco = textoEnderecoValido(destino.endereco || destino.rua)
  if (!endereco) return ''
  const nome = tipo === 'loja' ? textoEnderecoValido(destino.nome) : ''
  return [nome, endereco, destino.bairro, destino.cidade, 'Brasil'].filter(Boolean).join(', ')
}

function normalizarPontoNavegacao(valor) {
  if (!valor) return ''
  if (typeof valor === 'string') return valor.trim()
  return coordenadasTexto(valor.latitude ?? valor.lat, valor.longitude ?? valor.lng)
}

export function criarUrlNavegacaoGoogle({ origem, destino }) {
  const destinoFormatado = normalizarPontoNavegacao(destino) || String(destino || '').trim()
  if (!destinoFormatado) return ''
  const origemFormatada = normalizarPontoNavegacao(origem)
  const params = new URLSearchParams({
    api: '1',
    destination: destinoFormatado,
    travelmode: 'driving',
    dir_action: 'navigate',
  })
  if (origemFormatada) params.set('origin', origemFormatada)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
