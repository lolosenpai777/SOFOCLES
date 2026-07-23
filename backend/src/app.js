import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import path from 'node:path'
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

  // Note: file uploads are handled via JSON `imageData` (data URL) to avoid
  // plugin version mismatches with @fastify/multipart in this environment.

  fastify.register(jwt, {
    secret: env.jwtSecret,
  })

  // Serve uploaded files from public/uploads without external plugins
  fastify.get('/uploads/:file', async (request, reply) => {
    try {
      const file = request.params?.file
      if (!file) return reply.code(400).send({ error: 'Archivo inválido' })

      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      const filePath = path.join(uploadsDir, file)

      // Prevent path traversal
      if (!filePath.startsWith(uploadsDir)) {
        return reply.code(400).send({ error: 'Ruta inválida' })
      }

      const fs = await import('fs')
      await fs.promises.access(filePath)

      const ext = path.extname(filePath).slice(1).toLowerCase()
      const types = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
      }

      const mime = types[ext] || 'application/octet-stream'
      reply.type(mime)
      const stream = fs.createReadStream(filePath)
      return reply.send(stream)
    } catch (err) {
      return reply.code(404).send({ error: 'No encontrado' })
    }
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

  // register users route via dynamic import
  fastify.register(async function (instance) {
    const mod = await import('./routes/user.routes.js')
    await mod.userRoutes(instance)
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