import { z } from 'zod'

export const createCommentSchema = z.object({
  text: z
    .string({
      error: 'El texto del comentario debe ser texto',
    })
    .trim()
    .min(1, 'El comentario no puede estar vacío')
    .max(500, 'El comentario no puede superar 500 caracteres'),
  gifUrl: z
    .string({
      error: 'La URL del GIF debe ser texto',
    })
    .trim()
    .max(1000, 'La URL es demasiado larga')
    .optional()
    .nullable(),
})

export const deleteCommentParamsSchema = z.object({
  id: z.coerce
    .number({
      error: 'El id del post debe ser un numero',
    })
    .int('El id del post debe ser un entero')
    .positive('El id del post debe ser mayor que cero'),
  commentId: z.coerce
    .number({
      error: 'El id del comentario debe ser un numero',
    })
    .int('El id del comentario debe ser un entero')
    .positive('El id del comentario debe ser mayor que cero'),
})
