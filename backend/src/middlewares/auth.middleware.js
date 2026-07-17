export async function requireAuth(request, reply) {
  try {
    await request.jwtVerify()
    // Attach a convenience `userId` property from the JWT `sub` claim
    try {
      if (request.user && request.user.sub) {
        request.userId = request.user.sub
      }
    } catch {}
  } catch {
    return reply.code(401).send({
      mensaje: 'No autorizado',
    })
  }
}