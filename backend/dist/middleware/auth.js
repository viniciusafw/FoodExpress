"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ erro: 'Token não fornecido' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const secret = process.env.JWT_SECRET || 'fallback_dev_secret';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    }
    catch {
        res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
}
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const secret = process.env.JWT_SECRET || 'fallback_dev_secret';
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            req.userId = decoded.userId;
            req.userRole = decoded.role;
        }
        catch {
            // token inválido — ignora, continua sem auth
        }
    }
    next();
}
