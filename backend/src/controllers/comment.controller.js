import { prisma } from '../config/prisma.js'
import { createNotification } from '../services/notification.service.js'
import { ensureNotRestricted } from '../services/suspension.service.js'

export async function listCommentsHandler(request) {
  const take = Math.min(Math.max(Number(request.query?.limit) || 20, 1), 50)
  const rows = await prisma.comment.findMany({ where: { postId: Number(request.params.id) }, take: take + 1, ...(request.query?.cursor ? { cursor: { id: Number(request.query.cursor) }, skip: 1 } : {}), orderBy: { id: 'desc' }, include: { author: { select: { id: true, username: true, avatarUrl: true } } } })
  const hasMore = rows.length > take
  const comments = hasMore ? rows.slice(0, take) : rows
  return { comments, nextCursor: hasMore ? comments.at(-1).id : null }
}

export async function createCommentHandler(request, reply) {
  try {
    const { id: postId } = request.params
    const { text, gifUrl } = request.body
    const userId = request.userId

    if (!userId) {
      return reply.code(401).send({ error: 'No autenticado' })
    }

    await ensureNotRestricted(userId, 'COMMENT_ONLY')

    if (!text?.trim() && !gifUrl) {
      return reply.code(400).send({ error: 'El comentario debe tener texto o un GIF' })
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
        text: text?.trim() || '',
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

    // crear notificación para el autor del post si no es el mismo usuario
    try {
      if (post.authorId !== userId) {
        await createNotification(post.authorId, { actorId: userId, type: 'COMMENT', content: `@${comment.author.username} comentó: ${comment.text?.slice(0,140)}`, postId: post.id, commentId: comment.id })
      }
    } catch (err) {
      request.log.warn('No se pudo crear notificación de comentario', err)
    }

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
