import { loginHandler, registerHandler } from '../controllers/auth.controller.js'
import { meHandler } from '../controllers/user.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'

export async function authRoutes(fastify) {
  fastify.post('/auth/registro', registerHandler)
  fastify.post('/auth/login', loginHandler)
  fastify.get('/auth/me', { preHandler: requireAuth }, meHandler)
}