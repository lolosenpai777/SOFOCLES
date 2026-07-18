import { z } from 'zod'

export const createPostSchema = z.object({
  title: z
    .string({
      error: 'El titulo debe ser texto',
    })
    .trim()
    .min(1, 'El titulo es obligatorio')
    .max(120, 'El titulo no puede superar 120 caracteres'),
  content: z
    .string({
      error: 'El contenido debe ser texto',
    })
    .trim()
    .min(1, 'El contenido no puede estar vacío')
    .max(2000, 'El contenido no puede superar 2000 caracteres'),
})