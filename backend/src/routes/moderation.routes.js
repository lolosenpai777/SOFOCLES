import { z } from 'zod'
import {
  blockHandler,
  createAppealHandler,
  listAppealsHandler,
  muteHandler,
  reportActionHandler,
  reportCaseDetailHandler,
  reportHandler,
  reportsHandler,
  reviewAppealHandler,
  updateReportCaseStatusHandler,
  userModerationHistoryHandler,
} from '../controllers/moderation.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireModeratorAdmin, requireModeratorJunior } from '../middlewares/moderator.middleware.js'
import { validateBody, validateParams } from '../middlewares/validate-schema.middleware.js'
import {
  createAppealSchema,
  createReportSchema,
  moderationCaseParamsSchema,
  reportActionSchema,
  reviewAppealSchema,
  updateCaseStatusSchema,
} from '../schemas/moderation.schema.js'

const userIdParams = z.object({
  id: z.coerce.number().int().positive('El id del usuario debe ser mayor a cero'),
})

export async function moderationRoutes(fastify) {
  fastify.post(
    '/reports',
    {
      preHandler: [requireAuth],
      preValidation: validateBody(createReportSchema),
    },
    reportHandler,
  )

  fastify.post(
    '/users/:id/block',
    { preHandler: [requireAuth], preValidation: validateParams(userIdParams) },
    blockHandler,
  )
  fastify.post(
    '/users/:id/mute',
    { preHandler: [requireAuth], preValidation: validateParams(userIdParams) },
    muteHandler,
  )

  fastify.get(
    '/admin/reports',
    { preHandler: [requireAuth, requireModeratorJunior] },
    reportsHandler,
  )
  fastify.get(
    '/admin/reports/:id',
    {
      preHandler: [requireAuth, requireModeratorJunior],
      preValidation: validateParams(moderationCaseParamsSchema),
    },
    reportCaseDetailHandler,
  )
  fastify.patch(
    '/admin/reports/:id/status',
    {
      preHandler: [requireAuth, requireModeratorJunior],
      preValidation: [validateParams(moderationCaseParamsSchema), validateBody(updateCaseStatusSchema)],
    },
    updateReportCaseStatusHandler,
  )
  fastify.post(
    '/admin/reports/:id/actions',
    {
      preHandler: [requireAuth, requireModeratorJunior],
      preValidation: [validateParams(moderationCaseParamsSchema), validateBody(reportActionSchema)],
    },
    reportActionHandler,
  )

  fastify.get(
    '/admin/users/:id/moderation-history',
    {
      preHandler: [requireAuth, requireModeratorJunior],
      preValidation: validateParams(userIdParams),
    },
    userModerationHistoryHandler,
  )

  fastify.post(
    '/moderation/appeals',
    {
      preHandler: [requireAuth],
      preValidation: validateBody(createAppealSchema),
    },
    createAppealHandler,
  )

  fastify.get(
    '/admin/appeals',
    {
      preHandler: [requireAuth, requireModeratorJunior],
    },
    listAppealsHandler,
  )

  fastify.patch(
    '/admin/appeals/:id',
    {
      preHandler: [requireAuth, requireModeratorAdmin],
      preValidation: [
        validateParams(moderationCaseParamsSchema),
        validateBody(reviewAppealSchema),
      ],
    },
    reviewAppealHandler,
  )
}
