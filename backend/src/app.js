import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { env } from './config/env.js'
import { authRoutes } from './routes/auth.routes.js'

export function buildApp() {
  const fastify = Fastify({
    logger: true,
  })

  fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  fastify.register(jwt, {
    secret: env.jwtSecret,
  })

  fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder(request, context) {
      return {
        statusCode: 429,
        error: `Demasiadas solicitudes, intenta nuevamente en ${context.after}`,
      }
    },
  })

  fastify.get('/health', async () => ({ ok: true }))

  fastify.register(authRoutes, { prefix: '/api' })
  // register posts route via dynamic import to ensure module loads correctly
  fastify.register(async function (instance) {
    const mod = await import('./routes/post.routes.js')
    await mod.postRoutes(instance)
  }, { prefix: '/api' })

  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error)

    const statusCode = error.statusCode ?? 500
    if (statusCode === 429) {
      return reply.code(429).send({
        error: error.message || 'Demasiadas solicitudes, intenta nuevamente en unos segundos',
      })
    }

    const message =
      statusCode >= 500
        ? 'Error interno del servidor'
        : error.message || 'Solicitud invalida'

    reply.code(statusCode).send({
      error: message,
    })
  })

  return fastify
}