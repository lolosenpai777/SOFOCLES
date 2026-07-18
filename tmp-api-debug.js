const url = 'http://127.0.0.1:5000/api';
(async () => {
  try {
    const reg = await fetch(`${url}/auth/registro`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({username: 'Sofocles', email: 'debug@test.com', password: 'secret123'})
    });
    console.log('register status', reg.status);
    const regText = await reg.text();
    console.log(regText);

    const login = await fetch(`${url}/auth/login`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({email: 'debug@test.com', password: 'secret123'})
    });
    console.log('login status', login.status);
    const loginJson = await login.json();
    console.log(loginJson);

    const create = await fetch(`${url}/posts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${loginJson.token}`
      },
      body: JSON.stringify({
        title: 'Bienvenido',
        content: '¡Buenos días! Bienvenido al templo de las ideas, donde tus pensamientos se convierten en palabras.',
      })
    });
    console.log('create status', create.status);
    const createText = await create.text();
    console.log(createText);
  } catch (e) {
    console.error('script error', e);
  }
})();
