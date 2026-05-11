import { getApiBaseUrl } from '../services/api'

export function resolverImagem(valor) {
  const url = String(valor || '').trim()
  if (!url) return ''
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  if (url.startsWith('/')) return `${getApiBaseUrl()}${url}`
  return url
}

export function imagemRestaurante(loja) {
  return resolverImagem(loja?.capa || loja?.logo || loja?.imagem || loja?.image || loja?.foto || loja?.foto_url)
}

export function imagemProduto(produto) {
  return resolverImagem(produto?.imagem || produto?.image || produto?.foto || produto?.foto_url || produto?.url_imagem)
}

export function emojiRestaurante(loja) {
  return loja?.emoji || '🍽️'
}

export function emojiProduto(produto) {
  return produto?.emoji || '🍽️'
}
