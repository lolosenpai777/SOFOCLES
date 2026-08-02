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
