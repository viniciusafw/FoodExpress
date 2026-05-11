// @ts-nocheck
import { createClient } from '@libsql/client'
import dotenv from 'dotenv'
import { mkdirSync } from 'fs'
import { join, resolve } from 'path'

dotenv.config()

const databaseDir = resolve(process.cwd(), '../database')
try { mkdirSync(databaseDir, { recursive: true }) } catch {}

const configuredUrl = process.env.TURSO_DATABASE_URL?.trim()
const configuredToken = process.env.TURSO_AUTH_TOKEN?.trim()

// Para apresentação local, o projeto funciona mesmo sem Turso configurado.
// Se TURSO_DATABASE_URL existir, ele usa Turso normalmente. Se não existir,
// cai em SQLite local via libSQL: database/foodexpress-local.db.
const url = configuredUrl || `file:${join(databaseDir, 'foodexpress-local.db')}`
const authToken = url.startsWith('file:') ? undefined : configuredToken

if (!configuredUrl) {
  console.warn('⚠️ TURSO_DATABASE_URL não configurado. Usando banco local: database/foodexpress-local.db')
}

if (!url.startsWith('file:') && !authToken) {
  console.error('\n❌ TURSO_AUTH_TOKEN não configurado para banco Turso!')
  console.error('   Configure backend/.env ou use TURSO_DATABASE_URL=file:../database/foodexpress-local.db para teste local.\n')
  process.exit(1)
}

export const db = createClient(authToken ? { url, authToken } : { url })

export async function query(sql: string, params?: any[]) {
  try {
    const result = await db.execute({ sql, args: params ?? [] })
    return result.rows
  } catch (error) {
    console.error('Erro no banco de dados:', error)
    throw error
  }
}
