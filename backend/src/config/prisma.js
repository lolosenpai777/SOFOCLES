import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

// Load .env from process cwd first, then fallback to backend/.env relative to this file
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
if (!process.env.DATABASE_URL) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const fallback = path.resolve(__dirname, '../../.env')
  dotenv.config({ path: fallback })
}

function buildDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL?.trim()
  if (rawUrl) return normalizeDatabaseUrl(rawUrl)

  const dbUser = process.env.DB_USER?.trim()
  const dbPassword = process.env.DB_PASSWORD?.trim()
  const dbName = process.env.DB_NAME?.trim()

  if (!dbUser || !dbPassword || !dbName) {
    throw new Error('Falta DATABASE_URL o las variables DB_USER, DB_PASSWORD y DB_NAME para construir la conexión a PostgreSQL')
  }

  return normalizeDatabaseUrl(`postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@postgres:5432/${encodeURIComponent(dbName)}?schema=public`)
}

function normalizeDatabaseUrl(value) {
  const url = new URL(value)
  if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '10')
  if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '60')
  return url.toString()
}

const globalForPrisma = globalThis

const databaseUrl = buildDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}