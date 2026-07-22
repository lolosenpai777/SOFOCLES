import { getUsersHandler, followUserHandler } from '../controllers/user.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { validateParams } from '../middlewares/validate-schema.middleware.js'
import { deletePostParamsSchema } from '../schemas/post.schema.js'

export async function userRoutes(fastify) {
  fastify.get('/users', getUsersHandler)

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
}
