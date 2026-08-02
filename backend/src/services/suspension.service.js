import { prisma } from '../config/prisma.js'

function isActiveSuspension(row) {
  if (!row || row.active !== true) return false
  if (row.type === 'PERMANENT') return true
  if (!row.endAt) return true
  return new Date(row.endAt).getTime() > Date.now()
}

export async function getActiveSuspensions(userId) {
  const rows = await prisma.userSuspension.findMany({
    where: {
      userId: Number(userId),
      active: true,
      OR: [{ type: 'PERMANENT' }, { endAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'desc' },
  })

  return rows.filter(isActiveSuspension)
}

export async function ensureUserCanAuthenticate(userId) {
  const active = await getActiveSuspensions(userId)
  const accountSuspension = active.find((item) => item.scope === 'ACCOUNT')
  if (!accountSuspension) return

  const error = new Error(
    accountSuspension.type === 'PERMANENT'
      ? 'Tu cuenta está suspendida permanentemente'
      : `Tu cuenta está suspendida hasta ${new Date(accountSuspension.endAt).toISOString()}`,
  )
  error.statusCode = 403
  error.code = 'ACCOUNT_SUSPENDED'
  error.suspendedUntil =
    accountSuspension.type === 'PERMANENT' || !accountSuspension.endAt
      ? null
      : new Date(accountSuspension.endAt).toISOString()
  throw error
}

export async function ensureNotRestricted(userId, scope = 'ACCOUNT') {
  const active = await getActiveSuspensions(userId)
  const restriction = active.find((item) => item.scope === scope || item.scope === 'ACCOUNT')
  if (!restriction) return

  const error = new Error(
    restriction.type === 'PERMANENT'
      ? 'Tu cuenta se encuentra suspendida'
      : `Tu cuenta está restringida hasta ${new Date(restriction.endAt).toISOString()}`,
  )
  error.statusCode = 403
  error.code = restriction.scope === 'COMMENT_ONLY' ? 'COMMENT_RESTRICTED' : 'ACCOUNT_SUSPENDED'
  error.suspendedUntil =
    restriction.type === 'PERMANENT' || !restriction.endAt
      ? null
      : new Date(restriction.endAt).toISOString()
  throw error
}
