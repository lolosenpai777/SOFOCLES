import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { buildApp } from '../src/app.js'
import { prisma } from '../src/config/prisma.js'
import { storePrivateImage } from '../src/services/storage.service.js'

async function createEcoUser(suffix, { ageStatus = 'PENDING', deadline = new Date(Date.now() + 24 * 60 * 60 * 1000), interests = [], moderationRole = 'NONE' } = {}) {
  const user = await prisma.user.create({
    data: {
      username: `eco${suffix}`,
      email: `eco${suffix}@example.com`,
      passwordHash: 'unused',
      emailVerified: true,
      moderationRole,
      ecoProfile: {
        create: {
          alias: `Eco ${suffix}`,
          mascara: '🎭',
          genderDeclared: 'neutro',
          genderConfirmed: true,
          ageStatus,
          ageDocumentUrl: ageStatus === 'SUBMITTED' ? 'private://eco-document-test.webp' : null,
          ageVerificationDeadline: deadline,
          interests,
        },
      },
    },
    include: { ecoProfile: true },
  })
  return user
}

function tokenFor(app, user) {
  return app.jwt.sign({ sub: String(user.id), username: user.username, role: user.role })
}

test('Eco endpoints require authentication and moderators for private review routes', async () => {
  const app = buildApp()
  try {
    for (const url of ['/api/eco/profile', '/api/eco/admin/age-documents', '/api/eco/admin/profiles/1/age-document']) {
      const response = await app.inject({ method: 'GET', url })
      assert.equal(response.statusCode, 401, url)
    }
  } finally {
    await app.close()
  }
})

test('only moderators can list submitted documents and retrieve them privately', async () => {
  const app = buildApp()
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1e5)}`
  let moderator
  let regularUser
  let privateUrl
  try {
    await app.ready()
    moderator = await createEcoUser(`${suffix}mod`, { ageStatus: 'SUBMITTED', moderationRole: 'JUNIOR' })
    regularUser = await createEcoUser(`${suffix}user`)
    const png = await sharp({ create: { width: 1, height: 1, channels: 4, background: '#202020' } }).png().toBuffer()
    privateUrl = await storePrivateImage(`data:image/png;base64,${png.toString('base64')}`, 'eco-document-test')
    await prisma.ecoProfile.update({ where: { id: moderator.ecoProfile.id }, data: { ageDocumentUrl: privateUrl } })

    const denied = await app.inject({
      method: 'GET',
      url: '/api/eco/admin/age-documents',
      headers: { authorization: `Bearer ${tokenFor(app, regularUser)}` },
    })
    assert.equal(denied.statusCode, 403)

    const moderatorHeaders = { authorization: `Bearer ${tokenFor(app, moderator)}` }
    const queue = await app.inject({ method: 'GET', url: '/api/eco/admin/age-documents', headers: moderatorHeaders })
    assert.equal(queue.statusCode, 200)
    assert.equal(queue.json().documents.some((item) => item.userId === moderator.id), true)

    const document = await app.inject({
      method: 'GET',
      url: `/api/eco/admin/profiles/${moderator.id}/age-document`,
      headers: moderatorHeaders,
    })
    assert.equal(document.statusCode, 200)
    assert.match(document.headers['content-type'], /image\/webp/)
    assert.equal(document.headers['cache-control'], 'no-store')
    assert.ok(document.rawPayload.length > 0)
  } finally {
    if (privateUrl) await fs.unlink(new URL(`../private-uploads/${privateUrl.replace('private://', '')}`, import.meta.url)).catch(() => {})
    if (moderator) await prisma.user.delete({ where: { id: moderator.id } }).catch(() => {})
    if (regularUser) await prisma.user.delete({ where: { id: regularUser.id } }).catch(() => {})
    await app.close()
  }
})

test('creating an Eco profile requires and stores an explicit gender confirmation', async () => {
  const app = buildApp()
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1e5)}`
  let user
  try {
    await app.ready()
    user = await prisma.user.create({
      data: { username: `eco${suffix}`, email: `eco${suffix}@example.com`, passwordHash: 'unused', emailVerified: true },
    })
    const headers = { authorization: `Bearer ${tokenFor(app, user)}` }
    const rejected = await app.inject({ method: 'POST', url: '/api/eco/profile', headers, payload: { genderDeclared: 'neutro', genderConfirmed: false } })
    assert.equal(rejected.statusCode, 400)

    const created = await app.inject({ method: 'POST', url: '/api/eco/profile', headers, payload: { genderDeclared: 'neutro', genderConfirmed: true } })
    assert.equal(created.statusCode, 201)
    assert.equal(created.json().profile.genderConfirmed, true)

    const fetched = await app.inject({ method: 'GET', url: '/api/eco/profile', headers })
    assert.equal(fetched.json().profile.id, created.json().profile.id)
  } finally {
    if (user) await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    await app.close()
  }
})

