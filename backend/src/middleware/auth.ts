import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
  userRole?: string
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ erro: 'Token não fornecido' })
    return
  }

  const token = authHeader.split(' ')[1]
  try {
    const secret = process.env.JWT_SECRET || 'fallback_dev_secret'
    const decoded = jwt.verify(token, secret) as { userId: string; role?: string }
    req.userId = decoded.userId
    req.userRole = decoded.role
    next()
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado' })
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const secret = process.env.JWT_SECRET || 'fallback_dev_secret'
      const decoded = jwt.verify(token, secret) as { userId: string; role?: string }
      req.userId = decoded.userId
      req.userRole = decoded.role
    } catch {
      // token inválido — ignora, continua sem auth
    }
  }
  next()
}
