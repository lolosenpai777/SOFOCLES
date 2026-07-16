export async function meHandler(request) {
  return {
    mensaje: 'Token válido',
    usuario: {
      id: request.user.sub,
      username: request.user.username,
      email: request.user.email,
    },
  }
}