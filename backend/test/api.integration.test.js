import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.js'
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
