import { loginHandler, registerHandler } from '../controllers/auth.controller.js'
import { meHandler } from '../controllers/user.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { validateBody } from '../middlewares/validate-schema.middleware.js'
import { loginSchema, registerSchema } from '../schemas/auth.schema.js'

export async function authRoutes(fastify) {
  fastify.post(
    '/auth/registro',
    {
      preValidation: validateBody(registerSchema),
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    registerHandler,
  )

  fastify.post(
    '/auth/login',
    {
      preValidation: validateBody(loginSchema),
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    loginHandler,
  )

  fastify.get('/auth/me', { preHandler: requireAuth }, meHandler)
}