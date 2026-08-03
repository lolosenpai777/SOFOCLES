import crypto from 'node:crypto'
import { Resend } from 'resend'
import { env } from '../config/env.js'

function configured() {
  return Boolean(env.resend.apiKey && env.resend.from)
}

export function createOpaqueToken() {
  const token = crypto.randomBytes(32).toString('base64url')
  return { token, tokenHash: crypto.createHash('sha256').update(token).digest('hex') }
}

const resend = env.resend.apiKey ? new Resend(env.resend.apiKey) : null
const existingAccountNoticeSentAt = new Map()
const EXISTING_ACCOUNT_NOTICE_INTERVAL_MS = 2 * 60 * 60 * 1000

async function sendEmail({ to, subject, text, html }) {
  if (!configured()) {
    if (env.nodeEnv !== 'production') {
      // Development only: never return verification secrets through the API.
      console.info(`[mail:development] ${to}: ${subject}`)
      return
    }
    const error = new Error('El servicio de correo no está configurado')
    error.statusCode = 503
    throw error
  }

  const { error } = await resend.emails.send({
    from: env.resend.from,
    to: [to],
    subject,
    text,
    html,
  })
  if (error) {
    const sendError = new Error('No se pudo enviar el correo')
    sendError.statusCode = 503
    throw sendError
  }
}

export async function sendSecurityEmail({ to, subject, url }) {
  await sendEmail({
    to,
    subject,
    text: `${subject}: ${url}`,
    html: `<p>${subject}</p><p><a href="${url}">${url}</a></p>`,
  })
}

export async function sendVerificationCodeEmail({ to, code }) {
  await sendEmail({
    to,
    subject: 'Verifica tu correo',
    text: `Tu código de verificación es: ${code}\n\nEste código caduca en 15 minutos.`,
    html: `<p>Tu código de verificación es:</p><p><strong>${code}</strong></p><p>Este código caduca en 15 minutos.</p>`,
  })
}

export async function sendExistingAccountNotice({ to, send = sendEmail }) {
  const destination = String(to ?? '').trim().toLowerCase()
  const now = Date.now()
  const lastSentAt = existingAccountNoticeSentAt.get(destination)
  if (lastSentAt && now - lastSentAt < EXISTING_ACCOUNT_NOTICE_INTERVAL_MS) return false

  existingAccountNoticeSentAt.set(destination, now)
  try {
    await send({
      to,
      subject: 'Intento de registro en Sofocles',
      text: 'Alguien intentó registrarse con tu correo en Sofocles. Si fuiste tú, ya tienes una cuenta: inicia sesión. Si no fuiste tú, puedes ignorar este mensaje.',
      html: '<p>Alguien intentó registrarse con tu correo en Sofocles.</p><p>Si fuiste tú, ya tienes una cuenta: inicia sesión.</p><p>Si no fuiste tú, puedes ignorar este mensaje.</p>',
    })
    return true
  } catch (error) {
    existingAccountNoticeSentAt.delete(destination)
    throw error
  }
}
