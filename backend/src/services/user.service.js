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

export async function getUserProfile(userId) {
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

  return {
    id: user.id,
    username: user.username,
    biography: user.biography || '',
    avatarUrl: user.avatarUrl || null,
    postsCount: user.posts.length,
    followersCount: user.followers.length,
    followingCount: user.following.length,
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
