import { prisma } from '../config/prisma.js'

export async function searchUsersByUsername(q) {
  const where = q
    ? {
        username: {
          contains: q,
          mode: 'insensitive',
        },
      }
    : {}

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
    },
    take: 50,
  })

  return users
}

export async function toggleFollow(currentUserId, targetUserId) {
  if (currentUserId === targetUserId) {
    const err = new Error('No puedes seguirte a ti mismo')
    err.statusCode = 400
    throw err
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!target) {
    const err = new Error('Usuario no encontrado')
    err.statusCode = 404
    throw err
  }

  const alreadyFollowing = await prisma.user.findFirst({
    where: {
      id: currentUserId,
      following: {
        some: {
          id: targetUserId,
        },
      },
    },
  })

  if (alreadyFollowing) {
    await prisma.user.update({
      where: { id: currentUserId },
      data: {
        following: {
          disconnect: { id: targetUserId },
        },
      },
    })

    return { following: false }
  }

  await prisma.user.update({
    where: { id: currentUserId },
    data: {
      following: {
        connect: { id: targetUserId },
      },
    },
  })

  return { following: true }
}
