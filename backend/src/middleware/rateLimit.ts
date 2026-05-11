// @ts-nocheck
import { Request, Response, NextFunction } from 'express'

const requests = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(maxRequests = 100, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const now = Date.now()
    const record = requests.get(ip)

    if (!record || now > record.resetAt) {
      requests.set(ip, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    if (record.count >= maxRequests) {
      res.status(429).json({ erro: 'Muitas requisições. Tente novamente em 1 minuto.' })
      return
    }

    record.count++
    next()
  }
}
