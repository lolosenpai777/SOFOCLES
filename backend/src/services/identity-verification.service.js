import { env } from '../config/env.js'
import { prisma } from '../config/prisma.js'

const MAX_IMAGE_DATA_LENGTH = 10 * 1024 * 1024

function parseImageData(data, fieldName) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(String(data || ''))
  if (!match || match[0].length > MAX_IMAGE_DATA_LENGTH) {
    const error = new Error(`${fieldName} debe ser una imagen JPEG, PNG o WebP menor de 10 MB`)
    error.statusCode = 400
    throw error
  }
  return { mimeType: match[1], data: match[2].replace(/\s/g, '') }
}

function parseModelResult(payload) {
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
  if (!text) throw new Error('El proveedor de IA no devolvió un resultado válido')
  const json = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
  try {
    return JSON.parse(json)
  } catch {
    throw new Error('El proveedor de IA devolvió una respuesta no interpretable')
  }
}

export async function verifyIdentity(userId, { documentImage, selfieImage, consent }) {
  if (consent !== true) {
    const error = new Error('Debes aceptar el tratamiento temporal de las imágenes para verificarte')
    error.statusCode = 400
    throw error
  }
  if (!env.ai.geminiApiKey) {
    const error = new Error('La verificación de identidad no está configurada en el servidor')
    error.statusCode = 503
    throw error
  }

  const document = parseImageData(documentImage, 'El documento')
  const selfie = parseImageData(selfieImage, 'La selfie')
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.ai.geminiModel)}:generateContent?key=${encodeURIComponent(env.ai.geminiApiKey)}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'Analiza temporalmente estas dos imágenes para una comprobación básica. Responde únicamente JSON válido con las claves documentValid, selfiePresent, samePersonLikely, reason. No devuelvas ni extraigas nombres, números, fechas, direcciones ni otros datos personales. documentValid debe ser false si el documento es ilegible, parece alterado o no es un documento de identidad. samePersonLikely solo puede ser true si la selfie y la foto del documento parecen corresponder a la misma persona. Esto no es una verificación legal ni biométrica.' },
            { inlineData: document },
            { inlineData: selfie },
          ],
        }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    })
    if (!response.ok) {
      const error = new Error('El proveedor de IA no pudo procesar las imágenes')
      error.statusCode = response.status === 429 ? 429 : 502
      throw error
    }
    const result = parseModelResult(await response.json())
    const verified = result.documentValid === true && result.selfiePresent === true && result.samePersonLikely === true
    const now = verified ? new Date() : null
    await prisma.$transaction([
      prisma.identityVerification.upsert({
        where: { userId: Number(userId) },
        create: { userId: Number(userId), status: verified ? 'VERIFIED' : 'REJECTED', provider: 'gemini', verifiedAt: now },
        update: { status: verified ? 'VERIFIED' : 'REJECTED', provider: 'gemini', verifiedAt: now },
      }),
      prisma.user.update({
        where: { id: Number(userId) },
        data: { isVerified: verified },
      }),
    ])
    return { verified, reason: typeof result.reason === 'string' ? result.reason.slice(0, 240) : '' }
  } finally {
    clearTimeout(timeout)
  }
}
