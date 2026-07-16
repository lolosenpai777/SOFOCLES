import { buildApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './config/prisma.js'

const app = buildApp()

async function start() {
  try {
    await prisma.$connect()
    await app.listen({ port: env.port, host: '0.0.0.0' })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

start()

process.on('SIGINT', async () => {
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
})