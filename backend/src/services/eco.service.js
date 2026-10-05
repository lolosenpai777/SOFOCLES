import { prisma } from '../config/prisma.js'
import { storePrivateImage } from './storage.service.js'

const MIN_INTERESTS = 6
const VALID_INTERESTS = new Set([
  'filosofia', 'pintura', 'arquitectura', 'poesia', 'historia', 'etica', 'debate',
  'cosmologia', 'literatura', 'politica', 'musica', 'psicologia', 'ciencia', 'cine',
  'escultura', 'matematicas', 'mitologia', 'teatro',
])
const NAMES = {
  femenino: ['Atenea', 'Hipatia de Alejandría', 'Artemisia Gentileschi', 'Zaha Hadid'],
  masculino: ['Sócrates', 'Platón', 'Caravaggio', 'Vitruvio'],
  neutro: ['Oráculo de Delfos', 'Esfinge del Ágora', 'Cosmos Primordial'],
}
const MASKS = ['🎭', '🏛️', '🎨', '📐', '📜', '🏺']

function ecoError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode })
}

function normalizeGender(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!['femenino', 'masculino', 'neutro'].includes(normalized)) {
    throw ecoError('El género declarado no es válido')
  }
  return normalized
}

function normalizeInterests(interests) {
  if (!Array.isArray(interests)) throw ecoError('Los intereses deben ser una lista')
  const normalized = [...new Set(interests.map((item) => String(item).trim().toLowerCase()))]
  if (normalized.some((item) => !VALID_INTERESTS.has(item))) throw ecoError('Hay intereses no admitidos')
  if (normalized.length < MIN_INTERESTS) throw ecoError(`Debes seleccionar al menos ${MIN_INTERESTS} intereses`)
  return normalized
}

function publicProfile(profile) {
  if (!profile) return null
  const expired = profile.ageStatus === 'PENDING' && profile.ageVerificationDeadline <= new Date()
  return {
    id: profile.id,
    alias: profile.alias,
    mascara: profile.mascara,
    genderDeclared: profile.genderDeclared,
    genderConfirmed: profile.genderConfirmed,
    ageStatus: expired ? 'EXPIRED' : profile.ageStatus,
    ageVerificationDeadline: profile.ageVerificationDeadline,
    interests: profile.interests,
    tourCompleted: profile.tourCompleted,
    canChat: !expired,
  }
}

async function getProfileByUserId(userId) {
  const profile = await prisma.ecoProfile.findUnique({ where: { userId: Number(userId) } })
  if (profile?.ageStatus === 'PENDING' && profile.ageVerificationDeadline <= new Date()) {
    return prisma.ecoProfile.update({ where: { id: profile.id }, data: { ageStatus: 'EXPIRED' } })
  }
  return profile
}

export async function getEcoProfile(userId) {
  return publicProfile(await getProfileByUserId(userId))
}

