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
  imageUrl: z
    .string({
      error: 'La URL de la imagen debe ser texto',
    })
    .trim()
    .max(1000, 'La URL es demasiado larga')
    .optional(),
  imageData: z
    .string({
      error: 'imageData debe ser texto en formato data URL',
    })
    .optional(),
})

export const deletePostParamsSchema = z.object({
  id: z.coerce
    .number({
      error: 'El id del post debe ser un numero',
    })
    .int('El id del post debe ser un entero')
    .positive('El id del post debe ser mayor que cero'),
})