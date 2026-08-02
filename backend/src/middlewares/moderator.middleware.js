import { prisma } from '../config/prisma.js'

function isAtLeastJunior(user) {
  return user?.role === 'ADMIN' || user?.moderationRole === 'JUNIOR' || user?.moderationRole === 'ADMIN'
}

function isAdminModerator(user) {
  return user?.role === 'ADMIN' || user?.moderationRole === 'ADMIN'
}

export async function requireModeratorJunior(request, reply) {
  const user = await prisma.user.findUnique({
    where: { id: Number(request.userId) },
    select: { id: true, role: true, moderationRole: true },
  })

  if (!isAtLeastJunior(user)) {
    return reply.code(403).send({ error: 'Se requieren permisos de moderación' })
  }

  request.moderator = user
}

export async function requireModeratorAdmin(request, reply) {
  const user = await prisma.user.findUnique({
    where: { id: Number(request.userId) },
    select: { id: true, role: true, moderationRole: true },
  })

  if (!isAdminModerator(user)) {
    return reply.code(403).send({ error: 'Se requieren permisos de moderación avanzados' })
  }

  request.moderator = user
}
