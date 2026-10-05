import { z } from 'zod'
import { usernameSchema } from './shared/username.schema.js'

export const updateUsernameSchema = z.object({
  username: usernameSchema,
})

export const updateUserBadgesSchema = z.object({
  isVerified: z.boolean().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  moderationRole: z.enum(['NONE', 'JUNIOR', 'ADMIN']).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'Debes indicar al menos un badge o rol' })
