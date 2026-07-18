import { createPost, getPosts } from '../services/post.service.js'
import { prisma } from '../config/prisma.js'

export async function createPostHandler(request, reply) {
  try {
    request.log.info({ body: request.body }, 'createPost request body')
    const { title, content } = request.body
    const authorId = request.userId

    if (!authorId) {
      return reply.code(401).send({ mensaje: 'No autorizado' })
    }

    const author = await prisma.user.findUnique({ where: { id: authorId } })
    if (!author) {
      return reply.code(401).send({ mensaje: 'Usuario no autorizado' })
    }

    if (!title || !String(title).trim()) {
      return reply.code(400).send({ mensaje: 'El título es obligatorio' })
    }

    if (content == null || !String(content).trim()) {
      return reply.code(400).send({ mensaje: 'El contenido es obligatorio' })
    }

    const post = await createPost({ title, content, authorId })

    return reply.code(201).send({ mensaje: 'Post creado', post })
  } catch (error) {
    request.log.error(error)
    const statusCode = error.statusCode ?? 500
    return reply.code(statusCode).send({ mensaje: error.message || 'Error al crear post' })
  }
}

export async function listPostsHandler(request, reply) {
  try {
    const posts = await getPosts()
    return reply.send({ posts })
  } catch (error) {
    const statusCode = error.statusCode ?? 500
    return reply.code(statusCode).send({ mensaje: error.message || 'Error al obtener posts' })
  }
}
