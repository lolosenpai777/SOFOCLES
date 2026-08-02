import { z } from 'zod'
import { usernameSchema } from './shared/username.schema.js'

export const updateUsernameSchema = z.object({
  username: usernameSchema,
})
