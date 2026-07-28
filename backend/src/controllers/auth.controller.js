import { authenticateUser, registerUser, verifyEmail, requestPasswordReset, resetPassword, changePassword } from '../services/auth.service.js'

export async function registerHandler(request, reply) {
  try {
    const user = await registerUser(request.body)

    return reply.code(201).send({
      mensaje: 'Usuario registrado correctamente',
      usuario: user,
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return reply.code(statusCode).send({
      mensaje: error.message || 'Error al registrar usuario',
    })
  }
}

export async function loginHandler(request, reply) {
  try {
    const user = await authenticateUser(request.body)
    const token = await reply.jwtSign({
      sub: user.id,
      username: user.username,
      email: user.email,
    })

    return reply.send({
      mensaje: 'Login exitoso',
      token,
      usuario: user,
    })
  } catch (error) {
    const statusCode = error.statusCode ?? 500

    return reply.code(statusCode).send({
      mensaje: error.message || 'Error al iniciar sesión',
    })
  }
}

export async function verifyEmailHandler(request, reply) {
  const verified = await verifyEmail(request.body?.token)
  if (!verified) return reply.code(400).send({ error: 'El enlace de verificación no es válido o expiró' })
  return reply.send({ mensaje: 'Correo verificado correctamente' })
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
