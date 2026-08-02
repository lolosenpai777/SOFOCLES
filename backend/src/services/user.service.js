import { prisma } from '../config/prisma.js'
import { normalizeUsername } from '../schemas/shared/username.schema.js'
import { findUsernameConflict } from './username.service.js'

export async function updateUsername(userId, username) {
  const user = await prisma.user.findUnique({ where: { id: Number(userId) } })
  if (!user) {
    const error = new Error('Usuario no encontrado')
    error.statusCode = 404
    throw error
  }

  // Preserve the existing display normalization, but compare lowercase values to prevent visual duplicates.
  if (await findUsernameConflict(username, user.id)) {
    const conflict = new Error('Ese nombre de usuario ya está en uso')
    conflict.statusCode = 409
    throw conflict
  }

  try {
    return await prisma.user.update({
      where: { id: user.id },
      data: { username: normalizeUsername(username), needsUsernameSetup: false },
      select: { id: true, username: true, email: true, needsUsernameSetup: true },
    })
  } catch (error) {
    if (error.code === 'P2002') {
      const conflict = new Error('Ese nombre de usuario ya está en uso')
      conflict.statusCode = 409
      throw conflict
    }
    throw error
  }
}

export async function generateUniqueUsername(displayName, fallback = 'Usuario') {
  const base = String(displayName || fallback)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .slice(0, 32) || fallback

  let username = base
  let suffix = 1
  while (await findUsernameConflict(username)) {
    username = `${base.slice(0, 39 - String(suffix).length)}${suffix}`
    suffix += 1
  }
  return username
}

export async function searchUsersByUsername(q, { cursor, limit = 20 } = {}) {
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
    take: Math.min(Math.max(Number(limit) || 20, 1), 50) + 1,
    ...(cursor ? { cursor: { id: Number(cursor) }, skip: 1 } : {}),
    orderBy: { id: 'desc' },
  })
  const take = Math.min(Math.max(Number(limit) || 20, 1), 50)
  const hasMore = users.length > take
  const items = hasMore ? users.slice(0, take) : users
  return { items, nextCursor: hasMore ? items.at(-1).id : null }
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

function isModeratorViewer(viewer) {
  if (!viewer) return false
  return (
    viewer.role === 'ADMIN' ||
    viewer.moderationRole === 'ADMIN' ||
    viewer.moderationRole === 'JUNIOR'
  )
}

export async function getUserProfile(userId, viewer = null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      biography: true,
      avatarUrl: true,
      createdAt: true,
      posts: {
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          likes: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      followers: {
        select: { id: true },
      },
      following: {
        select: { id: true },
      },
    },
  })

  if (!user) {
    const err = new Error('Usuario no encontrado')
    err.statusCode = 404
    throw err
  }

  let warningsCount = null
  if (isModeratorViewer(viewer)) {
    warningsCount = await prisma.userWarning.count({
      where: { userId: user.id },
    })
  }

  return {
    id: user.id,
    username: user.username,
    biography: user.biography || '',
    avatarUrl: user.avatarUrl || null,
    postsCount: user.posts.length,
    followersCount: user.followers.length,
    followingCount: user.following.length,
    warningsCount,
    joinDate: user.createdAt,
    posts: user.posts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author,
      likesCount: post.likes.length,
    })),
  }
}

export async function updateUserProfile(userId, { biography, avatarUrl }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    const err = new Error('Usuario no encontrado')
    err.statusCode = 404
    throw err
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      biography: biography !== undefined ? biography : user.biography,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl,
    },
    select: {
      id: true,
      username: true,
      biography: true,
      avatarUrl: true,
      email: true,
    },
  })

  return updated
}
