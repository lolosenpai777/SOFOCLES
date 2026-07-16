import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

export const env = {
  port: Number(process.env.PORT ?? 5000),
  jwtSecret: process.env.JWT_SECRET ?? 'sofocles-dev-secret',
}