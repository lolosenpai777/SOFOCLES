const base = 'http://127.0.0.1:5000/api'

async function req(path, options) {
  const res = await fetch(base + path, options)
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status: res.status, body }
}

async function registerAndLogin(prefix) {
  const email = `${prefix}_${Math.random().toString(36).slice(2, 8)}@mail.com`
  const password = 'Test1234!'
  const username = `${prefix}_${Math.random().toString(36).slice(2, 8)}`

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

  return { token: login.body.token, userId: login.body.usuario.id }
}

;(async () => {
  const owner = await registerAndLogin('ownerlike')
  const liker = await registerAndLogin('liker')

  const created = await req('/posts', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${owner.token}`,
    },
    body: JSON.stringify({ title: 'Post con likes', content: 'contenido de prueba' }),
  })

  const postId = created.body?.post?.id
  console.log('create', created.status, JSON.stringify(created.body))

  const like1 = await req(`/posts/${postId}/like`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${liker.token}`,
    },
  })
  console.log('like-1', like1.status, JSON.stringify(like1.body))

  const like2 = await req(`/posts/${postId}/like`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${liker.token}`,
    },
  })
  console.log('like-2', like2.status, JSON.stringify(like2.body))
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
