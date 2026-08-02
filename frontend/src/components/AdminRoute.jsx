import { useEffect } from 'react'

function hasModerationAccess(user) {
  return (
    user?.role === 'ADMIN' ||
    user?.moderationRole === 'ADMIN' ||
    user?.moderationRole === 'JUNIOR'
  )
}

export default function AdminRoute({ user, onRedirectToLogin, onBackToFeed, children }) {
  useEffect(() => {
    if (!user) onRedirectToLogin?.()
  }, [user, onRedirectToLogin])

  if (!user) return null

  if (!hasModerationAccess(user)) {
    return (
      <div className="Olimpo-Contenedor min-h-screen flex items-center justify-center px-4">
        <section className="Modal-Confirmacion w-full max-w-xl p-6 text-center">
          <h1 className="Titulo-Modal">Acceso denegado</h1>
          <p className="Texto-Modal mt-2">
            No tienes permisos para acceder al Panel de Moderación.
          </p>
          <div className="mt-4">
            <button type="button" className="Btn-Modal-Cancelar" onClick={onBackToFeed}>
              Volver al feed
            </button>
          </div>
        </section>
      </div>
    )
  }

  return children
}

