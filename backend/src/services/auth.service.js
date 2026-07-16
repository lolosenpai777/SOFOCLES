import bcrypt from 'bcryptjs'
import { prisma } from '../config/prisma.js'

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function normalizeUsername(username) {
  return String(username ?? '').trim()
}

export async function registerUser({ username, email, password }) {
  const cleanUsername = normalizeUsername(username)
  const cleanEmail = normalizeEmail(email)
  const cleanPassword = String(password ?? '')

  if (!cleanUsername || !cleanEmail || !cleanPassword) {
    const error = new Error('Todos los campos son obligatorios')
    error.statusCode = 400
    throw error
  }

  if (cleanPassword.length < 6) {
    const error = new Error('La contraseña debe tener al menos 6 caracteres')
    error.statusCode = 400
    throw error
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: cleanEmail }, { username: cleanUsername }],
    },
  })

  if (existingUser) {
    const error = new Error('El usuario o correo ya existe')
    error.statusCode = 409
    throw error
  }

  const passwordHash = await bcrypt.hash(cleanPassword, 10)

  const user = await prisma.user.create({
    data: {
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
    },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
    },
  })

  return user
}

export async function authenticateUser({ email, password }) {
  const cleanEmail = normalizeEmail(email)
  const cleanPassword = String(password ?? '')

  if (!cleanEmail || !cleanPassword) {
    const error = new Error('Email y contraseña son obligatorios')
    error.statusCode = 400
    throw error
  }

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
  })

  if (!user) {
    const error = new Error('Credenciales inválidas')
    error.statusCode = 401
    throw error
  }

  const passwordMatches = await bcrypt.compare(cleanPassword, user.passwordHash)

  if (!passwordMatches) {
    const error = new Error('Credenciales inválidas')
    error.statusCode = 401
    throw error
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
  }
}