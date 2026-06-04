import { getApiBaseUrl } from '../services/api'

const fotosComida = [
  '1513104890138-7c749659a591',
  '1568901346375-23c9450c58cd',
  '1579871494447-9811cf80d66c',
  '1590301157890-4810ed352733',
  '1546069901-ba9599a7e63c',
  '1604908176997-125f25cc6f3d',
  '1555939594-58d7cb561ad1',
  '1512621776951-a57141f2eefd',
  '1488477181946-6428a0291777',
  '1509440159596-0249088772ff',
  '1509042239860-f550ce710b93',
  '1601050690597-df0568f70950',
  '1541518763669-27fef04b14ea',
  '1565299585323-38d6b0865b47',
  '1563805042-7684c019e1cb',
  '1504674900247-0877df9cc836',
  '1504754524776-8f4f37790ca0',
  '1565958011703-44f9829ba187',
  '1473093295043-cdd812d0e601',
  '1551183053-bf91a1d81141',
]

const fotosPorCategoria = {
  pizza: '1513104890138-7c749659a591',
  lanches: '1568901346375-23c9450c58cd',
  sushi: '1579871494447-9811cf80d66c',
  açaí: '1590301157890-4810ed352733',
  acai: '1590301157890-4810ed352733',
  brasileira: '1546069901-ba9599a7e63c',
  nordestina: '1604908176997-125f25cc6f3d',
  churrasco: '1555939594-58d7cb561ad1',
  saudavel: '1512621776951-a57141f2eefd',
  saudável: '1512621776951-a57141f2eefd',
  saladas: '1512621776951-a57141f2eefd',
  sobremesas: '1488477181946-6428a0291777',
  padaria: '1509440159596-0249088772ff',
  cafeteria: '1509042239860-f550ce710b93',
  mexicana: '1565299585323-38d6b0865b47',
  mercado: '1542838132-92c53300491e',
  conveniência: '1528698827591-e19ccd7bc23d',
  conveniencia: '1528698827591-e19ccd7bc23d',
}

function hashTexto(valor) {
  return String(valor || '').split('').reduce((total, char) => (
    ((total << 5) - total + char.charCodeAt(0)) | 0
  ), 0)
}

function normalizar(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function imagemFallback(seed = '', categoria = '') {
  const categoriaNormalizada = normalizar(categoria)
  const foto = fotosPorCategoria[categoriaNormalizada] || fotosComida[Math.abs(hashTexto(seed || categoria)) % fotosComida.length]
  return `https://images.unsplash.com/photo-${foto}?auto=format&fit=crop&w=900&h=700&q=80`
}

export function resolverImagem(valor, fallback = {}) {
  const url = String(valor || '').trim()
  const seed = fallback.seed || fallback.nome || fallback.id || url
  const categoria = fallback.categoria || ''
  if (!url) return imagemFallback(seed, categoria)
  if (/^https?:\/\/source\.unsplash\.com\//i.test(url)) return imagemFallback(seed, categoria)
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  if (url.startsWith('/')) return `${getApiBaseUrl()}${url}`
  return url
}

export function imagemRestaurante(loja) {
  return resolverImagem(loja?.capa || loja?.logo || loja?.imagem || loja?.image || loja?.foto || loja?.foto_url, {
    id: loja?.id,
    nome: loja?.nome,
    categoria: loja?.categoria,
  })
}

export function imagemProduto(produto) {
  return resolverImagem(produto?.imagem || produto?.image || produto?.foto || produto?.foto_url || produto?.url_imagem, {
    id: produto?.id,
    nome: produto?.nome,
    categoria: produto?.categoria || produto?.subcategoria,
  })
}

export function emojiRestaurante(loja) {
  return loja?.emoji || '🍽️'
}

export function emojiProduto(produto) {
  return produto?.emoji || '🍽️'
}
