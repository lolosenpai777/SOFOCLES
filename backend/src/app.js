import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
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

  fastify.get('/health', async () => ({ ok: true }))

  fastify.register(authRoutes, { prefix: '/api' })

  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error)

    const statusCode = error.statusCode ?? 500
    reply.code(statusCode).send({
      mensaje: error.message || 'Error interno del servidor',
    })
  })

  return fastify
}