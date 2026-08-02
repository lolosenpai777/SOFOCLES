import { prisma } from '../config/prisma.js'
import { normalizeUsername } from '../schemas/shared/username.schema.js'

export async function findUsernameConflict(username, excludeUserId = null) {
  const canonicalUsername = normalizeUsername(username).toLowerCase()
  const rows = excludeUserId === null
    ? await prisma.$queryRaw`SELECT id FROM "users" WHERE LOWER("username") = ${canonicalUsername} LIMIT 1`
    : await prisma.$queryRaw`SELECT id FROM "users" WHERE LOWER("username") = ${canonicalUsername} AND id <> ${Number(excludeUserId)} LIMIT 1`

  return rows[0] || null
}
