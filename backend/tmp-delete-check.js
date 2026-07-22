const base = 'http://127.0.0.1:5000/api'

async function req(path, options) {
  const res = await fetch(base + path, options)
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, body }
}

async function registerAndLogin(prefix) {
  const email = `${prefix}_${Math.random().toString(36).slice(2,8)}@mail.com`
  const password = 'Test1234!'
  const username = `${prefix}_${Math.random().toString(36).slice(2,8)}`

  await req('/auth/registro', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  })

  const login = await req('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  return { token: login.body.token, email, username }
}

;(async () => {
  const owner = await registerAndLogin('owner')
  const intruder = await registerAndLogin('intruder')

  const created = await req('/posts', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${owner.token}`,
    },
    body: JSON.stringify({ title: 'Post para borrar', content: 'contenido de prueba' }),
  })

  const postId = created.body?.post?.id
  console.log('create', created.status, JSON.stringify(created.body))

  const forbidden = await req(`/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${intruder.token}`,
    },
  })
  console.log('delete-other-user', forbidden.status, JSON.stringify(forbidden.body))

  const deleted = await req(`/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${owner.token}`,
    },
  })
  console.log('delete-owner', deleted.status, JSON.stringify(deleted.body))
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
