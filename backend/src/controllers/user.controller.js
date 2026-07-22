import { searchUsersByUsername, toggleFollow, getUserProfile, updateUserProfile } from '../services/user.service.js'
import { prisma } from '../config/prisma.js'

export async function meHandler(request) {
  const userId = request.userId ?? Number(request.user?.sub)

  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      id: true,
      username: true,
      email: true,
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
      following: (user.following || []).map((u) => u.id),
    },
  }
}

export async function getUsersHandler(request, reply) {
  const q = request.query?.search || ''
  const users = await searchUsersByUsername(q)
  return { users }
}

export async function followUserHandler(request, reply) {
  const currentUserId = request.userId
  const targetUserId = Number(request.params.id)

  const result = await toggleFollow(currentUserId, targetUserId)

  return reply.code(200).send({ success: true, ...result })
}

export async function getProfileHandler(request, reply) {
  const userId = Number(request.params.id)
  const profile = await getUserProfile(userId)
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