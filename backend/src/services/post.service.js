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

export async function getPosts() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
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

  return posts.map(normalizePost)
}

export async function getPostsFollowing(userId) {
  const posts = await prisma.post.findMany({
    where: {
      author: {
        followers: {
          some: {
            id: userId,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
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

  return posts.map(normalizePost)
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
  return prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
    },
  })
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
