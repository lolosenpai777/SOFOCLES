import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/config/prisma.js'
import { authenticateUser, issueVerificationCode, registerUser, resendVerification, verifyEmailCode } from '../src/services/auth.service.js'

let serialQueue = Promise.resolve()
function serialTest(name, options, handler) {
  return test(name, options, async (context) => {
    const previous = serialQueue
    let release
    serialQueue = new Promise((resolve) => { release = resolve })
    await previous
    try { return await handler(context) } finally { release() }
  })
}

function patchPrisma(handlers) {
  const originals = {}
  for (const key of Object.keys(handlers)) {
    if (key.startsWith('$')) {
      originals[key] = prisma[key]
      prisma[key] = handlers[key]
      continue
    }
    const [model, method] = key.split('.')
    originals[key] = prisma[model][method]
    prisma[model][method] = handlers[key]
  }
  return () => {
    for (const key of Object.keys(originals)) {
      if (key.startsWith('$')) prisma[key] = originals[key]
      else {
        const [model, method] = key.split('.')
        prisma[model][method] = originals[key]
      }
    }
  }
}

function transactionMock() {
  return async (work) => {
    if (typeof work === 'function') return work(prisma)
    return Promise.all(work)
  }
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

serialTest('envío exitoso crea un código CODE de seis dígitos con expiración', { concurrency: false }, async () => {
  let created
  const restore = patchPrisma({
    'emailVerificationToken.findFirst': async () => null,
    'emailVerificationToken.updateMany': async () => ({}),
    'emailVerificationToken.create': async (args) => { created = args.data; return args.data },
    '$transaction': transactionMock(),
  })
  try {
    await issueVerificationCode({ id: 701, email: 'test@example.com' })
    assert.equal(created.tokenType, 'CODE')
    assert.match(created.tokenHash, /^[a-f0-9]{64}$/)
    assert.equal(created.sentCount, 1)
    assert.ok(created.expiresAt.getTime() > Date.now())
  } finally { restore() }
})

serialTest('código expirado se rechaza con mensaje genérico', { concurrency: false }, async () => {
  const restore = patchPrisma({
    'emailVerificationToken.findFirst': async () => ({
      id: 1, userId: 701, tokenHash: hash('123456'), tokenType: 'CODE', usedAt: null,
      expiresAt: new Date(Date.now() - 1000), attemptCount: 0, lockedUntil: null,
      user: { id: 701, emailVerified: false },
    }),
  })
  try {
    await assert.rejects(() => verifyEmailCode('test@example.com', '123456'), (error) => error.statusCode === 400 && error.code === 'VERIFICATION_FAILED')
  } finally { restore() }
})

serialTest('código correcto verifica el email y consume el token', { concurrency: false }, async () => {
  const updates = []
  const restore = patchPrisma({
    'emailVerificationToken.findFirst': async () => ({
      id: 10, userId: 701, tokenHash: hash('123456'), tokenType: 'CODE', usedAt: null,
      expiresAt: new Date(Date.now() + 60_000), attemptCount: 0, lockedUntil: null,
      user: { id: 701, emailVerified: false },
    }),
    'user.update': async (args) => { updates.push(args); return {} },
    'emailVerificationToken.update': async (args) => { updates.push(args); return {} },
    '$transaction': transactionMock(),
  })
  try {
    const verified = await verifyEmailCode('test@example.com', '123456')
    assert.equal(verified, true)
    assert.equal(updates[0].data.emailVerified, true)
    assert.ok(updates[1].data.usedAt)
  } finally { restore() }
})

serialTest('código incorrecto incrementa intentos sin revelar la causa', { concurrency: false }, async () => {
  let update
  const restore = patchPrisma({
    'emailVerificationToken.findFirst': async () => ({
      id: 2, userId: 701, tokenHash: hash('123456'), tokenType: 'CODE', usedAt: null,
      expiresAt: new Date(Date.now() + 60_000), attemptCount: 1, lockedUntil: null,
      user: { id: 701, emailVerified: false },
    }),
    'emailVerificationToken.update': async (args) => { update = args; return {} },
  })
  try {
    await assert.rejects(() => verifyEmailCode('test@example.com', '999999'), (error) => error.message === 'El código de verificación no es válido.')
    assert.equal(update.data.attemptCount, 2)
    assert.equal(update.data.lockedUntil, null)
  } finally { restore() }
})

serialTest('quinto intento fallido activa bloqueo temporal de 15 minutos', { concurrency: false }, async () => {
  let update
  const restore = patchPrisma({
    'emailVerificationToken.findFirst': async () => ({
      id: 3, userId: 701, tokenHash: hash('123456'), tokenType: 'CODE', usedAt: null,
      expiresAt: new Date(Date.now() + 60_000), attemptCount: 4, lockedUntil: null,
      user: { id: 701, emailVerified: false },
    }),
    'emailVerificationToken.update': async (args) => { update = args; return {} },
  })
  try {
    await assert.rejects(() => verifyEmailCode('test@example.com', '999999'))
    assert.equal(update.data.attemptCount, 5)
    assert.ok(update.data.lockedUntil.getTime() > Date.now())
  } finally { restore() }
})

serialTest('el envío respeta el intervalo mínimo de 60 segundos', { concurrency: false }, async () => {
  const restore = patchPrisma({
    'emailVerificationToken.findFirst': async () => ({ sentAt: new Date(), sentDay: new Date(), sentCount: 1 }),
  })
  try {
    await assert.rejects(() => issueVerificationCode({ id: 701, email: 'test@example.com' }), (error) => error.statusCode === 429 && error.code === 'VERIFICATION_RATE_LIMITED')
  } finally { restore() }
})

serialTest('reenviar verificación genera un código para un usuario no verificado', { concurrency: false }, async () => {
  let created
  const restore = patchPrisma({
    'user.findUnique': async () => ({ id: 706, email: 'test@example.com', emailVerified: false }),
    'emailVerificationToken.findFirst': async () => null,
    'emailVerificationToken.updateMany': async () => ({}),
    'emailVerificationToken.create': async (args) => { created = args.data; return args.data },
    '$transaction': transactionMock(),
  })
  try {
    const result = await resendVerification('test@example.com')
    assert.equal(result.sent, true)
    assert.equal(created.tokenType, 'CODE')
  } finally { restore() }
})

serialTest('login queda bloqueado con 403 mientras emailVerified sea false', { concurrency: false }, async () => {
  const passwordHash = await bcrypt.hash('secret123', 4)
  const restore = patchPrisma({
    'user.findUnique': async () => ({ id: 702, email: 'test@example.com', passwordHash, emailVerified: false }),
    'userSuspension.findMany': async () => [],
  })
  try {
    await assert.rejects(() => authenticateUser({ email: 'test@example.com', password: 'secret123' }), (error) => error.statusCode === 403 && error.code === 'EMAIL_NOT_VERIFIED')
  } finally { restore() }
})

serialTest('registro con email existente responde de forma genérica', { concurrency: false }, async () => {
  const restore = patchPrisma({ 'user.findUnique': async () => ({ id: 703, email: 'existing@example.com' }) })
  try {
    await assert.rejects(() => registerUser({ username: 'Nuevo', email: 'existing@example.com', password: 'secret123' }), (error) => error.statusCode === 202 && error.code === 'REGISTRATION_GENERIC')
  } finally { restore() }
})

serialTest('registro con username ocupado conserva 409', { concurrency: false }, async () => {
  const restore = patchPrisma({
    'user.findUnique': async () => null,
    '$queryRaw': async () => [{ id: 704 }],
  })
  try {
    await assert.rejects(() => registerUser({ username: 'Ocupado', email: 'new@example.com', password: 'secret123' }), (error) => error.statusCode === 409)
  } finally { restore() }
})

serialTest('si email y username chocan prevalece la respuesta genérica del email', { concurrency: false }, async () => {
  const restore = patchPrisma({ 'user.findUnique': async () => ({ id: 705, email: 'existing@example.com' }) })
  try {
    await assert.rejects(() => registerUser({ username: 'Ocupado', email: 'existing@example.com', password: 'secret123' }), (error) => error.statusCode === 202 && error.code === 'REGISTRATION_GENERIC')
  } finally { restore() }
})
