import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { linkSocialAccount, listLinkedAccounts, unlinkSocialAccount } from '../services/social-auth.service.js'

const exchanges = new Map()

function makeExchange(user) {
  const code = crypto.randomBytes(32).toString('base64url')
  exchanges.set(code, { user, expiresAt: Date.now() + 2 * 60 * 1000 })
  return code
}

export function socialCallbackHandler(request, reply) {
  const result = request.oauthUser
  if (!result) return reply.redirect(`${env.appUrl}/?oauthError=oauth_failed`)

  if (result.mode === 'link') {
    return completeSocialLinkResult(request, reply, result.account)
  }

  const code = makeExchange(result.user)
  return reply.redirect(`${env.appUrl}/oauth/callback?code=${encodeURIComponent(code)}`)
}

async function completeSocialLinkResult(request, reply, account) {
  const userId = request.session.get('oauthLinkUserId')
  request.session.delete()
  if (!userId) return reply.redirect(`${env.appUrl}/?oauthError=link_failed`)
  try {
    await linkSocialAccount(userId, account)
    return reply.redirect(`${env.appUrl}/?oauthLinked=${encodeURIComponent(account.provider)}`)
  } catch (error) {
    return reply.redirect(`${env.appUrl}/?oauthError=${encodeURIComponent(error.code || 'link_failed')}`)
  }
}

export async function exchangeOAuthCodeHandler(request, reply) {
  const code = String(request.body?.code ?? '')
  const exchange = exchanges.get(code)
  if (!exchange || exchange.expiresAt < Date.now()) {
    exchanges.delete(code)
    return reply.code(400).send({ error: 'El enlace de inicio de sesión ya no es válido' })
  }
  exchanges.delete(code)
  const token = await reply.jwtSign({
    sub: exchange.user.id,
    username: exchange.user.username,
    email: exchange.user.email,
    role: exchange.user.role,
    moderationRole: exchange.user.moderationRole,
  })
  return reply.send({ token, usuario: exchange.user })
}

export async function beginSocialLinkHandler(request, reply) {
  const provider = request.params.provider
  if (!['google', 'discord'].includes(provider)) return reply.code(400).send({ error: 'Proveedor no válido' })
  request.session.set('oauthLinkUserId', Number(request.userId))
  const callbackUrl = provider === 'google' ? env.oauth.googleCallbackUrl : env.oauth.discordCallbackUrl
  const apiOrigin = new URL(callbackUrl).origin
  return reply.send({ url: `${apiOrigin}/api/auth/link/${provider}/start` })
}

export async function completeSocialLinkHandler(request, reply) {
  const userId = request.session.get('oauthLinkUserId')
  const account = request.oauthUser?.account
  request.session.delete()
  if (!userId || request.oauthUser?.mode !== 'link' || !account) return reply.redirect(`${env.appUrl}/?oauthError=link_failed`)
  try {
    await linkSocialAccount(userId, account)
    return reply.redirect(`${env.appUrl}/?oauthLinked=${encodeURIComponent(account.provider)}`)
  } catch (error) {
    return reply.redirect(`${env.appUrl}/?oauthError=${encodeURIComponent(error.code || 'link_failed')}`)
  }
}

export async function listLinkedAccountsHandler(request) {
  return { accounts: await listLinkedAccounts(request.userId) }
}

export async function unlinkSocialAccountHandler(request) {
  return { accounts: await unlinkSocialAccount(request.userId, request.params.provider) }
}
