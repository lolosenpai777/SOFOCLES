import { z } from 'zod'

const emailSchema = z
  .string({ error: 'El email debe ser texto' })
  .trim()
  .email('Email invalido')

const passwordSchema = z
  .string({ error: 'La contraseña debe ser texto' })
  .min(6, 'La contraseña debe tener al menos 6 caracteres')
  .max(128, 'La contraseña no puede superar 128 caracteres')

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const registerSchema = z.object({
  username: z
    .string({ error: 'El username debe ser texto' })
    .trim()
    .min(3, 'El username debe tener al menos 3 caracteres')
    .max(40, 'El username no puede superar 40 caracteres'),
  email: emailSchema,
  password: passwordSchema,
})