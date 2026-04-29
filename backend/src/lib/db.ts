import { createClient } from '@libsql/client'
import dotenv from 'dotenv'
dotenv.config()

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !authToken) {
  console.error('\n❌ Variáveis de ambiente do banco não configuradas!')
  console.error('   Crie o arquivo backend/.env com:')
  console.error('   TURSO_DATABASE_URL=libsql://seu-banco.turso.io')
  console.error('   TURSO_AUTH_TOKEN=seu_token_aqui')
  console.error('\n   Siga o guia em README.md para criar o banco no Turso.\n')
  process.exit(1)
}

export const db = createClient({ url, authToken })

export async function query(sql: string, params?: any[]) {
  try {
    const result = await db.execute({ sql, args: params ?? [] })
    return result.rows
  } catch (error) {
    console.error('Erro no banco de dados:', error)
    throw error
  }
}
