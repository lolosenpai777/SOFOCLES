import { prisma } from '../config/prisma.js'

function normalizePost(post, viewerId) {
  if (!post) {
    return post
  }

  return {
    ...post,
    imageUrl: post.imageUrl || '',
    imageUrls: post.imageUrls?.length ? post.imageUrls : (post.imageUrl ? [post.imageUrl] : []),
    pinnedAt: post.pinnedAt || null,
    visibility: post.visibility || 'PUBLIC',
    hashtags: post.hashtags || [],
    quotedPost: post.quotedPost ? {
      id: post.quotedPost.id,
      title: post.quotedPost.title,
      content: post.quotedPost.content,
      imageUrl: post.quotedPost.imageUrl,
      imageUrls: post.quotedPost.imageUrls || [],
      author: post.quotedPost.author,
      quotedPost: post.quotedPost.quotedPost ? {
        id: post.quotedPost.quotedPost.id,
        title: post.quotedPost.quotedPost.title,
        content: post.quotedPost.quotedPost.content,
        imageUrl: post.quotedPost.quotedPost.imageUrl,
        imageUrls: post.quotedPost.quotedPost.imageUrls || [],
        author: post.quotedPost.quotedPost.author,
      } : null,
    } : null,
    saved: Boolean(viewerId && post.saves?.some((save) => save.userId === Number(viewerId))),
    likes: (post.likes || []).map((user) => user.id),
    comments: (post.comments || []).map((comment) => ({
      id: comment.id,
      parentId: comment.parentId || null,
      text: comment.text,
      gifUrl: comment.gifUrl,
      createdAt: comment.createdAt,
      author: comment.author,
    })),
  }
}

export async function createPost({ title, content, authorId, imageUrl, imageUrls = [], visibility = 'PUBLIC', hashtags = [], quotedPostId = null }) {
  const post = await prisma.post.create({
    data: {
      title,
      content,
      imageUrl: imageUrl || '',
      imageUrls: imageUrls.length ? imageUrls : (imageUrl ? [imageUrl] : []),
      authorId,
      quotedPostId,
      visibility,
      hashtags,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          isVerified: true,
          role: true,
          moderationRole: true,
          email: true,
          createdAt: true,
        },
      },
      likes: {
        select: {
          id: true,
        },
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: {
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
        },
      },
    },
  })

  return normalizePost(post)
}

function visibilityWhere(viewerId) {
  if (!viewerId) return { visibility: 'PUBLIC' }
  return { OR: [{ visibility: 'PUBLIC' }, { authorId: Number(viewerId) }, { visibility: 'FOLLOWERS', author: { followers: { some: { id: Number(viewerId) } } } }] }
}

export async function createQuotePost({ postId, title = null, content, authorId }) {
  const cleanContent = String(content || '').trim()
  if (!cleanContent) throw Object.assign(new Error('Escribe un comentario para tu cita'), { statusCode: 400 })
  const original = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, title: true, content: true, imageUrl: true, imageUrls: true, author: { select: { id: true, username: true, avatarUrl: true, isVerified: true, role: true, moderationRole: true } }, quotedPost: { select: { id: true, title: true, content: true, imageUrl: true, imageUrls: true, author: { select: { id: true, username: true, avatarUrl: true, isVerified: true, role: true, moderationRole: true } } } } } })
  if (!original) throw Object.assign(new Error('Post original no encontrado'), { statusCode: 404 })
  return { ...(await createPost({ title, content: cleanContent, authorId, quotedPostId: original.id })), quotedPost: original }
}

async function pagedPosts(where, { cursor, limit = 20 } = {}, viewerId) {
  const take = Math.min(Math.max(Number(limit) || 20, 1), 50)
  const posts = await prisma.post.findMany({
    where: { ...where, hiddenAt: null },
    take: take + 1,
    ...(cursor ? { cursor: { id: Number(cursor) }, skip: 1 } : {}),
    orderBy: { id: 'desc' },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true, email: true, createdAt: true, isVerified: true, role: true, moderationRole: true } },
      quotedPost: { include: { author: { select: { id: true, username: true, avatarUrl: true, isVerified: true, role: true, moderationRole: true } }, quotedPost: { include: { author: { select: { id: true, username: true, avatarUrl: true, isVerified: true, role: true, moderationRole: true } } } } } },
      saves: viewerId ? { where: { userId: Number(viewerId) }, select: { userId: true } } : false,
      likes: { select: { id: true } },
      comments: { orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, username: true, avatarUrl: true, isVerified: true, role: true, moderationRole: true } } } },
    },
  })
  const hasMore = posts.length > take
  const items = (hasMore ? posts.slice(0, take) : posts).map((post) => normalizePost(post, viewerId))
  return { items, nextCursor: hasMore ? items.at(-1).id : null }
}

