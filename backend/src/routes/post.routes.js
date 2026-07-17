import { createPostHandler, listPostsHandler } from '../controllers/post.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'

export async function postRoutes(fastify) {
  fastify.post('/posts', { preHandler: requireAuth }, createPostHandler)
  fastify.get('/posts', listPostsHandler)
}
