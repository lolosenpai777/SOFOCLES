import { z } from 'zod'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireAdmin } from '../middlewares/admin.middleware.js'
import { validateBody } from '../middlewares/validate-schema.middleware.js'
import { validateParams } from '../middlewares/validate-schema.middleware.js'
import { blockHandler, muteHandler, reportHandler, reportsHandler, resolveReportHandler } from '../controllers/moderation.controller.js'
const id = z.object({ id: z.coerce.number().int().positive() })
const report = z.object({ postId: z.coerce.number().int().positive().optional(), userId: z.coerce.number().int().positive().optional(), reason: z.string().trim().min(3).max(160), details: z.string().trim().max(1000).optional() })
const resolution = z.object({ status: z.enum(['RESOLVED', 'DISMISSED']), removeContent: z.boolean().optional() })
export async function moderationRoutes(fastify) {
  fastify.post('/reports', { preHandler: requireAuth, preValidation: validateBody(report) }, reportHandler)
  fastify.post('/users/:id/block', { preHandler: requireAuth, preValidation: validateParams(id) }, blockHandler)
  fastify.post('/users/:id/mute', { preHandler: requireAuth, preValidation: validateParams(id) }, muteHandler)
  fastify.get('/admin/reports', { preHandler: [requireAuth, requireAdmin] }, reportsHandler)
  fastify.patch('/admin/reports/:id', { preHandler: [requireAuth, requireAdmin], preValidation: [validateParams(id), validateBody(resolution)] }, resolveReportHandler)
}
