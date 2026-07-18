import { createPost, getPosts } from '../services/post.service.js'
import { prisma } from '../config/prisma.js'

export async function createPostHandler(request, reply) {
  try {
    request.log.info({ body: request.body }, 'createPost request body')
    const { title, content } = request.body
    const authorId = request.userId

    if (!authorId) {
      return reply.code(401).send({ error: 'No autenticado' })
    }

    const author = await prisma.user.findUnique({ where: { id: authorId } })
    if (!author) {
      return reply.code(401).send({ error: 'Usuario no autorizado' })
    }

    if (!title || !String(title).trim()) {
      return reply.code(400).send({ error: 'El titulo es obligatorio' })
    }

    const post = await createPost({ title, content, authorId })

    return reply.code(201).send({ mensaje: 'Post creado', post })
  } catch (error) {
    request.log.error(error)
    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 ? 'Error al crear post' : error.message || 'Solicitud invalida'
    return reply.code(statusCode).send({ error: message })
  }
}

export async function listPostsHandler(request, reply) {
  try {
    const posts = await getPosts()
    return reply.send({ posts })
  } catch (error) {
    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 ? 'Error al obtener posts' : error.message || 'Solicitud invalida'
    return reply.code(statusCode).send({ error: message })
  }
}
