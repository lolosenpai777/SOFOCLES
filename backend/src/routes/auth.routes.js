import { loginHandler, registerHandler, verifyEmailHandler, forgotPasswordHandler, resetPasswordHandler, changePasswordHandler } from '../controllers/auth.controller.js'
import { meHandler } from '../controllers/user.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { validateBody } from '../middlewares/validate-schema.middleware.js'
import { loginSchema, registerSchema, tokenSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../schemas/auth.schema.js'

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

  fastify.post('/auth/verificar-correo', { preValidation: validateBody(tokenSchema) }, verifyEmailHandler)
  fastify.post('/auth/recuperar-contrasena', { preValidation: validateBody(forgotPasswordSchema), config: { rateLimit: { max: 3, timeWindow: '15 minutes' } } }, forgotPasswordHandler)
  fastify.post('/auth/restablecer-contrasena', { preValidation: validateBody(resetPasswordSchema) }, resetPasswordHandler)
  fastify.post('/auth/cambiar-contrasena', { preHandler: requireAuth, preValidation: validateBody(changePasswordSchema) }, changePasswordHandler)

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
