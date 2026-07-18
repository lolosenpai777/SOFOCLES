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

async function gracefulShutdown(signal, exitCode = 0) {
  try {
    app.log.warn({ signal }, 'Apagado graceful del servidor')
    await app.close()
    await prisma.$disconnect()
    process.exit(exitCode)
  } catch (error) {
    app.log.error({ err: error, signal }, 'Fallo durante apagado graceful')
    process.exit(1)
  }
}

process.on('SIGINT', async () => {
  await gracefulShutdown('SIGINT')
})

process.on('SIGTERM', async () => {
  await gracefulShutdown('SIGTERM')
})

process.on('unhandledRejection', async (reason) => {
  app.log.error({ err: reason }, 'Promesa no manejada detectada')
  await gracefulShutdown('unhandledRejection', 1)
})

process.on('uncaughtException', async (error) => {
  app.log.fatal({ err: error }, 'Excepcion no capturada detectada')
  await gracefulShutdown('uncaughtException', 1)
})