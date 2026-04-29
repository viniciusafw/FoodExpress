"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
const requests = new Map();
function rateLimit(maxRequests = 100, windowMs = 60_000) {
    return (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const record = requests.get(ip);
        if (!record || now > record.resetAt) {
            requests.set(ip, { count: 1, resetAt: now + windowMs });
            next();
            return;
        }
        if (record.count >= maxRequests) {
            res.status(429).json({ erro: 'Muitas requisições. Tente novamente em 1 minuto.' });
            return;
        }
        record.count++;
        next();
    };
}
