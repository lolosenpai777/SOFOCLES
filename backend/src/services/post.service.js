import { prisma } from '../config/prisma.js'

function normalizePost(post) {
  if (!post) {
    return post
  }

  return {
    ...post,
    imageUrl: post.imageUrl || '',
    likes: (post.likes || []).map((user) => user.id),
    comments: (post.comments || []).map((comment) => ({
      id: comment.id,
      text: comment.text,
      gifUrl: comment.gifUrl,
      createdAt: comment.createdAt,
      author: comment.author,
    })),
  }
}

export async function createPost({ title, content, authorId, imageUrl }) {
  const post = await prisma.post.create({
    data: {
      title,
      content,
      imageUrl: imageUrl || '',
      authorId,
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
      comments: {
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  })

  return normalizePost(post)
}

async function pagedPosts(where, { cursor, limit = 20 } = {}) {
  const take = Math.min(Math.max(Number(limit) || 20, 1), 50)
  const posts = await prisma.post.findMany({
    where: { ...where, hiddenAt: null },
    take: take + 1,
    ...(cursor ? { cursor: { id: Number(cursor) }, skip: 1 } : {}),
    orderBy: { id: 'desc' },
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
            },
          },
        },
      },
    },
  })
  const hasMore = posts.length > take
  const items = (hasMore ? posts.slice(0, take) : posts).map(normalizePost)
  return { items, nextCursor: hasMore ? items.at(-1).id : null }
}

export async function getPosts(options) {
  return pagedPosts({}, options)
}

export async function getPostsFollowing(userId, options) {
  return pagedPosts({
      author: {
        followers: {
          some: {
            id: userId,
          },
        },
      },
    }, options)
}

export async function deletePostByAuthor(postId, authorId) {
  return prisma.post.deleteMany({
    where: {
      id: postId,
      authorId,
    },
  })
}

export async function getPostById(postId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
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
            },
          },
        },
      },
    },
  })

  return post ? normalizePost(post) : null
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
  }

  if (Object.keys(payload).length === 0) {
    return getPostById(postId)
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
            },
          },
        },
      },
    },
  })

  return normalizePost(updated)
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
