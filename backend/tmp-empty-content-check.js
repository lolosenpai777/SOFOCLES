const base = 'http://127.0.0.1:5000/api'

async function request(path, options) {
  const res = await fetch(base + path, options)
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, body }
}

;(async () => {
  const uid = Math.random().toString(36).slice(2,8)
  const email = `zod_${uid}@mail.com`
  const password = 'Test1234!'

  await request('/auth/registro', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: `user${uid}`, email, password })
  })

  const login = await request('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const token = login.body?.token
  const emptyPost = await request('/posts', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title: 'Titulo', content: '   ' })
  })

  console.log('empty-content-test', emptyPost.status, JSON.stringify(emptyPost.body))
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
