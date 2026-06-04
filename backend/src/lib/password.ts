import crypto from 'crypto'

const ITERATIONS = 210_000
const KEYLEN = 32
const DIGEST = 'sha256'

export function hashSenha(senha: string) {
  const valor = String(senha || '')
  if (valor.length < 8) throw new Error('Senha precisa ter pelo menos 8 caracteres')
  if (!/[A-Z]/.test(valor)) throw new Error('Senha precisa ter pelo menos uma letra maiúscula')
  if (!/[@!#$%]/.test(valor)) throw new Error('Senha precisa ter pelo menos um caractere especial: @ ! # $ %')
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(valor, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex')
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`
}

export function verificarSenha(senha: string, senhaHash?: string | null) {
  const salvo = String(senhaHash || '')
  const partes = salvo.split('$')
  if (partes.length !== 4 || partes[0] !== 'pbkdf2') return false
  const iterations = Number(partes[1])
  const salt = partes[2]
  const hash = partes[3]
  if (!Number.isFinite(iterations) || !salt || !hash) return false

  const calculado = crypto.pbkdf2Sync(String(senha || ''), salt, iterations, KEYLEN, DIGEST).toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(calculado, 'hex'), Buffer.from(hash, 'hex'))
  } catch {
    return false
  }
}
