import { verifyIdentity } from '../services/identity-verification.service.js'

export async function verifyIdentityHandler(request, reply) {
  const result = await verifyIdentity(request.userId, request.body)
  return reply.code(200).send(result)
}
