import { prisma } from '../config/prisma.js'

export async function createCommentHandler(request, reply) {
  try {
    const { id: postId } = request.params
    const { text, gifUrl } = request.body
    const userId = request.userId

    if (!userId) {
      return reply.code(401).send({ error: 'No autenticado' })
    }

    if (!text || !String(text).trim()) {
      return reply.code(400).send({ error: 'El comentario no puede estar vacío' })
    }

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: parseInt(postId) },
    })

    if (!post) {
      return reply.code(404).send({ error: 'Post no encontrado' })
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        text,
        gifUrl: gifUrl || null,
        authorId: userId,
        postId: parseInt(postId),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })

    return reply.code(201).send({ mensaje: 'Comentario creado', comment })
  } catch (error) {
    request.log.error(error)
    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 ? 'Error al crear comentario' : error.message || 'Solicitud inválida'
    return reply.code(statusCode).send({ error: message })
  }
}

export async function deleteCommentHandler(request, reply) {
  try {
    const { id: postId, commentId } = request.params
    const userId = request.userId

    if (!userId) {
      return reply.code(401).send({ error: 'No autenticado' })
    }

    // Verify comment exists and belongs to user
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
    })

    if (!comment) {
      return reply.code(404).send({ error: 'Comentario no encontrado' })
    }

    if (comment.authorId !== userId) {
      return reply.code(403).send({ error: 'No tienes permiso para eliminar este comentario' })
    }

    // Delete comment
    await prisma.comment.delete({
      where: { id: parseInt(commentId) },
    })

    return reply.code(200).send({ mensaje: 'Comentario eliminado' })
  } catch (error) {
    request.log.error(error)
    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 ? 'Error al eliminar comentario' : error.message || 'Solicitud inválida'
    return reply.code(statusCode).send({ error: message })
  }
}
