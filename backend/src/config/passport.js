import crypto from 'node:crypto'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as DiscordStrategy } from 'passport-discord-auth'
import { env } from './env.js'
import { prisma } from './prisma.js'
import { loginOrRegisterSocialAccount, normalizeSocialProfile } from '../services/social-auth.service.js'

function getSessionKey() {
  if (env.oauth.sessionKey) {
    const key = Buffer.from(env.oauth.sessionKey, 'base64url')
    if (key.length !== 32) throw new Error('OAUTH_SESSION_KEY debe decodificar a exactamente 32 bytes')
    return key
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Falta OAUTH_SESSION_KEY fuera de desarrollo')
  }
  return crypto.randomBytes(32)
}

export const oauthSessionKey = getSessionKey()
export const secureCookie = process.env.NODE_ENV === 'development' ? false : true

export function configurePassport(fastifyPassport) {
  // @fastify/passport exige ambos callbacks para serializar el usuario en la
  // cookie temporal; esta sesión dura solo el handshake OAuth y no reemplaza el JWT.
  fastifyPassport.registerUserSerializer(async (user) => user.id)
  fastifyPassport.registerUserDeserializer(async (userId) => {
    // Se registra por contrato del adaptador, pero la aplicación no usa esta
    // sesión para persistir login: el login real continúa siendo JWT + localStorage.
    return prisma.user.findUnique({ where: { id: Number(userId) } })
  })

  if (env.oauth.googleClientId && env.oauth.googleClientSecret) {
    for (const name of ['google', 'google-link']) {
      fastifyPassport.use(name, new GoogleStrategy({
        clientID: env.oauth.googleClientId,
        clientSecret: env.oauth.googleClientSecret,
        callbackURL: env.oauth.googleCallbackUrl,
        passReqToCallback: true,
      }, async (request, accessToken, refreshToken, profile, done) => {
        try {
          const account = normalizeSocialProfile('google', profile, accessToken, refreshToken)
          if (request.session.get('oauthLinkUserId')) return done(null, { mode: 'link', account })
          return done(null, { mode: 'login', user: await loginOrRegisterSocialAccount(account) })
        } catch (error) { return done(error) }
      }))
    }
  }

  if (env.oauth.discordClientId && env.oauth.discordClientSecret) {
    for (const name of ['discord', 'discord-link']) {
      fastifyPassport.use(name, new DiscordStrategy({
        clientId: env.oauth.discordClientId,
        clientSecret: env.oauth.discordClientSecret,
        callbackUrl: env.oauth.discordCallbackUrl,
        scope: ['identify', 'email'],
        passReqToCallback: true,
      }, async (request, accessToken, refreshToken, profile, done) => {
        try {
          const account = normalizeSocialProfile('discord', profile, accessToken, refreshToken)
          if (request.session.get('oauthLinkUserId')) return done(null, { mode: 'link', account })
          return done(null, { mode: 'login', user: await loginOrRegisterSocialAccount(account) })
        } catch (error) { return done(error) }
      }))
    }
  }
}

export function providerConfigured(provider) {
  return provider === 'google'
    ? Boolean(env.oauth.googleClientId && env.oauth.googleClientSecret)
    : Boolean(env.oauth.discordClientId && env.oauth.discordClientSecret)
}
