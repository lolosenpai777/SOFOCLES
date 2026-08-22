import bcrypt from 'bcryptjs'
import { prisma } from './src/config/prisma.js'

async function main() {
  console.log('🌱 Iniciando seed de datos...')

  // No borrar datos previos - solo agregar lo que no existe

  // Crear usuarios
  const usuarios = [
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
    {
      username: 'Platon',
      email: 'platon@sofocles.com',
      password: 'password123',
      role: 'USER',
      moderationRole: 'NONE',
      biography: 'El filósofo de las ideas inmutables',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Platon',
    },
    {
      username: 'Aristoteles',
      email: 'aristoteles@sofocles.com',
      password: 'password123',
      role: 'USER',
      moderationRole: 'NONE',
      biography: 'Lógico y observador de la naturaleza',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aristoteles',
    },
    {
      username: 'Descartes',
      email: 'descartes@sofocles.com',
      password: 'password123',
      role: 'USER',
      moderationRole: 'NONE',
      biography: 'Dudo, luego existo',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Descartes',
    },
    {
      username: 'Kant',
      email: 'kant@sofocles.com',
      password: 'password123',
      role: 'USER',
      moderationRole: 'NONE',
      biography: 'Crítica de la razón pura',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kant',
    },
    {
      username: 'Nietzsche',
      email: 'nietzsche@sofocles.com',
      password: 'password123',
      role: 'USER',
      moderationRole: 'NONE',
      biography: 'Más allá del bien y del mal',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nietzsche',
    },
  ]

  const usuariosCreados = []

  for (const usuario of usuarios) {
    const existe = await prisma.user.findUnique({
      where: { email: usuario.email },
    })

    if (existe) {
      const updateData = {}
      if (usuario.username && existe.username !== usuario.username) updateData.username = usuario.username
      if (usuario.role && existe.role !== usuario.role) updateData.role = usuario.role
      if (usuario.moderationRole && existe.moderationRole !== usuario.moderationRole) updateData.moderationRole = usuario.moderationRole
      if (usuario.password) updateData.passwordHash = await bcrypt.hash(usuario.password, 10)
      if (usuario.biography !== undefined && existe.biography !== usuario.biography) updateData.biography = usuario.biography
      if (usuario.avatarUrl !== undefined && existe.avatarUrl !== usuario.avatarUrl) updateData.avatarUrl = usuario.avatarUrl
      if (!existe.emailVerified) {
        updateData.emailVerified = true
        updateData.emailVerifiedAt = new Date()
      }

      if (Object.keys(updateData).length > 0) {
        const updated = await prisma.user.update({
          where: { email: usuario.email },
          data: updateData,
        })
        usuariosCreados.push(updated)
        console.log(`✓ Usuario actualizado: ${usuario.username}`)
        continue
      }
      console.log(`✓ Usuario ya existe: ${usuario.username}`)
      usuariosCreados.push(existe)
      continue
    }

    const passwordHash = await bcrypt.hash(usuario.password || 'password123', 10)

    const created = await prisma.user.create({
      data: {
        username: usuario.username,
        email: usuario.email,
        biography: usuario.biography,
        avatarUrl: usuario.avatarUrl,
        role: usuario.role,
        moderationRole: usuario.moderationRole || 'NONE',
        passwordHash: passwordHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    })
    usuariosCreados.push(created)
    console.log(`✓ Usuario creado: ${usuario.username}`)
  }

  const userMap = {}
  for (const u of usuariosCreados) {
    userMap[u.username] = u
  }

  // Posts para cada usuario
  const posts = [
    {
      authorId: userMap['Platon']?.id,
      title: 'La caverna del conocimiento',
      content:
        'Las sombras en la pared no son la realidad. Debemos ascender hacia la verdadera luz de las ideas eternas.',
    },
    {
      authorId: userMap['Platon']?.id,
      title: 'El mundo de las formas',
      content:
        'Todo lo que vemos es una copia imperfecta de las formas perfectas que existen en el mundo inteligible.',
    },
    {
      authorId: userMap['Aristoteles']?.id,
      title: 'Estagirita reflexiones',
      content:
        'La virtud es el equilibrio entre dos extremos. La excelencia se logra a través del hábito y la práctica.',
    },
    {
      authorId: userMap['Aristoteles']?.id,
      title: 'Categorías del ser',
      content:
        'Todo lo que existe puede clasificarse en sustancia, cantidad, cualidad y otras nueve categorías más.',
    },
    {
      authorId: userMap['Descartes']?.id,
      title: 'El método del escepticismo',
      content:
        'He puesto en duda todo lo que puede dudarse. Pero de una cosa estoy seguro: pienso, luego existo.',
    },
    {
      authorId: userMap['Descartes']?.id,
      title: 'Mente y cuerpo',
      content:
        'La mente y el cuerpo son dos sustancias distintas que interactúan. ¿Dónde ocurre esta interacción?',
    },
    {
      authorId: userMap['Kant']?.id,
      title: 'Los imperativos categóricos',
      content:
        'Actúa solo según aquella máxima mediante la que puedas querer, al mismo tiempo, que se convierta en ley universal.',
    },
    {
      authorId: userMap['Kant']?.id,
      title: 'La razón pura',
      content:
        'El espacio y el tiempo no son propiedades del mundo en sí, sino formas de nuestra intuición sensible.',
    },
    {
      authorId: userMap['Nietzsche']?.id,
      title: 'La voluntad de poder',
      content:
        'Todo lo viviente lucha por poder. La vida misma es la expresión de la voluntad de poder en todas sus formas.',
    },
    {
      authorId: userMap['Nietzsche']?.id,
      title: 'El superhombre',
      content:
        'La humanidad es un puente. Debemos trascendernos a nosotros mismos hacia algo superior: el Übermensch.',
    },
  ]

  for (const post of posts) {
    if (!post.authorId) continue

    const existe = await prisma.post.findFirst({
      where: {
        title: post.title,
        authorId: post.authorId,
      },
    })

    if (existe) {
      console.log(`✓ Post ya existe: "${post.title.substring(0, 30)}..."`)
      continue
    }

    await prisma.post.create({
      data: {
        title: post.title,
        content: post.content,
        authorId: post.authorId,
      },
    })
    console.log(`✓ Post creado: "${post.title.substring(0, 30)}..."`)
  }

  // Crear relaciones de follow (algunos usuarios siguen a otros)
  // Solo agregar si no existen ya
  const createFollowIfNotExists = async (followerId, targetId) => {
    if (!followerId || !targetId || followerId === targetId) return
    const existe = await prisma.user.findFirst({
      where: {
        id: followerId,
        following: {
          some: { id: targetId },
        },
      },
    })
    
    if (!existe) {
      await prisma.user.update({
        where: { id: followerId },
        data: {
          following: {
            connect: { id: targetId },
          },
        },
      })
    }
  }

  if (userMap['Paul'] && userMap['Platon']) await createFollowIfNotExists(userMap['Paul'].id, userMap['Platon'].id)
  if (userMap['Platon'] && userMap['Aristoteles']) await createFollowIfNotExists(userMap['Platon'].id, userMap['Aristoteles'].id)
  if (userMap['Platon'] && userMap['Descartes']) await createFollowIfNotExists(userMap['Platon'].id, userMap['Descartes'].id)
  if (userMap['Aristoteles'] && userMap['Platon']) await createFollowIfNotExists(userMap['Aristoteles'].id, userMap['Platon'].id)
  if (userMap['Aristoteles'] && userMap['Kant']) await createFollowIfNotExists(userMap['Aristoteles'].id, userMap['Kant'].id)
  if (userMap['Descartes'] && userMap['Kant']) await createFollowIfNotExists(userMap['Descartes'].id, userMap['Kant'].id)
  if (userMap['Descartes'] && userMap['Nietzsche']) await createFollowIfNotExists(userMap['Descartes'].id, userMap['Nietzsche'].id)

  // Kant sigue a todos
  if (userMap['Kant']) {
    for (const usuario of usuariosCreados) {
      if (usuario.id !== userMap['Kant'].id) {
        await createFollowIfNotExists(userMap['Kant'].id, usuario.id)
      }
    }
  }

  console.log(`✓ Relaciones de seguimiento procesadas`)

  // Agregar algunos likes aleatorios (solo si no existen ya)
  const allPosts = await prisma.post.findMany({
    include: { likes: true },
  })

  const createLikeIfNotExists = async (postId, userId) => {
    if (!postId || !userId) return
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { likes: { where: { id: userId } } },
    })

    if (!post || post.likes.length === 0) {
      await prisma.post.update({
        where: { id: postId },
        data: {
          likes: {
            connect: { id: userId },
          },
        },
      })
    }
  }

  // Platon da like a posts de Aristoteles
  if (userMap['Aristoteles'] && userMap['Platon']) {
    const postsAristoteles = allPosts.filter((p) => p.authorId === userMap['Aristoteles'].id)
    for (const post of postsAristoteles.slice(0, 1)) {
      await createLikeIfNotExists(post.id, userMap['Platon'].id)
    }
  }

  // Descartes da like a posts de Kant
  if (userMap['Kant'] && userMap['Descartes']) {
    const postsKant = allPosts.filter((p) => p.authorId === userMap['Kant'].id)
    for (const post of postsKant.slice(0, 1)) {
      await createLikeIfNotExists(post.id, userMap['Descartes'].id)
    }
  }

  console.log(`✓ Likes procesados`)

  console.log('\n✨ ¡Seed completado exitosamente!')
  console.log('\n📝 Credenciales de prueba:')
  console.log(`   Usuario: Adriano | Email: adriano@gmail.com | Password: password123 | Rol: ADMIN`)
  console.log(`   Usuario: Paul9 | Email: paul9@gmail.com | Password: password123 | Rol: ADMIN`)
  console.log(`   Usuario: Paul | Email: paul@gmail.com | Password: password123 | Rol: ADMIN`)
  console.log(`   Usuario: Platon | Email: platon@sofocles.com | Password: password123`)
  console.log(`   Usuario: Aristoteles | Email: aristoteles@sofocles.com | Password: password123`)
  console.log(`   Usuario: Descartes | Email: descartes@sofocles.com | Password: password123`)
  console.log(`   Usuario: Kant | Email: kant@sofocles.com | Password: password123`)
  console.log(`   Usuario: Nietzsche | Email: nietzsche@sofocles.com | Password: password123`)
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
