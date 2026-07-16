import { authenticateUser, registerUser } from '../services/auth.service.js'

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