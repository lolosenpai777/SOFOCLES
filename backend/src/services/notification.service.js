import { prisma } from '../config/prisma.js'

export async function createNotification(recipientId, { actorId = null, type, content = null, postId = null, commentId = null }) {
  if (!recipientId || !type) throw Object.assign(new Error('recipientId and type required'), { statusCode: 400 })
  return prisma.notification.create({ data: { userId: Number(recipientId), actorId: actorId ? Number(actorId) : null, type, content, postId: postId ? Number(postId) : null, commentId: commentId ? Number(commentId) : null } })
}

export async function listNotificationsForUser(userId, { cursor, limit = 30 } = {}) {
  const take = Math.min(Math.max(Number(limit) || 30, 1), 100)
  const rows = await prisma.notification.findMany({ where: { userId: Number(userId) }, take: take + 1, ...(cursor ? { cursor: { id: Number(cursor) }, skip: 1 } : {}), orderBy: { createdAt: 'desc' }, include: { actor: { select: { id: true, username: true, avatarUrl: true } } } })
  const hasMore = rows.length > take
  return { items: hasMore ? rows.slice(0, take) : rows, nextCursor: hasMore ? rows[take - 1].id : null }
}

export async function markNotificationRead(notificationId, userId) {
  const n = await prisma.notification.findUnique({ where: { id: Number(notificationId) } })
  if (!n || n.userId !== Number(userId)) throw Object.assign(new Error('Notificación no encontrada'), { statusCode: 404 })
  return prisma.notification.update({ where: { id: Number(notificationId) }, data: { read: true } })
}

export async function markAllNotificationsRead(userId) {
  return prisma.notification.updateMany({ where: { userId: Number(userId), read: false }, data: { read: true } })
}
