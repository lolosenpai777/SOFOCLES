import crypto from 'node:crypto'
import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

function configured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass && env.smtp.from)
}

export function createOpaqueToken() {
  const token = crypto.randomBytes(32).toString('base64url')
  return { token, tokenHash: crypto.createHash('sha256').update(token).digest('hex') }
}

export async function sendSecurityEmail({ to, subject, url }) {
  if (!configured()) {
    if (env.nodeEnv !== 'production') {
      // Development only: avoids pretending email was delivered while keeping tokens out of API responses.
      console.info(`[mail:development] ${to}: ${url}`)
      return
    }
    const error = new Error('El servicio de correo no está configurado')
    error.statusCode = 503
    throw error
  }

  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  })
  await transporter.sendMail({ from: env.smtp.from, to, subject, text: `${subject}: ${url}` })
}
