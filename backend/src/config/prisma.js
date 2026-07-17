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

const globalForPrisma = globalThis

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}