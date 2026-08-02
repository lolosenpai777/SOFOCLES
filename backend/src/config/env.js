import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Falta la variable de entorno obligatoria: ${name}`)
  if (name === 'JWT_SECRET' && value === 'sofocles-dev-secret') {
    throw new Error('JWT_SECRET debe sustituirse por un secreto aleatorio y no puede usar el valor de desarrollo')
  }
  return value
}

function csv(name, fallback = '') {
  return (process.env[name] ?? fallback).split(',').map((value) => value.trim()).filter(Boolean)
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  corsOrigins: csv('CORS_ORIGINS', 'http://localhost:5173'),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:5000/api/auth/google/callback',
    discordClientId: process.env.DISCORD_CLIENT_ID,
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET,
    discordCallbackUrl: process.env.DISCORD_CALLBACK_URL ?? 'http://localhost:5000/api/auth/discord/callback',
    sessionKey: process.env.OAUTH_SESSION_KEY,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.MAIL_FROM,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
}
