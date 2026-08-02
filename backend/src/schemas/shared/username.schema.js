import { z } from 'zod'

export const usernameSchema = z
  .string({ error: 'El username debe ser texto' })
  .trim()
  .min(3, 'El username debe tener al menos 3 caracteres')
  .max(40, 'El username no puede superar 40 caracteres')

export function normalizeUsername(username) {
  const value = String(username ?? '').trim()
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}
