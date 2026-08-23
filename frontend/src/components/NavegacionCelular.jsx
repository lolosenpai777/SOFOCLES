import React from 'react'

export default function NavegacionCelular({ 
  vistaActual, 
  onCambiarVista, 
  onIrPerfil, 
  notificacionesNoLeidas = false,
  currentUser 
}) {
  return (
    <nav className="Nav-Inferior-Olimpo" aria-label="Navegación principal móvil">
      {/* 1. Feed / Inicio */}
      <button
        type="button"
        className={`Btn-Nav-Item ${vistaActual === 'todos' ? 'Activo' : ''}`}
        onClick={() => onCambiarVista?.('todos')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span>Feed</span>
      </button>

      {/* 2. Siguiendo */}
      <button
        type="button"
        className={`Btn-Nav-Item ${vistaActual === 'siguiendo' ? 'Activo' : ''}`}
        onClick={() => onCambiarVista?.('siguiendo')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <span>Siguiendo</span>
      </button>

      {/* 3. Notificaciones */}
      <button
        type="button"
        className={`Btn-Nav-Item relative ${vistaActual === 'notificaciones' ? 'Activo' : ''}`}
        onClick={() => onCambiarVista?.('notificaciones')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span>Alertas</span>
        {notificacionesNoLeidas && <span className="Insignia-Notificacion" />}
      </button>

      {/* 4. Perfil del Usuario */}
      <button
        type="button"
        className={`Btn-Nav-Item ${vistaActual === 'perfil' ? 'Activo' : ''}`}
        onClick={() => {
          if (currentUser?.username) {
            onIrPerfil?.(currentUser.username)
          } else {
            onCambiarVista?.('perfil')
          }
        }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span>Perfil</span>
      </button>
    </nav>
  )
}