export async function requireAuth(request, reply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.code(401).send({
      mensaje: 'No autorizado',
    })
  }
}