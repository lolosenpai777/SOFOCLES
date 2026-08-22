import bcrypt from 'bcryptjs'
import { prisma } from '../config/prisma.js'

export async function ensureDefaultAdmin() {
  try {
    const adminUsers = [
      {
        username: 'Adriano',
        email: 'adriano@gmail.com',
        password: 'password123',
        role: 'ADMIN',
        moderationRole: 'ADMIN',
        biography: 'Administrador de Sófocles',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Adriano',
      },
      {
        username: 'Paul9',
        email: 'paul9@gmail.com',
        password: 'password123',
        role: 'ADMIN',
        moderationRole: 'ADMIN',
        biography: 'Administrador del ágora',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Paul9',
      },
      {
        username: 'Paul',
        email: 'paul@gmail.com',
        password: 'password123',
        role: 'ADMIN',
        moderationRole: 'ADMIN',
        biography: 'Administrador del ágora',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Paul',
      },
    ]

    for (const adminConfig of adminUsers) {
      const passwordHash = await bcrypt.hash(adminConfig.password, 10)

      const existingByEmail = await prisma.user.findUnique({
        where: { email: adminConfig.email },
      })

      if (existingByEmail) {
        await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            username: existingByEmail.username || adminConfig.username,
            role: 'ADMIN',
            moderationRole: 'ADMIN',
            passwordHash,
            emailVerified: true,
            emailVerifiedAt: existingByEmail.emailVerifiedAt || new Date(),
            biography: existingByEmail.biography || adminConfig.biography,
            avatarUrl: existingByEmail.avatarUrl || adminConfig.avatarUrl,
          },
        })
        console.log(`✓ [Bootstrap] Usuario admin '${existingByEmail.username}' (${adminConfig.email}) actualizado y verificado con contraseña '${adminConfig.password}'`)
      } else {
        const existingByUsername = await prisma.user.findUnique({
          where: { username: adminConfig.username },
        })

        const finalUsername = existingByUsername ? `${adminConfig.username}_${Date.now().toString().slice(-4)}` : adminConfig.username

        await prisma.user.create({
          data: {
            username: finalUsername,
            email: adminConfig.email,
            passwordHash,
            role: 'ADMIN',
            moderationRole: 'ADMIN',
            emailVerified: true,
            emailVerifiedAt: new Date(),
            biography: adminConfig.biography,
            avatarUrl: adminConfig.avatarUrl,
          },
        })
        console.log(`✓ [Bootstrap] Usuario admin '${finalUsername}' (${adminConfig.email}) creado exitosamente con contraseña '${adminConfig.password}'`)
      }
    }

    // Auto-verify all users in database so email verification never blocks local login
    await prisma.user.updateMany({
      data: {
        emailVerified: true,
      },
    })
    console.log('✓ [Bootstrap] Todos los usuarios fueron marcados como verificados (emailVerified: true)')

  } catch (error) {
    console.error('❌ [Bootstrap] Error asegurando usuarios administradores:', error)
  }
}
