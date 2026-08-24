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
  imageDatas: z.array(z.string()).max(8).optional(),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS']).default('PUBLIC'),
  hashtags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
})

export const updatePostSchema = z.object({
  title: z
    .string({
      error: 'El titulo debe ser texto',
    })
    .trim()
    .min(1, 'El titulo no puede estar vacío')
    .max(120, 'El titulo no puede superar 120 caracteres')
    .optional(),
  content: z
    .string({
      error: 'El contenido debe ser texto',
    })
    .trim()
    .min(1, 'El contenido no puede estar vacío')
    .max(2000, 'El contenido no puede superar 2000 caracteres')
    .optional(),
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
  removeImage: z
    .boolean({
      error: 'removeImage debe ser booleano',
    })
    .optional(),
  imageDatas: z.array(z.string()).max(8).optional(),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS']).optional(),
  hashtags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
})

export const deletePostParamsSchema = z.object({
  id: z.coerce
    .number({
      error: 'El id del post debe ser un numero',
    })
    .int('El id del post debe ser un entero')
    .positive('El id del post debe ser mayor que cero'),
})
