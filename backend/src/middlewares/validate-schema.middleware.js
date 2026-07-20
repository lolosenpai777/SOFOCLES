function validatePart(part, schema) {
  return async function validatePartHandler(request, reply) {
    const parsed = schema.safeParse(request[part] ?? {})

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      const message = firstIssue?.message || 'Solicitud invalida'
      return reply.code(400).send({ error: message })
    }

    // Keep sanitized/trimmed values produced by Zod for downstream handlers.
    request[part] = parsed.data
  }
}

export function validateBody(schema) {
  return validatePart('body', schema)
}

export function validateParams(schema) {
  return validatePart('params', schema)
}