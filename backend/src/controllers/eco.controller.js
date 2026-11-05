import {
  completeEcoTour,
  createEcoMessage,
  createEcoProfile,
  getEcoProfile,
  getEcoAgeDocumentForReview,
  listEcoAgeDocumentsForReview,
  listEcoConversations,
  matchEcoConversation,
  reportEcoConversation,
  reviewEcoAgeDocument,
  saveEcoInterests,
  submitAgeDocument,
  toggleEcoReaction,
} from '../services/eco.service.js'

export async function ecoProfileHandler(request, reply) {
  const profile = await getEcoProfile(request.userId)
  return { profile }
}

export async function createEcoProfileHandler(request, reply) {
  const profile = await createEcoProfile(request.userId, request.body)
  return reply.code(201).send({ profile })
}

export async function ecoInterestsHandler(request) {
  return { profile: await saveEcoInterests(request.userId, request.body.interests) }
}

export async function ecoTourHandler(request) {
  return { profile: await completeEcoTour(request.userId) }
}

export async function ecoAgeDocumentHandler(request) {
  return { profile: await submitAgeDocument(request.userId, request.body.imageData) }
}

export async function ecoAgeReviewHandler(request) {
  return { profile: await reviewEcoAgeDocument(request.params.userId, request.body.status) }
}

export async function ecoAgeDocumentsForReviewHandler() {
  return { documents: await listEcoAgeDocumentsForReview() }
}

export async function ecoAgeDocumentForReviewHandler(request, reply) {
  const image = await getEcoAgeDocumentForReview(request.params.userId)
  return reply.type('image/webp').header('Cache-Control', 'no-store').send(image)
}

export async function ecoConversationReportHandler(request, reply) {
  const report = await reportEcoConversation(request.userId, request.params.id, request.body)
  return reply.code(201).send({ report })
}

export async function ecoConversationsHandler(request) {
  return { conversations: await listEcoConversations(request.userId) }
}

export async function ecoMatchHandler(request, reply) {
  return reply.code(201).send({ conversation: await matchEcoConversation(request.userId) })
}

export async function ecoMessageHandler(request, reply) {
  const message = await createEcoMessage(request.userId, request.params.id, request.body)
  return reply.code(201).send({ message })
}

export async function ecoReactionHandler(request) {
  return toggleEcoReaction(request.userId, request.params.id, request.body.emoji)
}
