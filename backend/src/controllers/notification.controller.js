import { listNotificationsForUser, markNotificationRead, markAllNotificationsRead } from '../services/notification.service.js'

export async function notificationsHandler(request) {
  const userId = request.userId ?? Number(request.user?.sub)
  return listNotificationsForUser(userId, request.query ?? {})
}

export async function markReadHandler(request) {
  const userId = request.userId ?? Number(request.user?.sub)
  const id = request.params.id
  await markNotificationRead(id, userId)
  return { success: true }
}

export async function markAllReadHandler(request) {
  const userId = request.userId ?? Number(request.user?.sub)
  await markAllNotificationsRead(userId)
  return { success: true }
}
