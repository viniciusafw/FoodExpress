"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.query = query;
const client_1 = require("@libsql/client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
    console.error('\n❌ Variáveis de ambiente do banco não configuradas!');
    console.error('   Crie o arquivo backend/.env com:');
    console.error('   TURSO_DATABASE_URL=libsql://seu-banco.turso.io');
    console.error('   TURSO_AUTH_TOKEN=seu_token_aqui');
    console.error('\n   Siga o guia em README.md para criar o banco no Turso.\n');
    process.exit(1);
}
exports.db = (0, client_1.createClient)({ url, authToken });
async function query(sql, params) {
    try {
        const result = await exports.db.execute({ sql, args: params ?? [] });
        return result.rows;
    }
    catch (error) {
        console.error('Erro no banco de dados:', error);
        throw error;
    }
}
