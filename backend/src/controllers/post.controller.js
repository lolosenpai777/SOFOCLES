import { createPost, getPosts } from '../services/post.service.js'

export async function createPostHandler(request, reply) {
  try {
    const { title, content } = request.body
    const authorId = request.userId

    if (!authorId) {
      return reply.code(401).send({ mensaje: 'No autorizado' })
    }

    const post = await createPost({ title, content, authorId })

    return reply.code(201).send({ mensaje: 'Post creado', post })
  } catch (error) {
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
