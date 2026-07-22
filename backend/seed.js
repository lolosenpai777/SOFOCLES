import bcrypt from 'bcryptjs'
import { prisma } from './src/config/prisma.js'

async function main() {
  console.log('🌱 Iniciando seed de datos...')

  // No borrar datos previos - solo agregar lo que no existe

  // Crear usuarios
  const usuarios = [
    {
      username: 'platon',
      email: 'platon@sofocles.com',
      biography: 'El filósofo de las ideas inmutables',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=platon',
    },
    {
      username: 'aristoteles',
      email: 'aristoteles@sofocles.com',
      biography: 'Lógico y observador de la naturaleza',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=aristoteles',
    },
    {
      username: 'descartes',
      email: 'descartes@sofocles.com',
      biography: 'Dudo, luego existo',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=descartes',
    },
    {
      username: 'kant',
      email: 'kant@sofocles.com',
      biography: 'Crítica de la razón pura',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kant',
    },
    {
      username: 'nietzsche',
      email: 'nietzsche@sofocles.com',
      biography: 'Más allá del bien y del mal',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nietzsche',
    },
  ]

  const passwordHash = await bcrypt.hash('password123', 10)

  const usuariosCreados = []

  for (const usuario of usuarios) {
    const existe = await prisma.user.findUnique({
      where: { email: usuario.email },
    })

    if (existe) {
      console.log(`✓ Usuario ya existe: ${usuario.username}`)
      usuariosCreados.push(existe)
      continue
    }

    const created = await prisma.user.create({
      data: {
        username: usuario.username,
        email: usuario.email,
        biography: usuario.biography,
        avatarUrl: usuario.avatarUrl,
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
  usuariosCreados.forEach((u) => {
    console.log(
      `   Usuario: ${u.username} | Email: ${u.email} | Password: password123`,
    )
  })
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
