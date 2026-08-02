import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { prisma } from '../config/prisma.js'
import { env } from '../config/env.js'
import { createOpaqueToken, sendSecurityEmail } from './mail.service.js'
import { ensureUserCanAuthenticate } from './suspension.service.js'
import { normalizeUsername } from '../schemas/shared/username.schema.js'
import { findUsernameConflict } from './username.service.js'

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

export async function registerUser({ username, email, password }) {
  const cleanUsername = normalizeUsername(username)
  const cleanEmail = normalizeEmail(email)
  const cleanPassword = String(password ?? '')

  if (!cleanUsername || !cleanEmail || !cleanPassword) {
    const error = new Error('Todos los campos son obligatorios')
    error.statusCode = 400
    throw error
  }

  if (cleanPassword.length < 6) {
    const error = new Error('La contraseña debe tener al menos 6 caracteres')
    error.statusCode = 400
    throw error
  }

  const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } })
  const existingUsername = await findUsernameConflict(cleanUsername)

  if (existingUser || existingUsername) {
    const error = new Error('El usuario o correo ya existe')
    error.statusCode = 409
    throw error
  }

  const passwordHash = await bcrypt.hash(cleanPassword, 10)

  const user = await prisma.user.create({
    data: {
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      needsUsernameSetup: false,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      moderationRole: true,
      needsUsernameSetup: true,
      createdAt: true,
    },
  })

  await sendVerificationEmail(user)

  return user
}

async function sendVerificationEmail(user) {
  const { token, tokenHash } = createOpaqueToken()
  await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } })
  await prisma.emailVerificationToken.create({ data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } })
  await sendSecurityEmail({ to: user.email, subject: 'Verifica tu correo', url: `${env.appUrl}/verificar-correo?token=${encodeURIComponent(token)}` })
}

export async function verifyEmail(token) {
  const { tokenHash } = hashToken(token)
  const record = await prisma.emailVerificationToken.findFirst({ where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } } })
  if (!record) return false
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ])
  return true
}

export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } })
  // Deliberately do not disclose whether the account exists.
  if (!user) return
  const { token, tokenHash } = createOpaqueToken()
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })
  await prisma.passwordResetToken.create({ data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } })
  await sendSecurityEmail({ to: user.email, subject: 'Restablece tu contraseña', url: `${env.appUrl}/restablecer-contrasena?token=${encodeURIComponent(token)}` })
}

export async function resetPassword(token, password) {
  const cleanPassword = String(password ?? '')
  if (cleanPassword.length < 8) {
    const error = new Error('La contraseña debe tener al menos 8 caracteres')
    error.statusCode = 400
    throw error
  }
  const { tokenHash } = hashToken(token)
  const record = await prisma.passwordResetToken.findFirst({ where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } } })
  if (!record) {
    const error = new Error('El enlace de recuperación no es válido o expiró')
    error.statusCode = 400
    throw error
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(cleanPassword, 12) } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ])
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: Number(userId) } })
  if (!user || !(await bcrypt.compare(String(currentPassword ?? ''), user.passwordHash))) {
    const error = new Error('La contraseña actual no es correcta')
    error.statusCode = 400
    throw error
  }
  if (String(newPassword ?? '').length < 8) {
    const error = new Error('La contraseña nueva debe tener al menos 8 caracteres')
    error.statusCode = 400
    throw error
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } })
}

function hashToken(token) {
  return { tokenHash: crypto.createHash('sha256').update(String(token ?? '')).digest('hex') }
}

export async function authenticateUser({ email, password }) {
  const cleanEmail = normalizeEmail(email)
  const cleanPassword = String(password ?? '')

  if (!cleanEmail || !cleanPassword) {
    const error = new Error('Email y contraseña son obligatorios')
    error.statusCode = 400
    throw error
  }

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
  })

  if (!user) {
    const error = new Error('Credenciales inválidas')
    error.statusCode = 401
    throw error
  }

  const passwordMatches = Boolean(user.passwordHash) && await bcrypt.compare(cleanPassword, user.passwordHash)

  if (!passwordMatches) {
    const error = new Error('Credenciales inválidas')
    error.statusCode = 401
    throw error
  }

  await ensureUserCanAuthenticate(user.id)

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    moderationRole: user.moderationRole,
    needsUsernameSetup: false,
  }
}
