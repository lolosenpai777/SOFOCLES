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
      isVerified: true,
      role: true,
      moderationRole: true,
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
      bannerUrl: true,
      websiteUrl: true,
      twitterUrl: true,
      instagramUrl: true,
      accentColor: true,
      isVerified: true,
      role: true,
      moderationRole: true,
      createdAt: true,
      posts: {
        where: viewer?.id
          ? { OR: [{ visibility: 'PUBLIC' }, { authorId: userId }, { visibility: 'FOLLOWERS', author: { followers: { some: { id: Number(viewer.id) } } } }] }
          : { visibility: 'PUBLIC' },
        select: {
          id: true,
          title: true,
          content: true,
          imageUrl: true,
          createdAt: true,
           updatedAt: true,
           pinnedAt: true,
           visibility: true,
           hashtags: true,
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              isVerified: true,
              role: true,
              moderationRole: true,
            },
          },
          likes: {
            select: {
              id: true,
            },
          },
        },
        orderBy: [{ pinnedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      },
      followers: {
        select: { id: true, username: true, avatarUrl: true, isVerified: true, role: true, moderationRole: true },
      },
      following: {
        select: { id: true, username: true, avatarUrl: true, isVerified: true, role: true, moderationRole: true },
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
    bannerUrl: user.bannerUrl || null,
    websiteUrl: user.websiteUrl || null,
    twitterUrl: user.twitterUrl || null,
    instagramUrl: user.instagramUrl || null,
    accentColor: user.accentColor || null,
    isVerified: Boolean(user.isVerified),
    role: user.role,
    moderationRole: user.moderationRole,
    postsCount: user.posts.length,
    followersCount: user.followers.length,
    followingCount: user.following.length,
    followers: user.followers,
    following: user.following,
    warningsCount,
    joinDate: user.createdAt,
    posts: user.posts.map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      pinnedAt: post.pinnedAt,
      visibility: post.visibility,
      hashtags: post.hashtags,
      author: post.author,
      likesCount: post.likes.length,
    })),
  }
}

export async function updateUserProfile(userId, { biography, avatarUrl, bannerUrl, websiteUrl, twitterUrl, instagramUrl, accentColor }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    const err = new Error('Usuario no encontrado')
    err.statusCode = 404
    throw err
  }

  const normalizeLink = (value, platform) => {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (platform === 'twitter' && /^@[\w.]+$/.test(raw)) return `https://x.com/${raw.slice(1)}`
    if (platform === 'instagram' && /^@[\w.]+$/.test(raw)) return `https://instagram.com/${raw.slice(1)}`
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    let hostname
    try { hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '') } catch { throw Object.assign(new Error('Uno de los enlaces sociales no es válido'), { statusCode: 400 }) }
    const allowed = platform === 'twitter' ? ['x.com', 'twitter.com'] : ['instagram.com']
    if (platform && !allowed.includes(hostname)) throw Object.assign(new Error(`El enlace no corresponde a ${platform === 'twitter' ? 'X/Twitter' : 'Instagram'}`), { statusCode: 400 })
    return url
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      biography: biography !== undefined ? biography : user.biography,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : user.avatarUrl,
      bannerUrl: bannerUrl !== undefined ? bannerUrl : user.bannerUrl,
      websiteUrl: websiteUrl !== undefined ? normalizeLink(websiteUrl) : user.websiteUrl,
      twitterUrl: twitterUrl !== undefined ? normalizeLink(twitterUrl, 'twitter') : user.twitterUrl,
      instagramUrl: instagramUrl !== undefined ? normalizeLink(instagramUrl, 'instagram') : user.instagramUrl,
      accentColor: accentColor !== undefined ? accentColor : user.accentColor,
    },
    select: {
      id: true,
      username: true,
      biography: true,
      avatarUrl: true,
      bannerUrl: true,
      websiteUrl: true,
      twitterUrl: true,
      instagramUrl: true,
      accentColor: true,
      email: true,
      isVerified: true,
      role: true,
      moderationRole: true,
    },
  })

  return updated
}

export async function updateUserBadges(userId, { isVerified, role, moderationRole }) {
  const data = {}
  if (isVerified !== undefined) data.isVerified = isVerified
  if (role !== undefined) data.role = role
  if (moderationRole !== undefined) data.moderationRole = moderationRole
  return prisma.user.update({
    where: { id: Number(userId) },
    data,
    select: { id: true, username: true, isVerified: true, role: true, moderationRole: true },
  })
}
