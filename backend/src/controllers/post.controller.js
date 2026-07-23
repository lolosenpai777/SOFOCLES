import {
  createPost,
  deletePostByAuthor,
  getPostById,
  getPosts,
  getPostsFollowing,
  togglePostLike,
} from '../services/post.service.js'
import { prisma } from '../config/prisma.js'

export async function createPostHandler(request, reply) {
  try {
    request.log.info({ body: request.body }, 'createPost request body')

    // Support both JSON and multipart/form-data (file upload)
    let title = undefined
    let content = undefined
    let imageUrl = undefined

    const isMultipart = String(request.headers['content-type'] || '').includes('multipart/form-data')

    if (isMultipart && request.isMultipart) {
      // multipart is not used in this environment; fall back to JSON handling below
    } else {
      const body = request.body || {}
      title = body.title
      content = body.content
      imageUrl = body.imageUrl

      // Support `imageData` field with a data URL (data:image/...;base64,AAAA...)
      if (!imageUrl && body.imageData && typeof body.imageData === 'string') {
        try {
          const matches = body.imageData.match(/^data:(image\/\w+);base64,(.+)$/)
          if (matches) {
            const mime = matches[1]
            const b64 = matches[2]

            const ext = mime.split('/')[1] || 'png'
            const fs = await import('fs')
            const path = await import('node:path')
            const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
            await fs.promises.mkdir(uploadsDir, { recursive: true })

            const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
            const destPath = path.join(uploadsDir, safeName)
            await fs.promises.writeFile(destPath, Buffer.from(b64, 'base64'))

            imageUrl = `/uploads/${safeName}`
          }
        } catch (err) {
          request.log.error({ err }, 'failed to save imageData')
        }
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

    const post = await createPost({ title, content, imageUrl, authorId })

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

      const posts = await getPostsFollowing(Number(userId))
      return reply.send({ posts })
    }

    const posts = await getPosts()
    return reply.send({ posts })
  } catch (error) {
    request.log.error(error)
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
