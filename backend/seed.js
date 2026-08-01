import bcrypt from 'bcryptjs'
import { prisma } from './src/config/prisma.js'

async function main() {
  console.log('🌱 Iniciando seed de datos...')

  // No borrar datos previos - solo agregar lo que no existe

  // Crear usuarios
  const usuarios = [
    {
      username: 'Paul',
      email: 'paul@gmail.com',
      password: 'paul@gmail.com',
      role: 'ADMIN',
      biography: 'Administrador del ágora',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Paul',
    },
    {
      username: 'Platon',
      email: 'platon@sofocles.com',
      biography: 'El filósofo de las ideas inmutables',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Platon',
    },
    {
      username: 'Aristoteles',
      email: 'aristoteles@sofocles.com',
      biography: 'Lógico y observador de la naturaleza',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aristoteles',
    },
    {
      username: 'Descartes',
      email: 'descartes@sofocles.com',
      biography: 'Dudo, luego existo',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Descartes',
    },
    {
      username: 'Kant',
      email: 'kant@sofocles.com',
      biography: 'Crítica de la razón pura',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kant',
    },
    {
      username: 'Nietzsche',
      email: 'nietzsche@sofocles.com',
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
      if (usuario.password) updateData.passwordHash = await bcrypt.hash(usuario.password, 10)
      if (usuario.biography !== undefined && existe.biography !== usuario.biography) updateData.biography = usuario.biography
      if (usuario.avatarUrl !== undefined && existe.avatarUrl !== usuario.avatarUrl) updateData.avatarUrl = usuario.avatarUrl

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
        passwordHash: passwordHash,
      },
    })
    usuariosCreados.push(created)
    console.log(`✓ Usuario creado: ${usuario.username}`)
  }

  // Posts para cada usuario
  const posts = [
    {
      authorId: usuariosCreados[0].id, // Platon
      title: 'La caverna del conocimiento',
      content:
        'Las sombras en la pared no son la realidad. Debemos ascender hacia la verdadera luz de las ideas eternas.',
    },
    {
      authorId: usuariosCreados[0].id,
      title: 'El mundo de las formas',
      content:
        'Todo lo que vemos es una copia imperfecta de las formas perfectas que existen en el mundo inteligible.',
    },
    {
      authorId: usuariosCreados[1].id, // Aristoteles
      title: 'Estagirita reflexiones',
      content:
        'La virtud es el equilibrio entre dos extremos. La excelencia se logra a través del hábito y la práctica.',
    },
    {
      authorId: usuariosCreados[1].id,
      title: 'Categorías del ser',
      content:
        'Todo lo que existe puede clasificarse en sustancia, cantidad, cualidad y otras nueve categorías más.',
    },
    {
      authorId: usuariosCreados[2].id, // Descartes
      title: 'El método del escepticismo',
      content:
        'He puesto en duda todo lo que puede dudarse. Pero de una cosa estoy seguro: pienso, luego existo.',
    },
    {
      authorId: usuariosCreados[2].id,
      title: 'Mente y cuerpo',
      content:
        'La mente y el cuerpo son dos sustancias distintas que interactúan. ¿Dónde ocurre esta interacción?',
    },
    {
      authorId: usuariosCreados[3].id, // Kant
      title: 'Los imperativos categóricos',
      content:
        'Actúa solo según aquella máxima mediante la que puedas querer, al mismo tiempo, que se convierta en ley universal.',
    },
    {
      authorId: usuariosCreados[3].id,
      title: 'La razón pura',
      content:
        'El espacio y el tiempo no son propiedades del mundo en sí, sino formas de nuestra intuición sensible.',
    },
    {
      authorId: usuariosCreados[4].id, // Nietzsche
      title: 'La voluntad de poder',
      content:
        'Todo lo viviente lucha por poder. La vida misma es la expresión de la voluntad de poder en todas sus formas.',
    },
    {
      authorId: usuariosCreados[4].id,
      title: 'El superhombre',
      content:
        'La humanidad es un puente. Debemos trascendernos a nosotros mismos hacia algo superior: el Übermensch.',
    },
  ]

  for (const post of posts) {
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

  await createFollowIfNotExists(usuariosCreados[0].id, usuariosCreados[1].id)
  await createFollowIfNotExists(usuariosCreados[0].id, usuariosCreados[2].id)
  await createFollowIfNotExists(usuariosCreados[1].id, usuariosCreados[0].id)
  await createFollowIfNotExists(usuariosCreados[1].id, usuariosCreados[3].id)
  await createFollowIfNotExists(usuariosCreados[2].id, usuariosCreados[3].id)
  await createFollowIfNotExists(usuariosCreados[2].id, usuariosCreados[4].id)

  // Kant sigue a todos
  for (const usuario of usuariosCreados) {
    if (usuario.id !== usuariosCreados[3].id) {
      await createFollowIfNotExists(usuariosCreados[3].id, usuario.id)
    }
  }

  console.log(`✓ Relaciones de seguimiento procesadas`)

  // Agregar algunos likes aleatorios (solo si no existen ya)
  const allPosts = await prisma.post.findMany({
    include: { likes: true },
  })

  const createLikeIfNotExists = async (postId, userId) => {
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
  const postsAristoteles = allPosts.filter((p) => p.authorId === usuariosCreados[1].id)
  for (const post of postsAristoteles.slice(0, 1)) {
    await createLikeIfNotExists(post.id, usuariosCreados[0].id)
  }

  // Descartes da like a posts de Kant
  const postsKant = allPosts.filter((p) => p.authorId === usuariosCreados[3].id)
  for (const post of postsKant.slice(0, 1)) {
    await createLikeIfNotExists(post.id, usuariosCreados[2].id)
  }

  console.log(`✓ Likes procesados`)

  console.log('\n✨ ¡Seed completado exitosamente!')
  console.log('\n📝 Credenciales de prueba:')
  console.log(`   Usuario: Paul | Email: paul@gmail.com | Password: paul@gmail.com`)
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
