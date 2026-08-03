// Correr esto SIEMPRE después de editar cualquier credencial OAuth en backend/.env, antes de docker compose up --force-recreate backend.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.resolve(directory, '../.env')
const targetPath = path.resolve(directory, '../.env.docker-oauth')
const synchronizedKeys = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_CALLBACK_URL',
  'OAUTH_SESSION_KEY',
  'RESEND_API_KEY',
]
const synchronizedKeySet = new Set(synchronizedKeys)

function parseKeyValue(line) {
  const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  return match ? { key: match[1], value: match[2] } : null
}

function readSourceValues() {
  const values = new Map()
  const lines = fs.readFileSync(sourcePath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const entry = parseKeyValue(line)
    if (!entry || !synchronizedKeySet.has(entry.key)) continue
    if (values.has(entry.key)) throw new Error(`Variable duplicada en backend/.env: ${entry.key}`)
    values.set(entry.key, entry.value)
  }

  const missing = synchronizedKeys.filter((key) => !values.has(key))
  if (missing.length > 0) {
    throw new Error(`Faltan variables OAuth en backend/.env: ${missing.join(', ')}`)
  }

  return values
}

function synchronize(values) {
  const original = fs.readFileSync(targetPath, 'utf8')
  const newline = original.includes('\r\n') ? '\r\n' : '\n'
  const hadTrailingNewline = original.endsWith('\n')
  const lines = original.split(/\r?\n/)
  if (hadTrailingNewline) lines.pop()

  const output = []
  const written = new Set()

  for (const line of lines) {
    const entry = parseKeyValue(line)
    if (!entry || !synchronizedKeySet.has(entry.key)) {
      output.push(line)
      continue
    }

    if (written.has(entry.key)) continue
    output.push(`${entry.key}=${values.get(entry.key)}`)
    written.add(entry.key)
  }

  for (const key of synchronizedKeys) {
    if (!written.has(key)) output.push(`${key}=${values.get(key)}`)
  }

  const next = output.join(newline) + (hadTrailingNewline ? newline : '')
  if (next === original) {
    console.log('backend/.env.docker-oauth ya está sincronizado.')
    return
  }

  fs.writeFileSync(targetPath, next, 'utf8')
  console.log('backend/.env.docker-oauth actualizado; secretos omitidos del log.')
}

synchronize(readSourceValues())
