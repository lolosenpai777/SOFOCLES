import { uploadAvatarHandler, uploadPostAttachmentHandler } from '../controllers/upload.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { validateBody } from '../middlewares/validate-schema.middleware.js'
import { z } from 'zod'

const imageSchema = z.object({ imageData: z.string().max(12 * 1024 * 1024) })
export async function uploadRoutes(fastify) {
  const options = { preHandler: requireAuth, preValidation: validateBody(imageSchema), config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }
  fastify.post('/uploads/avatar', options, uploadAvatarHandler)
  fastify.post('/uploads/posts', options, uploadPostAttachmentHandler)
}
