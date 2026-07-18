import { createPostHandler, listPostsHandler } from '../controllers/post.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { validateBody } from '../middlewares/validate-schema.middleware.js'
import { createPostSchema } from '../schemas/post.schema.js'

export async function postRoutes(fastify) {
  fastify.post(
    '/posts',
    {
      preHandler: [requireAuth],
      preValidation: validateBody(createPostSchema),
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
    createPostHandler,
  )

  fastify.get('/posts', listPostsHandler)
}
