import { createCommentHandler, deleteCommentHandler } from '../controllers/comment.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { validateBody } from '../middlewares/validate-schema.middleware.js'
import { validateParams } from '../middlewares/validate-schema.middleware.js'
import { createCommentSchema, deleteCommentParamsSchema } from '../schemas/comment.schema.js'

export async function commentRoutes(fastify) {
  fastify.post(
    '/posts/:id/comments',
    {
      preHandler: [requireAuth],
      preValidation: validateBody(createCommentSchema),
      config: {
        rateLimit: {
          max: 50,
          timeWindow: '1 minute',
          keyGenerator(request) {
            const authHeader = request.headers?.authorization || 'anon'
            return `${request.ip}:${authHeader}`
          },
        },
      },
    },
    createCommentHandler,
  )

  fastify.delete(
    '/posts/:id/comments/:commentId',
    {
      preHandler: [requireAuth],
      preValidation: validateParams(deleteCommentParamsSchema),
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
          keyGenerator(request) {
            const authHeader = request.headers?.authorization || 'anon'
            return `${request.ip}:${authHeader}`
          },
        },
      },
    },
    deleteCommentHandler,
  )
}
