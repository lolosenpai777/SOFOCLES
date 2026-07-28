import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { env } from '../config/env.js'

const MAX_INPUT_BYTES = 8 * 1024 * 1024
const MAX_DIMENSION = 2048

function inputBuffer(imageData) {
  const match = String(imageData ?? '').match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/)
  if (!match) throw Object.assign(new Error('La imagen debe ser PNG, JPEG, WebP o GIF en formato data URL'), { statusCode: 400 })
  const buffer = Buffer.from(match[2], 'base64')
  if (!buffer.length || buffer.length > MAX_INPUT_BYTES) throw Object.assign(new Error('La imagen supera el límite de 8 MB'), { statusCode: 413 })
  return buffer
}

async function normalizeImage(imageData) {
  const buffer = inputBuffer(imageData)
  const metadata = await sharp(buffer, { animated: false }).metadata().catch(() => null)
  if (!metadata?.format || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) throw Object.assign(new Error('El contenido no es una imagen admitida'), { statusCode: 400 })
  const optimized = await sharp(buffer, { animated: false }).rotate().resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
  return optimized
}

async function uploadCloudinary(buffer, folder) {
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${env.cloudinary.apiSecret}`).digest('hex')
  const form = new FormData()
  form.set('file', new Blob([buffer], { type: 'image/webp' }), 'image.webp')
  form.set('api_key', env.cloudinary.apiKey)
  form.set('timestamp', String(timestamp))
  form.set('folder', folder)
  form.set('signature', signature)
  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/image/upload`, { method: 'POST', body: form })
  if (!response.ok) throw Object.assign(new Error('No se pudo almacenar la imagen en la nube'), { statusCode: 502 })
  return (await response.json()).secure_url
}

export async function storeImage(imageData, kind = 'post') {
  const buffer = await normalizeImage(imageData)
  if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) return uploadCloudinary(buffer, `sofocles/${kind}`)
  const fileName = `${kind}-${crypto.randomUUID()}.webp`
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, fileName), buffer, { flag: 'wx' })
  return `/uploads/${fileName}`
}
