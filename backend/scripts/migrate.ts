import { config } from 'dotenv'
import { db } from '../src/lib/db'
import { readFileSync } from 'fs'
import { join } from 'path'

config()

async function migrate() {
  console.log('🗄️  Executando migrations...')

  // Testa a conexão primeiro
  try {
    await db.execute('SELECT 1')
    console.log('✅ Conexão com Turso OK')
  } catch (e: any) {
    console.error('\n❌ Erro de conexão com o banco de dados!')
    console.error('   Verifique as variáveis no arquivo backend/.env:')
    console.error('   TURSO_DATABASE_URL=libsql://seu-banco.turso.io')
    console.error('   TURSO_AUTH_TOKEN=seu_token\n')
    console.error('   Detalhes:', e.message)
    process.exit(1)
  }

  // Lê o schema.sql — caminho relativo ao CWD (execute sempre de dentro de backend/)
  const schemaPath = join(process.cwd(), '../schema.sql')
  let schema: string

  try {
    schema = readFileSync(schemaPath, 'utf-8')
    console.log('📄 schema.sql encontrado')
  } catch (e) {
    // Tenta path alternativo (caso rode de outro lugar)
    try {
      schema = readFileSync(join(process.cwd(), 'schema.sql'), 'utf-8')
    } catch {
      console.error('❌ schema.sql não encontrado. Execute de dentro da pasta backend/')
      process.exit(1)
    }
  }

  // Remove comentários de linha e executa cada statement
  const statements = schema
    .split(';')
    .map(s => s.replace(/--[^\n]*/g, '').trim())
    .filter(s => s.length > 10) // ignora linhas muito curtas/vazias

  let ok = 0, skip = 0, fail = 0
  for (const stmt of statements) {
    try {
      await db.execute(stmt)
      ok++
    } catch (e: any) {
      if (e.message?.includes('already exists') || e.message?.includes('duplicate')) {
        skip++
      } else {
        console.error(`  ⚠️  ${stmt.substring(0, 50)}... → ${e.message}`)
        fail++
      }
    }
  }
  console.log(`✅ Schema: ${ok} criados, ${skip} já existentes, ${fail} erros`)

  // Tabelas extras que não estão no schema.sql original
  const extras = [
    `CREATE TABLE IF NOT EXISTS cupons (
      id TEXT PRIMARY KEY,
      codigo TEXT UNIQUE NOT NULL,
      desconto REAL NOT NULL,
      tipo TEXT NOT NULL,
      minimo REAL DEFAULT 0,
      data_expiracao DATETIME,
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS avaliacoes (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL,
      pedido_id TEXT,
      restaurante_id TEXT,
      entregador_id TEXT,
      estrelas INTEGER NOT NULL,
      comentario TEXT,
      tipo TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  ]

  for (const stmt of extras) {
    try {
      await db.execute(stmt)
    } catch (e: any) {
      if (!e.message?.includes('already exists')) {
        console.error('  ⚠️  Tabela extra:', e.message)
      }
    }
  }

  console.log('🎉 Migrations concluídas!')
}

migrate().catch(e => {
  console.error('Erro fatal:', e.message)
  process.exit(1)
})
