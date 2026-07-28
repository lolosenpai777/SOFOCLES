import { prisma } from '../config/prisma.js'

export async function createReport(reporterId, { postId, userId, reason, details }) {
  if (Boolean(postId) === Boolean(userId)) throw Object.assign(new Error('Debes reportar exactamente una publicación o un usuario'), { statusCode: 400 })
  const target = postId ? await prisma.post.findUnique({ where: { id: Number(postId) } }) : await prisma.user.findUnique({ where: { id: Number(userId) } })
  if (!target) throw Object.assign(new Error('El contenido reportado no existe'), { statusCode: 404 })
  if (postId && target.authorId === reporterId) throw Object.assign(new Error('No puedes reportar tu propia publicación'), { statusCode: 400 })
  if (userId && target.id === reporterId) throw Object.assign(new Error('No puedes reportarte a ti mismo'), { statusCode: 400 })
  return prisma.report.create({ data: { reporterId, postId: postId ? Number(postId) : null, reportedUserId: userId ? Number(userId) : null, reason, details: details || null } })
}

export async function toggleRelation(model, ownerField, targetField, ownerId, targetId) {
  if (ownerId === targetId) throw Object.assign(new Error('No puedes aplicar esta acción sobre tu propia cuenta'), { statusCode: 400 })
  const target = await prisma.user.findUnique({ where: { id: targetId } })
  if (!target) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 })
  const key = { [ownerField]: ownerId, [targetField]: targetId }
  const existing = await prisma[model].findUnique({ where: { [`${ownerField}_${targetField}`]: key } })
  if (existing) { await prisma[model].delete({ where: { [`${ownerField}_${targetField}`]: key } }); return false }
  await prisma[model].create({ data: key }); return true
}

export async function getReports({ cursor, limit = 20, status }) {
  const take = Math.min(Math.max(Number(limit) || 20, 1), 50)
  const rows = await prisma.report.findMany({ where: status ? { status } : {}, take: take + 1, ...(cursor ? { cursor: { id: Number(cursor) }, skip: 1 } : {}), orderBy: { id: 'desc' }, include: { reporter: { select: { id: true, username: true } }, reportedUser: { select: { id: true, username: true } }, post: { select: { id: true, title: true, hiddenAt: true } } } })
  const hasMore = rows.length > take
  return { items: hasMore ? rows.slice(0, take) : rows, nextCursor: hasMore ? rows[take - 1].id : null }
}

export async function resolveReport(id, { status, removeContent }) {
  const report = await prisma.report.findUnique({ where: { id: Number(id) } })
  if (!report) throw Object.assign(new Error('Reporte no encontrado'), { statusCode: 404 })
  await prisma.$transaction([
    prisma.report.update({ where: { id: report.id }, data: { status, reviewedAt: new Date() } }),
    ...(removeContent && report.postId ? [prisma.post.update({ where: { id: report.postId }, data: { hiddenAt: new Date() } })] : []),
  ])
}