test('submitted Eco profiles expire after the 24-hour deadline and lose chat access', async () => {
  const app = buildApp()
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1e5)}`
  let user
  try {
    await app.ready()
    user = await createEcoUser(suffix, { ageStatus: 'SUBMITTED', deadline: new Date(Date.now() - 1000), interests: ['filosofia', 'pintura', 'poesia', 'historia', 'etica', 'debate'] })
    const headers = { authorization: `Bearer ${tokenFor(app, user)}` }

    const chatsResponse = await app.inject({ method: 'GET', url: '/api/eco/chats', headers })
    assert.equal(chatsResponse.statusCode, 403)

    const profileResponse = await app.inject({ method: 'GET', url: '/api/eco/profile', headers })
    assert.equal(profileResponse.statusCode, 200)
    assert.equal(profileResponse.json().profile.ageStatus, 'EXPIRED')
    assert.equal(profileResponse.json().profile.canChat, false)
  } finally {
    if (user) await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
    await app.close()
  }
})

test('Eco matching excludes submitted profiles whose verification window expired', async () => {
  const app = buildApp()
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1e5)}`
  let ownUser
  let expiredUser
  try {
    await app.ready()
    const interests = ['filosofia', 'pintura', 'poesia', 'historia', 'etica', 'debate']
    ownUser = await createEcoUser(`${suffix}a`, { interests })
    expiredUser = await createEcoUser(`${suffix}b`, { ageStatus: 'SUBMITTED', deadline: new Date(Date.now() - 1000), interests })
    const response = await app.inject({
      method: 'POST',
      url: '/api/eco/chats/match',
      headers: { authorization: `Bearer ${tokenFor(app, ownUser)}` },
    })
    assert.equal(response.statusCode, 404)
    assert.match(response.json().error, /no hay perfiles compatibles/i)
  } finally {
    if (ownUser) await prisma.user.delete({ where: { id: ownUser.id } }).catch(() => {})
    if (expiredUser) await prisma.user.delete({ where: { id: expiredUser.id } }).catch(() => {})
    await app.close()
  }
})

test('Eco messages persist server-owned resonance and reject quotes from another conversation', async () => {
  const app = buildApp()
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1e5)}`
  let ownUser
  let otherUser
  let conversationIds = []
  try {
    await app.ready()
    const interests = ['filosofia', 'pintura', 'poesia', 'historia', 'etica', 'debate']
    ownUser = await createEcoUser(`${suffix}a`, { interests })
    otherUser = await createEcoUser(`${suffix}b`, { interests })
    const [conversation, otherConversation] = await Promise.all([
      prisma.ecoConversation.create({ data: { participants: { create: [{ profileId: ownUser.ecoProfile.id }, { profileId: otherUser.ecoProfile.id }] } } }),
      prisma.ecoConversation.create({ data: { participants: { create: [{ profileId: ownUser.ecoProfile.id }, { profileId: otherUser.ecoProfile.id }] } } }),
    ])
    conversationIds = [conversation.id, otherConversation.id]
    const quoted = await prisma.ecoMessage.create({
      data: { conversationId: otherConversation.id, authorProfileId: otherUser.ecoProfile.id, content: 'Mensaje privado de otra conversación' },
    })
    const headers = { authorization: `Bearer ${tokenFor(app, ownUser)}` }

    const crossConversationQuote = await app.inject({
      method: 'POST',
      url: `/api/eco/chats/${conversation.id}/messages`,
      headers,
      payload: { content: 'Respuesta', quotedMessageId: quoted.id },
    })
    assert.equal(crossConversationQuote.statusCode, 400)

    const sent = await app.inject({
      method: 'POST',
      url: `/api/eco/chats/${conversation.id}/messages`,
      headers,
      payload: { content: 'Mensaje guardado en el servidor' },
    })
    assert.equal(sent.statusCode, 201)

    const listed = await app.inject({ method: 'GET', url: '/api/eco/chats', headers })
    const persisted = listed.json().conversations.find((item) => item.id === conversation.id)
    assert.equal(persisted.resonance, 20)
    assert.equal(persisted.messages.at(-1).content, 'Mensaje guardado en el servidor')
  } finally {
    if (conversationIds.length) await prisma.ecoConversation.deleteMany({ where: { id: { in: conversationIds } } }).catch(() => {})
    if (ownUser) await prisma.user.delete({ where: { id: ownUser.id } }).catch(() => {})
    if (otherUser) await prisma.user.delete({ where: { id: otherUser.id } }).catch(() => {})
    await app.close()
  }
})

test('Eco conversation reports derive the target account on the server', async () => {
  const app = buildApp()
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1e5)}`
  let reporter
  let reported
  let conversationId
  try {
    await app.ready()
    reporter = await createEcoUser(`${suffix}a`)
    reported = await createEcoUser(`${suffix}b`)
    const conversation = await prisma.ecoConversation.create({
      data: { participants: { create: [{ profileId: reporter.ecoProfile.id }, { profileId: reported.ecoProfile.id }] } },
    })
    conversationId = conversation.id
    const response = await app.inject({
      method: 'POST',
      url: `/api/eco/chats/${conversation.id}/report`,
      headers: { authorization: `Bearer ${tokenFor(app, reporter)}` },
      payload: { category: 'HATE_SPEECH', details: 'Mensaje discriminatorio en el chat.' },
    })
    assert.equal(response.statusCode, 201)
    assert.equal(response.json().report.reporterId, reporter.id)
    assert.equal(response.json().report.reportedUserId, reported.id)
  } finally {
    if (conversationId) await prisma.ecoConversation.delete({ where: { id: conversationId } }).catch(() => {})
    if (reporter) await prisma.user.delete({ where: { id: reporter.id } }).catch(() => {})
    if (reported) await prisma.user.delete({ where: { id: reported.id } }).catch(() => {})
    await app.close()
  }
})