export async function createEcoProfile(userId, body) {
  const existing = await getProfileByUserId(userId)
  if (existing) return publicProfile(existing)

  const genderDeclared = normalizeGender(body.genderDeclared)
  if (body.genderConfirmed !== true) throw ecoError('Debes confirmar formalmente tu género declarado')
  const baseName = NAMES[genderDeclared][Math.floor(Math.random() * NAMES[genderDeclared].length)]
  const alias = `${baseName} del Ágora`
  const profile = await prisma.ecoProfile.create({
    data: {
      userId: Number(userId),
      alias,
      mascara: MASKS[Math.floor(Math.random() * MASKS.length)],
      genderDeclared,
      genderConfirmed: true,
      ageVerificationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })
  return publicProfile(profile)
}

export async function saveEcoInterests(userId, interests) {
  const profile = await getProfileByUserId(userId)
  if (!profile) throw ecoError('Primero debes crear tu perfil Eco', 404)
  const normalized = normalizeInterests(interests)
  const updated = await prisma.ecoProfile.update({ where: { id: profile.id }, data: { interests: normalized } })
  return publicProfile(updated)
}

export async function completeEcoTour(userId) {
  const profile = await getProfileByUserId(userId)
  if (!profile) throw ecoError('Primero debes crear tu perfil Eco', 404)
  const updated = await prisma.ecoProfile.update({ where: { id: profile.id }, data: { tourCompleted: true } })
  return publicProfile(updated)
}

export async function submitAgeDocument(userId, imageData) {
  const profile = await getProfileByUserId(userId)
  if (!profile) throw ecoError('Primero debes crear tu perfil Eco', 404)
  if (!imageData) throw ecoError('La fotografía del documento es obligatoria')
  if (profile.ageStatus === 'VERIFIED') return publicProfile(profile)
  const url = await storePrivateImage(imageData, 'eco-document')
  const updated = await prisma.ecoProfile.update({
    where: { id: profile.id },
    data: { ageDocumentUrl: url, ageStatus: 'SUBMITTED' },
  })
  return publicProfile(updated)
}

export async function reviewEcoAgeDocument(userId, status) {
  if (!['VERIFIED', 'REJECTED'].includes(status)) throw ecoError('Estado de verificación no válido')
  const profile = await prisma.ecoProfile.findUnique({ where: { userId: Number(userId) } })
  if (!profile) throw ecoError('Perfil Eco no encontrado', 404)
  if (status === 'VERIFIED' && !profile.ageDocumentUrl) throw ecoError('No existe un documento enviado')
  const updated = await prisma.ecoProfile.update({ where: { id: profile.id }, data: { ageStatus: status } })
  return publicProfile(updated)
}

export async function matchEcoConversation(userId) {
  const ownProfile = await assertEcoChatAccess(userId)
  const candidates = await prisma.ecoProfile.findMany({
    where: { id: { not: ownProfile.id }, ageStatus: { in: ['PENDING', 'SUBMITTED', 'VERIFIED'] }, interests: { isEmpty: false } },
  })
  if (!candidates.length) throw ecoError('Todavía no hay perfiles compatibles disponibles', 404)
  const ownInterests = new Set(ownProfile.interests)
  const candidate = candidates
    .map((profile) => {
      const common = profile.interests.filter((interest) => ownInterests.has(interest)).length
      const union = new Set([...ownProfile.interests, ...profile.interests]).size
      return { profile, score: union ? Math.round((common / union) * 100) : 0 }
    })
    .sort((left, right) => right.score - left.score)[0]
  const existing = await prisma.ecoConversation.findFirst({ where: { participants: { every: { profileId: { in: [ownProfile.id, candidate.profile.id] } } }, status: 'ACTIVE' } })
  if (existing) return existing
  return prisma.ecoConversation.create({
    data: {
      compatibility: candidate.score,
      participants: { create: [{ profileId: ownProfile.id }, { profileId: candidate.profile.id }] },
    },
    include: { participants: { include: { profile: { select: { id: true, alias: true, mascara: true, interests: true } } } } },
  })
}

export async function assertEcoChatAccess(userId) {
  const profile = await getProfileByUserId(userId)
  if (!profile) throw ecoError('Debes configurar tu perfil Eco antes de chatear', 403)
  if (profile.ageStatus === 'EXPIRED') throw ecoError('Tu plazo de verificación de edad expiró', 403)
  if (profile.interests.length < MIN_INTERESTS) throw ecoError(`Debes seleccionar al menos ${MIN_INTERESTS} intereses`, 403)
  return profile
}

export async function listEcoConversations(userId) {
  const profile = await assertEcoChatAccess(userId)
  return prisma.ecoConversation.findMany({
    where: { participants: { some: { profileId: profile.id } } },
    orderBy: { updatedAt: 'desc' },
    include: {
      participants: { include: { profile: { select: { id: true, alias: true, mascara: true, interests: true } } } },
      messages: { take: 50, orderBy: { createdAt: 'asc' }, include: { reactions: true, quotedMessage: { select: { id: true, content: true } } } },
    },
  })
}

export async function createEcoMessage(userId, conversationId, body) {
  const profile = await assertEcoChatAccess(userId)
  const participant = await prisma.ecoParticipant.findUnique({ where: { conversationId_profileId: { conversationId, profileId: profile.id } } })
  if (!participant) throw ecoError('No tienes acceso a esta conversación', 403)
  const content = String(body.content ?? '').trim()
  if (!content && !body.attachmentUrl) throw ecoError('El mensaje debe tener texto o un adjunto')
  const message = await prisma.ecoMessage.create({
    data: {
      conversationId,
      authorProfileId: profile.id,
      content,
      attachmentUrl: body.attachmentUrl || null,
      quotedMessageId: body.quotedMessageId || null,
    },
    include: { reactions: true, quotedMessage: { select: { id: true, content: true } } },
  })
  await prisma.ecoConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
  return message
}

export async function toggleEcoReaction(userId, messageId, emoji) {
  const profile = await assertEcoChatAccess(userId)
  if (!['👍', '❤️', '💡', '🏛️', '🎭', '👏'].includes(emoji)) throw ecoError('Reacción no admitida')
  const message = await prisma.ecoMessage.findUnique({ where: { id: messageId }, include: { conversation: { include: { participants: true } } } })
  if (!message || !message.conversation.participants.some((item) => item.profileId === profile.id)) throw ecoError('Mensaje no encontrado', 404)
  const existing = await prisma.ecoReaction.findUnique({ where: { messageId_profileId_emoji: { messageId, profileId: profile.id, emoji } } })
  if (existing) await prisma.ecoReaction.delete({ where: { id: existing.id } })
  else await prisma.ecoReaction.create({ data: { messageId, profileId: profile.id, emoji } })
  return { active: !existing }
}
