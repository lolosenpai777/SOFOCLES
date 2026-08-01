import { requireAuth } from '../middlewares/auth.middleware.js'
import { notificationsHandler, markReadHandler, markAllReadHandler } from '../controllers/notification.controller.js'
import { validateParams } from '../middlewares/validate-schema.middleware.js'
import { z } from 'zod'

const id = z.object({ id: z.coerce.number().int().positive() })

export async function notificationRoutes(fastify) {
  fastify.get('/notifications', { preHandler: [requireAuth] }, notificationsHandler)
  fastify.patch('/notifications/:id/read', { preHandler: [requireAuth], preValidation: validateParams(id) }, markReadHandler)
  fastify.post('/notifications/mark-all-read', { preHandler: [requireAuth] }, markAllReadHandler)
}
