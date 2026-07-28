import { storeImage } from '../services/storage.service.js'
import { updateUserProfile } from '../services/user.service.js'

function absoluteUrl(request, url) {
  if (!url.startsWith('/')) return url
  return `${request.headers['x-forwarded-proto'] ?? 'http'}://${request.headers.host}${url}`
}

export async function uploadAvatarHandler(request, reply) {
  const url = await storeImage(request.body.imageData, 'avatar')
  const user = await updateUserProfile(request.userId, { avatarUrl: absoluteUrl(request, url) })
  return reply.code(201).send({ url: user.avatarUrl, user })
}

export async function uploadPostAttachmentHandler(request, reply) {
  const url = await storeImage(request.body.imageData, 'post')
  return reply.code(201).send({ url: absoluteUrl(request, url) })
}
