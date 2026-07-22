const base = 'http://127.0.0.1:5000/api'

async function request(name, path, options = {}) {
  const res = await fetch(`${base}${path}`, options)
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  console.log(`[${name}] status=${res.status} body=${JSON.stringify(body)}`)
  return { res, body }
}

;(async () => {
  const uid = Math.random().toString(36).slice(2, 10)
  const email = `segtest_${uid}@mail.com`
  const password = 'Test1234!'

  await request('NoAuth_Post', '/posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'X', content: 'hola' }),
  })

  await request('InvalidToken_Post', '/posts', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer abc.invalid.token',
    },
    body: JSON.stringify({ title: 'X', content: 'hola' }),
  })

  await request('Register', '/auth/registro', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: `seg_${uid}`, email, password }),
  })

  const login = await request('Login', '/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const token = login.body?.token

  if (token) {
    await request('EmptyContent_Post', '/posts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: 'Titulo', content: '   ' }),
    })
  } else {
    console.log('[EmptyContent_Post] skipped; token not available')
  }
})().catch((error) => {
  console.error('Security check script failed:', error)
  process.exit(1)
})
