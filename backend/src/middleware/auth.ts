// @ts-nocheck
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
  userRole?: string
  userEmail?: string
  userName?: string
}

function getSecrets() {
  const secrets = [process.env.JWT_SECRET].filter(Boolean)

  if (process.env.NODE_ENV !== 'production') {
    secrets.push('dev_secret')
  }

  return Array.from(new Set(secrets))
}

function verificarTokenLocal(token: string) {
  const secrets = getSecrets()
  if (!secrets.length) {
    throw new Error('JWT_SECRET não configurado')
  }

  let ultimoErro: any = null
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret as string) as { userId: string; role?: string; email?: string; nome?: string; name?: string }
    } catch (e) {
      ultimoErro = e
    }
  }
  throw ultimoErro
}

function preencherUsuario(req: AuthRequest, decoded: any) {
  req.userId = decoded.userId || decoded.sub || decoded.id
  req.userRole = decoded.role || decoded.perfil
  req.userEmail = decoded.email || req.headers['x-user-email'] as string || ''
  req.userName = decoded.nome || decoded.name || req.headers['x-user-name'] as string || ''
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ erro: 'Token não fornecido' })
    return
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = verificarTokenLocal(token)
    preencherUsuario(req, decoded)
    next()
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado. Saia e entre novamente.' })
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = verificarTokenLocal(token)
      preencherUsuario(req, decoded)
    } catch {
      // token inválido — ignora, continua sem auth
    }
  }
  next()
}
