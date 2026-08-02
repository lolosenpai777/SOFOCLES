import { z } from 'zod'

export const reportCategories = [
  'SPAM',
  'SEXUAL_CONTENT',
  'HATE_SPEECH',
  'HARASSMENT_BULLYING',
  'VIOLENCE_GRAPHIC',
  'MISINFORMATION',
  'SELF_HARM_SUICIDE',
  'MINOR_SAFETY',
  'IMPERSONATION',
  'COPYRIGHT_IP',
  'ILLEGAL_SALES',
  'OTHER',
]

export const reportStatusValues = ['OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED']

export const createReportSchema = z
  .object({
    postId: z.coerce
      .number()
      .int()
      .positive('El id del post debe ser mayor a cero')
      .optional(),
    userId: z.coerce
      .number()
      .int()
      .positive('El id del usuario debe ser mayor a cero')
      .optional(),
    category: z.enum(reportCategories, {
      error: 'La categoría del reporte es obligatoria',
    }),
    details: z.string().trim().max(1000, 'La descripción es demasiado larga').optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (Boolean(data.postId) === Boolean(data.userId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes reportar exactamente una publicación o un usuario',
      })
    }

    if (data.category === 'OTHER') {
      const details = String(data.details ?? '').trim()
      if (details.length < 20) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debes explicar el motivo en al menos 20 caracteres cuando eliges "Otro"',
          path: ['details'],
        })
      }
    }
  })

export const moderationCaseParamsSchema = z.object({
  id: z.coerce.number().int().positive('El id del caso debe ser mayor a cero'),
})

export const reportActionSchema = z
  .object({
    dismiss: z.boolean().optional().default(false),
    contentAction: z.enum(['DELETE_POST']).nullable().optional(),
    sanctionAction: z
      .enum(['ISSUE_WARNING', 'SUSPEND_TEMPORARY', 'SUSPEND_PERMANENT'])
      .nullable()
      .optional(),
    reason: z.string().trim().min(3, 'El motivo es obligatorio').max(500, 'El motivo es demasiado largo'),
    durationHours: z.coerce.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dismiss) {
      if (data.contentAction || data.sanctionAction) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Descartar no se combina con decisiones de resolución',
        })
      }
      return
    }

    if (!data.contentAction && !data.sanctionAction) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes seleccionar al menos una decisión de moderación',
      })
    }

    if (data.sanctionAction === 'SUSPEND_TEMPORARY' && !data.durationHours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes indicar la duración en horas para suspensión temporal',
        path: ['durationHours'],
      })
    }
  })

export const updateCaseStatusSchema = z.object({
  status: z.enum(reportStatusValues, {
    error: 'Estado de caso inválido',
  }),
})

export const reportListQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  bucket: z.enum(['pending', 'resolved', 'all']).optional(),
  status: z.enum(reportStatusValues).optional(),
})

export const sanctionsListQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
  status: z.enum(['ALL', 'WARNING', 'SUSPENDED_TEMPORARY', 'BANNED_PERMANENT']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const revokeSanctionParamsSchema = z.object({
  id: z.coerce.number().int().positive('El id del usuario debe ser mayor a cero'),
  suspensionId: z.coerce.number().int().positive('El id de la sanción debe ser mayor a cero'),
})

export const revokeSanctionSchema = z.object({
  reason: z
    .string({ error: 'El motivo de revocación es obligatorio' })
    .trim()
    .min(3, 'El motivo de revocación es obligatorio')
    .max(500, 'El motivo es demasiado largo'),
})

export const reopenCaseSchema = z.object({
  reason: z
    .string({ error: 'El motivo de reapertura es obligatorio' })
    .trim()
    .min(3, 'El motivo de reapertura es obligatorio')
    .max(500, 'El motivo es demasiado largo'),
})

export const createAppealSchema = z.object({
  moderationActionId: z.coerce
    .number()
    .int('El id de la acción debe ser un entero')
    .positive('El id de la acción debe ser mayor a cero'),
  reason: z
    .string({
      error: 'El motivo de la apelación es obligatorio',
    })
    .trim()
    .min(20, 'La apelación debe explicar el motivo en al menos 20 caracteres')
    .max(1000, 'La apelación es demasiado larga'),
})

export const reviewAppealSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], {
    error: 'El estado de la apelación debe ser APPROVED o REJECTED',
  }),
  reviewerNotes: z.string().trim().max(1000, 'Las notas son demasiado largas').optional().nullable(),
})
