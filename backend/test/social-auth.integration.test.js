import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../src/config/prisma.js'
import { buildApp } from '../src/app.js'
import {
  linkSocialAccount,
  loginOrRegisterSocialAccount,
  unlinkSocialAccount,
} from '../src/services/social-auth.service.js'

function patchPrisma(handlers) {
  const originals = {}
  for (const key of Object.keys(handlers)) {
    const [model, method] = key.split('.')
    originals[key] = prisma[model][method]
    prisma[model][method] = handlers[key]
  }
  return () => {
    for (const key of Object.keys(originals)) {
      const [model, method] = key.split('.')
      prisma[model][method] = originals[key]
    }
  }
}

const account = (overrides = {}) => ({
  provider: 'google',
  providerAccountId: 'google-123',
  displayName: 'Sócrates',
  email: 'socrates@example.com',
  emailVerified: true,
  accessToken: 'access',
  refreshToken: 'refresh',
  ...overrides,
})

test('login social reutiliza una LinkedAccount existente y actualiza tokens', async () => {
  let updateArgs
  const existing = { id: 10, username: 'Socrates', email: 'socrates@example.com', role: 'USER', moderationRole: 'NONE' }
  const restore = patchPrisma({
    'linkedAccount.findUnique': async () => ({ id: 1, userId: 10, user: existing }),
    'linkedAccount.update': async (args) => { updateArgs = args; return {} },
    'userSuspension.findMany': async () => [],
  })
  try {
    const result = await loginOrRegisterSocialAccount(account())
    assert.equal(result.id, 10)
    assert.equal(updateArgs.data.accessToken, 'access')
  } finally { restore() }
})

test('login social crea un usuario nuevo sin contraseña si no coincide el email', async () => {
  let createArgs
  const restore = patchPrisma({
    'linkedAccount.findUnique': async () => null,
    'user.findUnique': async () => null,
    'user.create': async (args) => { createArgs = args; return { id: 11, username: 'Socrates', email: account().email, role: 'USER', moderationRole: 'NONE' } },
  })
  try {
    const result = await loginOrRegisterSocialAccount(account())
    assert.equal(result.id, 11)
    assert.equal(createArgs.data.passwordHash, null)
    assert.equal(createArgs.data.linkedAccounts.create.provider, 'google')
  } finally { restore() }
})

test('email social no verificado no vincula automáticamente', async () => {
  let creates = 0
  const restore = patchPrisma({
    'linkedAccount.findUnique': async () => null,
    'user.findUnique': async () => ({ id: 12, email: account().email, passwordHash: 'hash', role: 'USER', moderationRole: 'NONE' }),
    'linkedAccount.create': async () => { creates += 1 },
  })
  try {
    await assert.rejects(
      () => loginOrRegisterSocialAccount(account({ emailVerified: false })),
      (error) => error.code === 'SOCIAL_EMAIL_REQUIRES_PASSWORD' && error.statusCode === 409,
    )
    assert.equal(creates, 0)
  } finally { restore() }
})

test('email social verificado sí vincula al usuario existente', async () => {
  let createArgs
  const restore = patchPrisma({
    'linkedAccount.findUnique': async () => null,
    'user.findUnique': async () => ({ id: 13, email: account().email, passwordHash: 'hash', role: 'USER', moderationRole: 'NONE' }),
    'userSuspension.findMany': async () => [],
    'linkedAccount.create': async (args) => { createArgs = args },
  })
  try {
    const result = await loginOrRegisterSocialAccount(account())
    assert.equal(result.id, 13)
    assert.equal(createArgs.data.userId, 13)
  } finally { restore() }
})

test('desvincular rechaza eliminar el único método de acceso', async () => {
  const restore = patchPrisma({
    'user.findUnique': async () => ({ id: 14, passwordHash: null, linkedAccounts: [{ id: 2, provider: 'discord' }] }),
  })
  try {
    await assert.rejects(
      () => unlinkSocialAccount(14, 'discord'),
      (error) => error.code === 'LAST_LOGIN_METHOD' && error.statusCode === 409,
    )
  } finally { restore() }
})

test('endpoint de vincular exige un JWT válido', async () => {
  const app = buildApp()
  try {
    const response = await app.inject({ method: 'POST', url: '/api/auth/link/google' })
    assert.equal(response.statusCode, 401)
  } finally { await app.close() }
})

test('vincular una cuenta social autenticada devuelve la lista actualizada', async () => {
  const restore = patchPrisma({
    'user.findUnique': async () => ({ id: 15 }),
    'linkedAccount.findUnique': async () => null,
    'linkedAccount.create': async () => ({}),
    'linkedAccount.findMany': async () => [{ provider: 'google', email: 'a@example.com', createdAt: new Date() }],
    'userSuspension.findMany': async () => [],
  })
  const app = buildApp()
  await app.ready()
  try {
    const token = app.jwt.sign({ sub: 15, username: 'user', email: 'a@example.com', role: 'USER', moderationRole: 'NONE' })
    const response = await app.inject({ method: 'POST', url: '/api/auth/link/google', headers: { authorization: `Bearer ${token}` } })
    assert.equal(response.statusCode, 200)
    assert.match(response.json().url, /auth\/link\/google\/start/)
  } finally {
    restore()
    await app.close()
  }
})
