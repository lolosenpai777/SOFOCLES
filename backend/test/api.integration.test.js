import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.js'
import { prisma } from '../src/config/prisma.js'
import { storeImage } from '../src/services/storage.service.js'

test('health endpoint is available', async () => {
  const app = buildApp()
  const response = await app.inject({ method: 'GET', url: '/health' })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { ok: true })
  await app.close()
})

test('protected endpoints reject unauthenticated requests', async () => {
  const app = buildApp()
  const response = await app.inject({ method: 'POST', url: '/api/uploads/avatar', payload: { imageData: 'data:image/png;base64,AA==' } })
  assert.equal(response.statusCode, 401)
  await app.close()
})

test('image storage rejects malformed image data', async () => {
  await assert.rejects(() => storeImage('not-an-image'), { statusCode: 400 })
})

test('single post route returns and updates a post for its author', async () => {
  const app = buildApp()
  const unique = Date.now()
  const user = await prisma.user.create({
    data: {
      username: `postview${unique}`,
      email: `postview${unique}@example.com`,
      passwordHash: 'hashed',
      emailVerified: true,
    },
  })

  const post = await prisma.post.create({
    data: {
      title: 'Idea original',
      content: 'Contenido inicial',
      authorId: user.id,
    },
  })

  const token = app.jwt.sign({ sub: String(user.id), id: user.id, username: user.username })

  try {
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/posts/${post.id}`,
      headers: { authorization: `Bearer ${token}` },
    })

    assert.equal(getResponse.statusCode, 200)
    assert.equal(getResponse.json().post.title, 'Idea original')

    const updateResponse = await app.inject({
      method: 'PUT',
      url: `/api/posts/${post.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: 'Idea actualizada',
        content: 'Contenido actualizado',
      },
    })

    assert.equal(updateResponse.statusCode, 200)
    assert.equal(updateResponse.json().post.title, 'Idea actualizada')
    assert.equal(updateResponse.json().post.content, 'Contenido actualizado')
  } finally {
    await prisma.comment.deleteMany({ where: { postId: post.id } })
    await prisma.post.delete({ where: { id: post.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    await app.close()
  }
})
