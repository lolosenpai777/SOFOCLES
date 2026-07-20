import { prisma } from '../config/prisma.js'

export async function createPost({ title, content, authorId }) {
  return prisma.post.create({
    data: {
      title,
      content,
      authorId,
    },
  })
}

export async function getPosts() {
  return prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
        },
      },
    },
  })
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
