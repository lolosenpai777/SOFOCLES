import { useState, useEffect } from 'react'
import clienteAxios from '../api/clienteAxios'
import './FeedScreen.css'

function FeedScreen({ usuarioAutenticado, cerrarSesion }) {
  const [posts, setPosts] = useState([])
  const [expandedPosts, setExpandedPosts] = useState({})
  // Separamos el estado para manejar título y contenido
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevoContenido, setNuevoContenido] = useState('')
  const [cargandoFeed, setCargandoFeed] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [postAEliminar, setPostAEliminar] = useState(null)

  // Obtener las publicaciones del templo
  const obtenerPosts = async () => {
    try {
      setErrorMsg('')
      const respuesta = await clienteAxios.get('/posts')
      setPosts(respuesta.data.posts || respuesta.data)
    } catch (error) {
      console.error('Error al traer el feed:', error)
      setErrorMsg('No se pudo cargar el conocimiento del Olimpo.')
    } finally {
      setCargandoFeed(false)
    }
  }

  useEffect(() => {
    obtenerPosts()
  }, [])

  // Crear una nueva publicación
  const manejarEnvioPost = async (e) => {
    e.preventDefault()
    if (!nuevoTitulo.trim() || !nuevoContenido.trim()) return

    try {
      // Enviamos el objeto con 'title' y 'content' como lo espera tu backend
      const respuesta = await clienteAxios.post('/posts', {
        title: nuevoTitulo,
        content: nuevoContenido,
      })

      const postCreado = respuesta.data.post || respuesta.data
      setPosts([postCreado, ...posts])

      // Limpiamos ambos campos tras un envío exitoso
      setNuevoTitulo('')
      setNuevoContenido('')
    } catch (error) {
      console.error('Error al publicar:', error)
      setErrorMsg('Tu pensamiento no pudo ser forjado en la red.')
    }
  }

  const abrirModalEliminar = (postId) => {
    setPostAEliminar(postId)
  }

  const cancelarEliminacion = () => {
    setPostAEliminar(null)
  }

  const eliminarPost = async () => {
    if (!postAEliminar) return

    try {
      await clienteAxios.delete(`/posts/${postAEliminar}`)
      setPosts((postsActuales) =>
        postsActuales.filter((post) => (post._id || post.id) !== postAEliminar)
      )
      setPostAEliminar(null)
    } catch (error) {
      console.error('Error al eliminar el post:', error)
      setErrorMsg('No se pudo eliminar la publicación.')
    }
  }

  const toggleExpandPost = (postId) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }))
  }

  return (
    <div className="Olimpo-Contenedor">
      <div className="Aura-Apolo-Cyan" />
      <div className="Aura-Afrodita-Magenta" />
      <div className="Red-Geometrica" />

      <header className="Banner-Olimpo">
        <div>
          <h1 className="Logo-Sofocles">Sófocles</h1>
          {usuarioAutenticado && (
            <p className="mt-2 text-xs uppercase tracking-[0.25em] text-emerald-700/80">
              Ágora de: {usuarioAutenticado.username}
            </p>
          )}
        </div>
        <div className="Controles-Acceso">
          <button className="Btn-Secundario" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="Cuerpo-Feed">
        {/* Editor de Post con Título y Contenido */}
        <section className="Columna-Editor">
          <div className="Card-Formulario-Feed">
            <h2 className="Titulo-Seccion">¿Qué idea ronda tu mente hoy?</h2>
            
            {errorMsg && (
              <div className="text-xs text-emerald-900 bg-emerald-100/60 border border-emerald-500/20 p-3 rounded-xl text-center font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={manejarEnvioPost} className="flex flex-col gap-4">
              <div className="Form-Grupo">
                <input
                  type="text"
                  placeholder="Título de tu tesis o pensamiento..."
                  className="Input-Olimpo-Feed mb-2"
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  maxLength={50}
                  required
                />
                <textarea
                  placeholder="Comparte tu filosofía, código o perspectiva con el nuevo orden..."
                  className="Textarea-Olimpo"
                  value={nuevoContenido}
                  onChange={(e) => setNuevoContenido(e.target.value)}
                  maxLength={280}
                  required
                />
              </div>
              <div className="Fila-Editor-Acciones">
                <span className="Contador-Caracteres">
                  {280 - nuevoContenido.length} caracteres restantes
                </span>
                <button type="submit" className="Btn-Primario-Feed">
                  Publicar Idea
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Línea de Tiempo */}
        <section className="Columna-Publicaciones">
          {cargandoFeed ? (
            <div className="Cargando-Contenedor">
              <span className="Texto-Cargando">Invocando el feed...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="Cargando-Contenedor">
              <p className="text-stone-500 font-light italic">
                El ágora está en silencio. Sé el primero en dejar una marca.
              </p>
            </div>
          ) : (
            <div className="Lista-Posts">
              {posts.map((post) => {
                const authorName =
                  post.author?.username ||
                  post.usuario?.username ||
                  post.username ||
                  'Filósofo Anónimo'
                const content = post.content || post.contenido || ''
                const isExpanded = expandedPosts[post.id]
                const shouldTruncate = content.length > 180
                const preview = shouldTruncate ? `${content.slice(0, 180).trimEnd()}...` : content

                return (
                  <article key={post._id || post.id} className="Card-Post Modal-Animacion">
                    <header className="Header-Post">
                      <div className="Avatar-Usuario">
                        {authorName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="Nombre-Usuario">{authorName}</h3>
                        <span className="Fecha-Post">
                          {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Hace instantes'}
                        </span>
                        
                      </div>
                    </header>

                    {/* Renderizado de Título y Contenido en la tarjeta */}
                    <div className="Cuerpo-Post-Contenido">
                      <h4 className="Title-Post-Display">
                        {post.title || 'Pensamiento sin título'}
                      </h4>
                      <p className="Contenido-Post">
                        {isExpanded ? content : preview}
                      </p>
                      {shouldTruncate && (
                        <button
                          type="button"
                          className="Btn-VerMas"
                          onClick={() => toggleExpandPost(post.id)}
                        >
                          {isExpanded ? 'Ver menos' : 'Ver más'}
                        </button>

                      )}
                      {usuarioAutenticado && (post.author?.id === usuarioAutenticado.id || post.usuario?.id === usuarioAutenticado.id) && (
                        <button
                          type="button"
                          className="Btn-Eliminar-Post"
                          onClick={() => abrirModalEliminar(post._id || post.id)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {postAEliminar && (
        <div className="Modal-Overlay" role="dialog" aria-modal="true" aria-labelledby="modal-eliminar-titulo">
          <div className="Modal-Confirmacion">
            <h3 id="modal-eliminar-titulo" className="Titulo-Modal">
              Retirar pensamiento del ágora
            </h3>
            <p className="Texto-Modal">
              ¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.
            </p>
            <div className="Acciones-Modal">
              <button type="button" className="Btn-Modal-Cancelar" onClick={cancelarEliminacion}>
                Cancelar
              </button>
              <button type="button" className="Btn-Modal-Confirmar" onClick={eliminarPost}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="Footer-Olimpo mt-12">
        <h3>Un nuevo orden social</h3>
        <p>
          Discutiendo el mañana bajo una nueva arquitectura. Mantén la templanza en el código.
        </p>
      </footer>
    </div>
  )
}

export default FeedScreen