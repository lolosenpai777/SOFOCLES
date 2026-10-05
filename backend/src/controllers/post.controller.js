import {
  createPost,
  deletePostByAuthor,
  getPostById,
  getPosts,
  getPostsFollowing,
  togglePostLike,
  updatePostByAuthor,
  togglePinnedPost,
  togglePostSave,
  getSavedPosts,
  createQuotePost,
} from '../services/post.service.js'
import { prisma } from '../config/prisma.js'
import { storeImage } from '../services/storage.service.js'
import { createNotification } from '../services/notification.service.js'

export async function createPostHandler(request, reply) {
  try {
    // Support both JSON and multipart/form-data (file upload)
    let title = undefined
    let content = undefined
    let imageUrl = undefined
    const body = request.body || {}
    const imageUrls = []

    const isMultipart = String(request.headers['content-type'] || '').includes('multipart/form-data')

    if (isMultipart && request.isMultipart) {
      // multipart is not used in this environment; fall back to JSON handling below
    } else {
      title = body.title
      content = body.content
      imageUrl = body.imageUrl

      if (!imageUrl && body.imageData) imageUrl = await storeImage(body.imageData, 'post')
      if (Array.isArray(body.imageDatas)) {
        for (const imageData of body.imageDatas.slice(0, 8)) imageUrls.push(await storeImage(imageData, 'post'))
        if (!imageUrl) imageUrl = imageUrls[0]
      }
    }
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

    // Ensure stored imageUrl is absolute (helps when frontend runs on different origin)
    if (imageUrl && imageUrl.startsWith('/')) {
      const proto = request.headers['x-forwarded-proto'] || request.protocol || 'http'
      const host = request.headers.host
      if (host) {
        imageUrl = `${proto}://${host}${imageUrl}`
      }
    }

    const post = await createPost({ title, content, imageUrl, imageUrls, authorId, visibility: body.visibility || 'PUBLIC', hashtags: body.hashtags || [] })

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
    const filter = request.query?.filter

    if (filter === 'following') {
      // require authentication to fetch posts from followed users
      try {
        await request.jwtVerify()
      } catch (err) {
        return reply.code(401).send({ error: 'No autenticado' })
      }

      // Normalize user id from JWT payload if middleware didn't run
      const userId = request.userId ?? (request.user && request.user.sub ? Number(request.user.sub) : undefined)

      if (!userId || Number.isNaN(Number(userId))) {
        return reply.code(401).send({ error: 'No autenticado' })
      }

      const result = await getPostsFollowing(Number(userId), request.query, Number(userId))
      return reply.send({ posts: result.items, nextCursor: result.nextCursor })
    }

    let viewerId
    try { await request.jwtVerify(); viewerId = Number(request.userId ?? request.user?.sub) } catch {}
    const result = await getPosts(request.query, viewerId)
    return reply.send({ posts: result.items, nextCursor: result.nextCursor })
  } catch (error) {
    request.log.error(error)
    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 ? 'Error al obtener posts' : error.message || 'Solicitud invalida'
    return reply.code(statusCode).send({ error: message })
  }
}

export async function getPostHandler(request, reply) {
  try {
    const postId = Number(request.params?.id)
    let viewerId
    try { await request.jwtVerify(); viewerId = Number(request.userId ?? request.user?.sub) } catch {}
    const post = await getPostById(postId, viewerId)

    if (!post) {
      return reply.code(404).send({ error: 'Post no encontrado' })
    }

    return reply.send({ post })
  } catch (error) {
    request.log.error(error)
    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 ? 'Error al obtener el post' : error.message || 'Solicitud invalida'
    return reply.code(statusCode).send({ error: message })
  }
}

export async function updatePostHandler(request, reply) {
  try {
    const postId = Number(request.params?.id)
    const userId = request.user?.id ?? request.userId
    const body = request.body || {}

    if (!userId) {
      return reply.code(401).send({ error: 'No autenticado' })
    }

    let imageUrl = body.imageUrl
    if (body.imageData) {
      imageUrl = await storeImage(body.imageData, 'post')
    }

    const payload = {
      title: body.title,
      content: body.content,
      imageUrl: body.removeImage ? '' : imageUrl,
      visibility: body.visibility,
      hashtags: body.hashtags,
    }

    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    )

    const post = await updatePostByAuthor(postId, Number(userId), cleanedPayload)
    return reply.send({ post })
  } catch (error) {
    request.log.error(error)
    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 ? 'Error al actualizar el post' : error.message || 'Solicitud invalida'
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

    // crear notificación si se dio like (y no es al propio autor)
    try {
      if (resultado && resultado.liked && resultado.post && resultado.post.author && resultado.post.author.id !== Number(userId)) {
        await createNotification(resultado.post.author.id, { actorId: Number(userId), type: 'LIKE', content: `@${resultado.post.author.username || 'usuario'} recibió un like`, postId: resultado.post.id })
      }
    } catch (err) {
      request.log.warn('No se pudo crear notificación de like', err)
    }

    return reply.send(resultado)
  } catch (error) {
    request.log.error(error)
    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 ? 'Error al dar like al post' : error.message || 'Solicitud invalida'
    return reply.code(statusCode).send({ error: message })
  }
}

export async function togglePinnedPostHandler(request, reply) {
  try {
    const post = await togglePinnedPost(Number(request.params?.id), Number(request.user?.id ?? request.userId))
    return reply.send({ pinned: Boolean(post.pinnedAt), pinnedAt: post.pinnedAt })
  } catch (error) {
    return reply.code(error.statusCode ?? 500).send({ error: error.message || 'No se pudo fijar el post' })
  }
}

export async function togglePostSaveHandler(request, reply) {
  try {
    const result = await togglePostSave(Number(request.params?.id), Number(request.user?.id ?? request.userId))
    return reply.send(result)
  } catch (error) {
    return reply.code(error.statusCode ?? 500).send({ error: error.message || 'No se pudo guardar el post' })
  }
}

export async function savedPostsHandler(request, reply) {
  const result = await getSavedPosts(Number(request.user?.id ?? request.userId), request.query)
  return reply.send({ posts: result.items, nextCursor: result.nextCursor })
}

export async function quotePostHandler(request, reply) {
  try {
    const post = await createQuotePost({ postId: Number(request.params?.id), title: request.body?.title ? String(request.body.title).trim() : null, content: String(request.body?.content || '').trim(), authorId: Number(request.user?.id ?? request.userId) })
    return reply.code(201).send({ post })
  } catch (error) {
    return reply.code(error.statusCode ?? 500).send({ error: error.message || 'No se pudo citar el post' })
  }
}
