export function validateBody(schema) {
  return async function validateBodyHandler(request, reply) {
    const parsed = schema.safeParse(request.body ?? {})

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      const message = firstIssue?.message || 'Solicitud invalida'
      return reply.code(400).send({ error: message })
    }

    // Keep sanitized/trimmed values produced by Zod for downstream handlers.
    request.body = parsed.data
  }
}