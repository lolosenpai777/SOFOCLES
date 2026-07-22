const base = 'http://127.0.0.1:5000/api'

async function req(name, path, options) {
  const res = await fetch(base + path, options)
  const txt = await res.text()
  let body
  try { body = JSON.parse(txt) } catch { body = txt }
  console.log(name, res.status, JSON.stringify(body))
  return {res, body}
}

;(async () => {
  await req('login-invalid-email', '/auth/login', {
    method: 'POST',
    headers: {'content-type':'application/json'},
    body: JSON.stringify({ email: 'bad', password: '123456' })
  })

  const uid = Math.random().toString(36).slice(2,8)
  const email = `rt_${uid}@mail.com`
  const password = 'Test1234!'

  await req('register', '/auth/registro', {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({username:'user'+uid, email, password})
  })

  const login = await req('login', '/auth/login', {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({email, password})
  })

  const token = login.body.token
  await req('post-empty-content', '/posts', {
    method: 'POST',
    headers: {'content-type':'application/json', authorization: `Bearer ${token}`},
    body: JSON.stringify({ title: 'Titulo', content: '   ' })
  })

  // force login rate limit
  for (let i=1; i<=6; i++) {
    await req('login-burst-'+i, '/auth/login', {
      method: 'POST', headers: {'content-type':'application/json'},
      body: JSON.stringify({email, password:'wrong123'})
    })
  }
})().catch(err => { console.error(err); process.exit(1) })
