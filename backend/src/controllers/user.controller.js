import { searchUsersByUsername, toggleFollow, getUserProfile, updateUserProfile, updateUsername } from '../services/user.service.js'
import { prisma } from '../config/prisma.js'
import { createNotification } from '../services/notification.service.js'

export async function meHandler(request) {
  const userId = request.userId ?? Number(request.user?.sub)

  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      moderationRole: true,
      needsUsernameSetup: true,
      following: {
        select: { id: true },
      },
    },
  })

  return {
    mensaje: 'Token válido',
    usuario: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      moderationRole: user.moderationRole,
      needsUsernameSetup: Boolean(user.needsUsernameSetup),
      following: (user.following || []).map((u) => u.id),
    },
  }
}

export async function updateUsernameHandler(request, reply) {
  const updated = await updateUsername(request.userId, request.body.username)
  return reply.send({ success: true, usuario: updated })
}

export async function getUsersHandler(request, reply) {
  const q = request.query?.search || ''
  const result = await searchUsersByUsername(q, request.query)
  return { users: result.items, nextCursor: result.nextCursor }
}

export async function followUserHandler(request, reply) {
  const currentUserId = request.userId
  const targetUserId = Number(request.params.id)

  const result = await toggleFollow(currentUserId, targetUserId)

  try {
    if (result.following) {
      await createNotification(targetUserId, { actorId: currentUserId, type: 'FOLLOW', content: `@${request.user?.username || 'alguien'} te sigue` })
    }
  } catch (err) {
    request.log.warn('No se pudo crear notificación de follow', err)
  }

  return reply.code(200).send({ success: true, ...result })
}

export async function getProfileHandler(request, reply) {
  const userId = Number(request.params.id)
  let viewer = null
  if (request.headers?.authorization) {
    try {
      await request.jwtVerify()
      viewer = {
        id: Number(request.user?.sub),
        role: request.user?.role,
        moderationRole: request.user?.moderationRole,
      }
    } catch {
      viewer = null
    }
  }

  const profile = await getUserProfile(userId, viewer)
  return reply.code(200).send(profile)
}

export async function updateProfileHandler(request, reply) {
  const userId = request.userId
  const { biography, avatarUrl } = request.body

  const updated = await updateUserProfile(userId, { biography, avatarUrl })
  return reply.code(200).send({
    success: true,
    user: updated,
  })
}
