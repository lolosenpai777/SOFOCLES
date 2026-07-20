import {
  createPost,
  deletePostByAuthor,
  getPostById,
  getPosts,
  togglePostLike,
} from '../services/post.service.js'
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

export async function deletePostHandler(request, reply) {
  try {
    const postId = request.params?.id
    const userId = request.user?.id ?? request.userId

    if (!userId) {
      return reply.code(401).send({ error: 'No autenticado' })
    }

    const deleted = await deletePostByAuthor(postId, Number(userId))

    if (deleted.count === 0) {
      const post = await getPostById(postId)

      if (!post) {
        return reply.code(404).send({ error: 'Post no encontrado' })
      }

      if (post.authorId !== Number(userId)) {
        return reply.code(403).send({ error: 'No puedes eliminar un post que no te pertenece' })
      }
    }

    return reply.send({ mensaje: 'Post eliminado correctamente' })
  } catch (error) {
    request.log.error(error)
    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 ? 'Error al eliminar post' : error.message || 'Solicitud invalida'
    return reply.code(statusCode).send({ error: message })
  }
}

export async function likePostHandler(request, reply) {
  try {
    const postId = request.params?.id
    const userId = request.user?.id ?? request.userId

    if (!userId) {
      return reply.code(401).send({ error: 'No autenticado' })
    }

    const resultado = await togglePostLike(postId, Number(userId))

    return reply.send(resultado)
  } catch (error) {
    request.log.error(error)
    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 ? 'Error al dar like al post' : error.message || 'Solicitud invalida'
    return reply.code(statusCode).send({ error: message })
  }
}
