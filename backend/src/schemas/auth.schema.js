import { z } from 'zod'
import { usernameSchema } from './shared/username.schema.js'

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
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const tokenSchema = z.object({
  token: z.string().trim().min(20, 'Token inválido').max(200),
})

export const forgotPasswordSchema = z.object({ email: emailSchema })
export const resetPasswordSchema = z.object({ token: z.string().trim().min(20).max(200), password: passwordSchema.min(8) })
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema.min(8) })
