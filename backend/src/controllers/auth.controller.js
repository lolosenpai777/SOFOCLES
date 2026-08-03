import { authenticateUser, registerUser, verifyEmail, verifyEmailCode, resendVerification, requestPasswordReset, resetPassword, changePassword, checkRegistrationAvailability } from '../services/auth.service.js'

export function signAuthToken(reply, user) {
  return reply.jwtSign({
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    moderationRole: user.moderationRole,
    emailVerified: Boolean(user.emailVerified),
    needsUsernameSetup: Boolean(user.needsUsernameSetup),
  })
}

export async function registerHandler(request, reply) {
  try {
    await registerUser(request.body)
    return reply.code(202).send({ mensaje: 'Cuenta creada. Revisa tu correo e ingresa el código para activar tu cuenta.' })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    const payload = { mensaje: error.message || 'Error al registrar usuario' }
    if (error.code) payload.code = error.code
    if (error.field) {
      payload.field = error.field
      payload.message = payload.mensaje
    }
    return reply.code(statusCode).send(payload)
  }
}

export async function checkAvailabilityHandler(request, reply) {
  const result = await checkRegistrationAvailability(request.query.field, request.query.value)
  return reply.send(result)
}

export async function loginHandler(request, reply) {
  try {
    const user = await authenticateUser(request.body)
    const token = await signAuthToken(reply, user)

    return reply.send({
      mensaje: 'Login exitoso',
      token,
      usuario: user,
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    const payload = {
      mensaje: error.message || 'Error al iniciar sesión',
    }
    if (error.code) payload.code = error.code
    if (Object.prototype.hasOwnProperty.call(error, 'suspendedUntil')) {
      payload.suspendedUntil = error.suspendedUntil
    }

    return reply.code(statusCode).send(payload)
  }
}

export async function verifyEmailHandler(request, reply) {
  const verified = await verifyEmail(request.body?.token)
  if (!verified) return reply.code(400).send({ error: 'El enlace de verificación no es válido o expiró' })
  return reply.send({ mensaje: 'Correo verificado correctamente' })
}

export async function verifyEmailCodeHandler(request, reply) {
  try {
    const user = await verifyEmailCode(request.body.email, request.body.code)
    const token = await signAuthToken(reply, user)
    return reply.send({ mensaje: 'Correo verificado correctamente', token, usuario: user })
  } catch (error) {
    return reply.code(error.statusCode ?? 400).send({ error: error.message || 'El código de verificación no es válido.' })
  }
}

export async function resendVerificationHandler(request, reply) {
  try {
    await resendVerification(request.body.email)
  } catch (error) {
    // Keep the response identical for unknown, verified, and rate-limited emails.
    if (error.code !== 'VERIFICATION_RATE_LIMITED') throw error
  }
  return reply.code(202).send({ mensaje: 'Si el correo puede recibir un código, lo recibirás pronto.' })
}

export async function forgotPasswordHandler(request, reply) {
  await requestPasswordReset(request.body.email)
  return reply.send({ mensaje: 'Si el correo existe, recibirás instrucciones para restablecer la contraseña' })
}

export async function resetPasswordHandler(request, reply) {
  await resetPassword(request.body.token, request.body.password)
  return reply.send({ mensaje: 'Contraseña actualizada correctamente' })
}

export async function changePasswordHandler(request, reply) {
  await changePassword(request.userId, request.body.currentPassword, request.body.newPassword)
  return reply.send({ mensaje: 'Contraseña actualizada correctamente' })
}