export async function getPosts(options = {}, viewerId) {
  const hashtag = String(options.hashtag || '').replace(/^#/, '').trim().toLowerCase()
  return pagedPosts({ ...visibilityWhere(viewerId), ...(hashtag ? { hashtags: { has: hashtag } } : {}) }, options, viewerId)
}

export async function getPostsFollowing(userId, options, viewerId = userId) {
  return pagedPosts({
      author: {
        followers: {
          some: {
            id: userId,
          },
        },
      },
    }, options, viewerId)
}

export async function deletePostByAuthor(postId, authorId) {
  return prisma.post.deleteMany({
    where: {
      id: postId,
      authorId,
    },
  })
}

export async function getPostById(postId, viewerId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      quotedPost: { include: { author: { select: { id: true, username: true, avatarUrl: true, isVerified: true, role: true, moderationRole: true } }, quotedPost: { include: { author: { select: { id: true, username: true, avatarUrl: true, isVerified: true, role: true, moderationRole: true } } } } } },
      author: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          isVerified: true,
          role: true,
          moderationRole: true,
          email: true,
          createdAt: true,
        },
      },
      saves: viewerId ? { where: { userId: Number(viewerId) }, select: { userId: true } } : false,
      likes: {
        select: {
          id: true,
        },
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: {
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
        },
      },
    },
  })

  if (!post) return null
  if (post.visibility === 'FOLLOWERS' && Number(post.authorId) !== Number(viewerId)) {
    const canView = viewerId && await prisma.user.count({ where: { id: Number(viewerId), following: { some: { id: post.authorId } } } })
    if (!canView) throw Object.assign(new Error('Esta publicación es solo para seguidores'), { statusCode: 403 })
  }
  return normalizePost(post, viewerId)
}

export async function updatePostByAuthor(postId, authorId, updates) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  })

  if (!post) {
    const error = new Error('Post no encontrado')
    error.statusCode = 404
    throw error
  }

  if (post.authorId !== authorId) {
    const error = new Error('No puedes editar un post que no te pertenece')
    error.statusCode = 403
    throw error
  }

  const payload = {
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.content !== undefined ? { content: updates.content } : {}),
    ...(updates.imageUrl !== undefined ? { imageUrl: updates.imageUrl } : {}),
    ...(updates.imageUrls !== undefined ? { imageUrls: updates.imageUrls } : {}),
    ...(updates.visibility !== undefined ? { visibility: updates.visibility } : {}),
    ...(updates.hashtags !== undefined ? { hashtags: updates.hashtags } : {}),
  }

  if (Object.keys(payload).length === 0) {
    return getPostById(postId, authorId)
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: payload,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          email: true,
          createdAt: true,
        },
      },
      likes: {
        select: {
          id: true,
        },
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: {
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
        },
      },
    },
  })

  return normalizePost(updated, authorId)
}

export async function togglePostSave(postId, userId) {
  const existing = await prisma.postSave.findUnique({ where: { userId_postId: { userId, postId } } })
  if (existing) {
    await prisma.postSave.delete({ where: { userId_postId: { userId, postId } } })
    return { saved: false }
  }
  await prisma.postSave.create({ data: { userId, postId } })
  return { saved: true }
}

export async function getSavedPosts(userId, options = {}) {
  const rows = await prisma.postSave.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { post: { include: { author: { select: { id: true, username: true, avatarUrl: true, email: true, createdAt: true, isVerified: true, role: true, moderationRole: true } }, saves: { where: { userId }, select: { userId: true } }, likes: { select: { id: true } }, comments: { orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, username: true, avatarUrl: true, isVerified: true, role: true, moderationRole: true } } } } } } } })
  return { items: rows.map(({ post }) => normalizePost(post, userId)), nextCursor: null }
}

export async function togglePinnedPost(postId, authorId) {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true, pinnedAt: true } })
  if (!post) throw Object.assign(new Error('Post no encontrado'), { statusCode: 404 })
  if (post.authorId !== authorId) throw Object.assign(new Error('No puedes fijar un post que no te pertenece'), { statusCode: 403 })
  if (post.pinnedAt) return prisma.post.update({ where: { id: postId }, data: { pinnedAt: null } })
  await prisma.post.updateMany({ where: { authorId, pinnedAt: { not: null } }, data: { pinnedAt: null } })
  return prisma.post.update({ where: { id: postId }, data: { pinnedAt: new Date() } })
}

export async function togglePostLike(postId, userId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      likes: {
        select: {
          id: true,
        },
      },
      author: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          email: true,
          createdAt: true,
        },
      },
    },
  })

  if (!post) {
    const error = new Error('Post no encontrado')
    error.statusCode = 404
    throw error
  }

  const yaTieneLike = post.likes.some((like) => like.id === userId)

  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      likes: yaTieneLike
        ? {
            disconnect: { id: userId },
          }
        : {
            connect: { id: userId },
          },
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          email: true,
          createdAt: true,
        },
      },
      likes: {
        select: {
          id: true,
        },
      },
    },
  })

  return {
    post: normalizePost(updatedPost),
    liked: !yaTieneLike,
  }
}
