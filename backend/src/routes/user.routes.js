import { getUsersHandler, followUserHandler, getProfileHandler, updateProfileHandler, updateUsernameHandler, updateUserBadgesHandler } from '../controllers/user.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireAdmin } from '../middlewares/admin.middleware.js'
import { validateBody, validateParams } from '../middlewares/validate-schema.middleware.js'
import { deletePostParamsSchema } from '../schemas/post.schema.js'
import { updateUsernameSchema, updateUserBadgesSchema } from '../schemas/user.schema.js'
import { verifyIdentityHandler } from '../controllers/identity-verification.controller.js'
import { z } from 'zod'

const identityVerificationSchema = z.object({
  documentImage: z.string().max(10 * 1024 * 1024),
  selfieImage: z.string().max(10 * 1024 * 1024),
  consent: z.literal(true),
})

export async function userRoutes(fastify) {
  fastify.get('/users', getUsersHandler)

  fastify.patch('/auth/username', { preHandler: [requireAuth], preValidation: validateBody(updateUsernameSchema) }, updateUsernameHandler)

  fastify.post(
    '/users/:id/follow',
    {
      preHandler: [requireAuth],
      preValidation: validateParams(deletePostParamsSchema),
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
          keyGenerator(request) {
            const authHeader = request.headers?.authorization || 'anon'
            return `${request.ip}:${authHeader}`
          },
        },
      },
    },
    followUserHandler,
  )

  fastify.get(
    '/users/:id/profile',
    {
      preValidation: validateParams(deletePostParamsSchema),
    },
    getProfileHandler,
  )

  fastify.put(
    '/users/profile',
    {
      preHandler: [requireAuth],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
          keyGenerator(request) {
            const authHeader = request.headers?.authorization || 'anon'
            return `${request.ip}:${authHeader}`
          },
        },
      },
    },
    updateProfileHandler,
  )

  fastify.post(
    '/users/identity-verification',
    {
      preHandler: [requireAuth],
      preValidation: validateBody(identityVerificationSchema),
      config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
    },
    verifyIdentityHandler,
  )

  fastify.patch('/admin/users/:id/badges', { preHandler: [requireAuth, requireAdmin], preValidation: [validateParams(deletePostParamsSchema), validateBody(updateUserBadgesSchema)] }, updateUserBadgesHandler)
}
