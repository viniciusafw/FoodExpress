// frontend/lib/db.ts
import { createClient } from '@libsql/client';

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('Turso database credentials not set');
}

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Helper para queries
export async function query(sql: string, params?: any[]) {
  try {
    const result = await db.execute({
      sql,
      args: params,
    });
    return result.rows;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}