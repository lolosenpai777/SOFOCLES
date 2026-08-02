import { prisma } from '../config/prisma.js'
import { ensureUserCanAuthenticate } from './suspension.service.js'
import { generateUniqueUsername } from './user.service.js'
import { issueVerificationCode } from './auth.service.js'

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function errorWithStatus(message, statusCode, code) {
  const error = new Error(message)
  error.statusCode = statusCode
  if (code) error.code = code
  return error
}

export function normalizeSocialProfile(provider, profile, accessToken, refreshToken) {
  const email = provider === 'google'
    ? profile?.emails?.[0]?.value
    : profile?.email
  const emailVerified = provider === 'google'
    ? profile?.emails?.[0]?.verified === true
    : profile?.verified === true

  return {
    provider,
    providerAccountId: String(profile?.id ?? ''),
    displayName: profile?.displayName || profile?.username || 'Usuario',
    email: email ? normalizeEmail(email) : null,
    emailVerified,
    accessToken: accessToken || null,
    refreshToken: refreshToken || null,
  }
}

export async function loginOrRegisterSocialAccount(account) {
  if (!account.providerAccountId) throw errorWithStatus('Perfil social inválido', 400)

  const existingAccount = await prisma.linkedAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    include: { user: true },
  })

  if (existingAccount) {
    await ensureUserCanAuthenticate(existingAccount.user.id)
    if (account.emailVerified && existingAccount.user.emailVerified === false) {
      await prisma.user.update({ where: { id: existingAccount.user.id }, data: { emailVerified: true, emailVerifiedAt: new Date() } })
      existingAccount.user.emailVerified = true
    }
    await prisma.linkedAccount.update({
      where: { id: existingAccount.id },
      data: { accessToken: account.accessToken, refreshToken: account.refreshToken, email: account.email },
    })
    return publicSocialUser(existingAccount.user)
  }

  const existingUser = account.email
    ? await prisma.user.findUnique({ where: { email: account.email } })
    : null

  if (existingUser) {
    if (!account.emailVerified) {
      throw errorWithStatus(
        'Ya existe una cuenta con este email. Inicia sesión con tu contraseña y luego vincula esta cuenta desde tu perfil.',
        409,
        'SOCIAL_EMAIL_REQUIRES_PASSWORD',
      )
    }

    await ensureUserCanAuthenticate(existingUser.id)
    await prisma.linkedAccount.create({ data: linkedAccountData(existingUser.id, account) })
    if (account.emailVerified && existingUser.emailVerified === false) {
      await prisma.user.update({ where: { id: existingUser.id }, data: { emailVerified: true, emailVerifiedAt: new Date() } })
      existingUser.emailVerified = true
    }
    return publicSocialUser(existingUser)
  }

  const username = await generateUniqueUsername(account.displayName)
  const user = await prisma.user.create({
    data: {
      username,
      email: account.email || `${account.providerAccountId}@${account.provider}.invalid`,
      passwordHash: null,
      needsUsernameSetup: true,
      emailVerified: account.emailVerified,
      linkedAccounts: { create: linkedAccountData(undefined, account) },
      emailVerifiedAt: account.emailVerified ? new Date() : null,
    },
  })
  if (!account.emailVerified && account.email) await issueVerificationCode(user)
  return publicSocialUser(user)
}

function linkedAccountData(userId, account) {
  return {
    ...(userId ? { userId } : {}),
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    accessToken: account.accessToken,
    refreshToken: account.refreshToken,
    email: account.email,
  }
}

function publicSocialUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    moderationRole: user.moderationRole,
    emailVerified: Boolean(user.emailVerified),
    needsUsernameSetup: Boolean(user.needsUsernameSetup),
  }
}

export async function linkSocialAccount(userId, account) {
  const currentUser = await prisma.user.findUnique({ where: { id: Number(userId) } })
  if (!currentUser) throw errorWithStatus('Usuario no encontrado', 404)

  const linked = await prisma.linkedAccount.findUnique({
    where: { provider_providerAccountId: { provider: account.provider, providerAccountId: account.providerAccountId } },
  })
  if (linked && linked.userId !== currentUser.id) {
    throw errorWithStatus('Esta cuenta social ya está vinculada a otro usuario', 409)
  }
  if (!linked) await prisma.linkedAccount.create({ data: linkedAccountData(currentUser.id, account) })
  return listLinkedAccounts(currentUser.id)
}

export async function listLinkedAccounts(userId) {
  return prisma.linkedAccount.findMany({
    where: { userId: Number(userId) },
    select: { provider: true, email: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
}

export async function unlinkSocialAccount(userId, provider) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    include: { linkedAccounts: true },
  })
  if (!user) throw errorWithStatus('Usuario no encontrado', 404)

  const account = user.linkedAccounts.find((item) => item.provider === provider)
  if (!account) throw errorWithStatus('La cuenta social no está vinculada', 404)

  const loginMethods = user.linkedAccounts.length + (user.passwordHash ? 1 : 0)
  if (loginMethods <= 1) {
    throw errorWithStatus('No puedes desvincular tu único método de acceso. Establece una contraseña primero.', 409, 'LAST_LOGIN_METHOD')
  }

  await prisma.linkedAccount.delete({ where: { id: account.id } })
  return listLinkedAccounts(user.id)
}
