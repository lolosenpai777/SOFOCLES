
import "./PerfilModal.css";
function PerfilModal({ usuario, miId, siguiendo, manejarSeguir, cerrarModal }) {
  if (!usuario) return null

  const esMiPerfil = usuario.id === miId
  const loSigo = siguiendo.includes(usuario.id)
  const iniciales = (usuario.username || '?').slice(0, 2).toUpperCase()

  return (
    <div
      className="Modal-Overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perfil-modal-titulo"
      onMouseDown={cerrarModal}
    >
      <section
        className="Modal-Confirmacion"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="Avatar-Usuario">{iniciales}</div>
          <button
            type="button"
            className="Btn-Modal-Cancelar"
            onClick={cerrarModal}
            aria-label="Cerrar perfil"
          >
            Cerrar
          </button>
        </div>

        <h2 id="perfil-modal-titulo" className="Titulo-Modal mt-4">
          {usuario.username}
        </h2>
        <p className="Texto-Modal">Perfil de la comunidad de Sófocles.</p>

        {!esMiPerfil && usuario.id && (
          <button
            type="button"
            className={`Btn-Secundario mt-6 ${loSigo ? 'Siguiendo' : ''}`}
            onClick={() => manejarSeguir(usuario.id)}
          >
            {loSigo ? 'Siguiendo' : '+ Seguir'}
          </button>
        )}
      </section>
    </div>
  )
}

export default PerfilModal
