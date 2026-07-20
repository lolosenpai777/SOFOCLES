function isTokenExpired(error) {
  return (
    error?.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' ||
    error?.name === 'TokenExpiredError'
  )
}

function isMissingToken(error) {
  return (
    error?.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' ||
    error?.code === 'FST_JWT_NO_AUTHORIZATION_IN_COOKIE'
  )
}

function isInvalidToken(error) {
  return (
    error?.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID' ||
    error?.code === 'FST_JWT_AUTHORIZATION_TOKEN_UNTRUSTED' ||
    error?.code === 'FST_JWT_BAD_REQUEST' ||
    error?.name === 'JsonWebTokenError' ||
    error?.name === 'NotBeforeError'
  )
}

export async function requireAuth(request, reply) {
  const authorizationHeader = request.headers?.authorization
  if (!authorizationHeader) {
    return reply.code(401).send({ error: 'No autenticado' })
  }

  try {
    await request.jwtVerify()

    // Expose a normalized userId from the JWT subject claim for downstream handlers.
    if (request.user && request.user.sub) {
      const normalizedUserId = Number(request.user.sub)
      request.userId = Number.isNaN(normalizedUserId) ? request.user.sub : normalizedUserId
      request.user.id = request.userId
    }
  } catch (error) {
    request.log.warn({ err: error }, 'Fallo de autenticacion por token')

    if (isMissingToken(error)) {
      return reply.code(401).send({ error: 'No autenticado' })
    }

    if (isTokenExpired(error)) {
      return reply
        .code(401)
        .send({ error: 'Sesión expirada, por favor inicia sesión nuevamente' })
    }

    if (isInvalidToken(error)) {
      return reply.code(401).send({ error: 'Token inválido' })
    }

    // Unexpected auth failures are delegated to the global error handler.
    throw error
  }
}