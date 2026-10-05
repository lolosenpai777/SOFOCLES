import { z } from 'zod'
import {
  createEcoProfileHandler,
  ecoAgeDocumentHandler,
  ecoConversationsHandler,
  ecoAgeReviewHandler,
  ecoInterestsHandler,
  ecoMatchHandler,
  ecoMessageHandler,
  ecoProfileHandler,
  ecoReactionHandler,
  ecoTourHandler,
} from '../controllers/eco.controller.js'
import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireModeratorJunior } from '../middlewares/moderator.middleware.js'
import { validateBody, validateParams } from '../middlewares/validate-schema.middleware.js'

const profileSchema = z.object({
  genderDeclared: z.enum(['femenino', 'masculino', 'neutro']),
  genderConfirmed: z.literal(true),
})
const interestsSchema = z.object({ interests: z.array(z.string()).min(6) })
const documentSchema = z.object({ imageData: z.string().max(12 * 1024 * 1024) })
const messageSchema = z.object({
  content: z.string().trim().max(500).optional().default(''),
  attachmentUrl: z.string().url().optional().nullable(),
  quotedMessageId: z.string().uuid().optional().nullable(),
})
const reactionSchema = z.object({ emoji: z.string().min(1).max(4) })
const conversationParams = z.object({ id: z.string().uuid() })
const messageParams = z.object({ id: z.string().uuid() })
const userParams = z.object({ userId: z.coerce.number().int().positive() })
const ageReviewSchema = z.object({ status: z.enum(['VERIFIED', 'REJECTED']) })

const auth = { preHandler: [requireAuth] }

export async function ecoRoutes(fastify) {
  fastify.get('/eco/profile', auth, ecoProfileHandler)
  fastify.post('/eco/profile', { ...auth, preValidation: validateBody(profileSchema) }, createEcoProfileHandler)
  fastify.put('/eco/profile/interests', { ...auth, preValidation: validateBody(interestsSchema) }, ecoInterestsHandler)
  fastify.post('/eco/profile/tour', auth, ecoTourHandler)
  fastify.get('/eco/verification/status', auth, ecoProfileHandler)
  fastify.post('/eco/verification/document', { ...auth, preValidation: validateBody(documentSchema) }, ecoAgeDocumentHandler)
  fastify.patch('/eco/admin/profiles/:userId/age-status', { preHandler: [requireAuth, requireModeratorJunior], preValidation: [validateParams(userParams), validateBody(ageReviewSchema)] }, ecoAgeReviewHandler)
  fastify.get('/eco/chats', auth, ecoConversationsHandler)
  fastify.post('/eco/chats/match', auth, ecoMatchHandler)
  fastify.post('/eco/chats/:id/messages', { ...auth, preValidation: [validateParams(conversationParams), validateBody(messageSchema)] }, ecoMessageHandler)
  fastify.post('/eco/messages/:id/reactions', { ...auth, preValidation: [validateParams(messageParams), validateBody(reactionSchema)] }, ecoReactionHandler)
}
