import dotenv from 'dotenv'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

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