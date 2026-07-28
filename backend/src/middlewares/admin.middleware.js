import { prisma } from '../config/prisma.js'

export async function requireAdmin(request, reply) {
  const user = await prisma.user.findUnique({ where: { id: Number(request.userId) }, select: { role: true } })
  if (user?.role !== 'ADMIN') return reply.code(403).send({ error: 'Se requieren permisos de administración' })
}
