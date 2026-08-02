import { requireAuth } from '../middlewares/auth.middleware.js'
import { providerConfigured } from '../config/passport.js'
import {
  beginSocialLinkHandler,
  completeSocialLinkHandler,
  exchangeOAuthCodeHandler,
  listLinkedAccountsHandler,
  socialCallbackHandler,
  unlinkSocialAccountHandler,
} from '../controllers/social-auth.controller.js'

function providerGuard(provider, request, reply, done) {
  if (!providerConfigured(provider)) return reply.code(503).send({ error: `OAuth de ${provider} no está configurado` })
  done()
}

function authenticateProvider(fastifyPassport, provider, env) {
  const scope = provider === 'google' ? ['profile', 'email'] : ['identify', 'email']
  return fastifyPassport.authenticate(provider, { authInfo: false, state: true, scope }, async (request, reply, error, user) => {
    if (error || !user) {
      const code = error?.code || 'oauth_failed'
      return reply.redirect(`${env.appUrl}/?oauthError=${encodeURIComponent(code)}`)
    }
    // The final application login remains JWT + localStorage; this property is
    // only the transient result passed to the callback handler.
    request.oauthUser = user
  })
}

export async function socialAuthRoutes(fastify) {
  const fastifyPassport = fastify.passport
  const { env } = await import('../config/env.js')
  for (const provider of ['google', 'discord']) {
    fastify.get(`/auth/${provider}`, {
      preValidation: [
        (request, reply, done) => providerGuard(provider, request, reply, done),
        authenticateProvider(fastifyPassport, provider, env),
      ],
    }, async () => {})

    fastify.get(`/auth/${provider}/callback`, {
      preValidation: [
        authenticateProvider(fastifyPassport, provider, env),
      ],
    }, socialCallbackHandler)

    fastify.get(`/auth/link/${provider}/start`, {
      preValidation: [
        authenticateProvider(fastifyPassport, provider, env),
      ],
    }, async () => {})

    fastify.get(`/auth/link/${provider}/callback`, {
      preValidation: [
        authenticateProvider(fastifyPassport, provider, env),
      ],
    }, completeSocialLinkHandler)
  }

  fastify.post('/auth/oauth/exchange', exchangeOAuthCodeHandler)
  fastify.post('/auth/link/:provider', { preHandler: requireAuth }, beginSocialLinkHandler)
  fastify.get('/auth/linked-accounts', { preHandler: requireAuth }, listLinkedAccountsHandler)
  fastify.delete('/auth/link/:provider', { preHandler: requireAuth }, unlinkSocialAccountHandler)
}
