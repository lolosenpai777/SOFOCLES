import {
  createPostHandler,
  deletePostHandler,
  getPostHandler,
  likePostHandler,
  togglePinnedPostHandler,
  togglePostSaveHandler,
  savedPostsHandler,
  quotePostHandler,
  listPostsHandler,
  updatePostHandler,
} from '../controllers/post.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { validateBody } from '../middlewares/validate-schema.middleware.js'
import { validateParams } from '../middlewares/validate-schema.middleware.js'
import { createPostSchema, deletePostParamsSchema, updatePostSchema } from '../schemas/post.schema.js'

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

  fastify.get('/posts/saved', { preHandler: [requireAuth] }, savedPostsHandler)

  fastify.get(
    '/posts/:id',
    {
      preValidation: validateParams(deletePostParamsSchema),
    },
    getPostHandler,
  )

  fastify.put(
    '/posts/:id',
    {
      preHandler: [requireAuth],
      preValidation: [validateParams(deletePostParamsSchema), validateBody(updatePostSchema)],
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
    updatePostHandler,
  )

  fastify.delete(
    '/posts/:id',
    {
      preHandler: [requireAuth],
      preValidation: validateParams(deletePostParamsSchema),
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
    deletePostHandler,
  )

  fastify.post(
    '/posts/:id/like',
    {
      preHandler: [requireAuth],
      preValidation: validateParams(deletePostParamsSchema),
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
    likePostHandler,
  )

  fastify.post(
    '/posts/:id/pin',
    { preHandler: [requireAuth], preValidation: validateParams(deletePostParamsSchema) },
    togglePinnedPostHandler,
  )

  fastify.post(
    '/posts/:id/save',
    { preHandler: [requireAuth], preValidation: validateParams(deletePostParamsSchema) },
    togglePostSaveHandler,
  )

  fastify.post('/posts/:id/quote', { preHandler: [requireAuth], preValidation: validateParams(deletePostParamsSchema) }, quotePostHandler)
}
