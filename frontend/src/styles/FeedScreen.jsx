import { useState, useEffect } from 'react'
import clienteAxios from '../api/clienteAxios'
import './FeedScreen.css'

function FeedScreen({ usuarioAutenticado, cerrarSesion }) {
  const [posts, setPosts] = useState([])
  const [nuevoPost, setNuevoPost] = useState('')
  const [cargandoFeed, setCargandoFeed] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Obtener las publicaciones del templo
  const obtenerPosts = async () => {
    try {
      setErrorMsg('')
      const respuesta = await clienteAxios.get('/posts') // Reemplaza por tu ruta real de posts
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
    if (!nuevoPost.trim()) return

    try {
      const respuesta = await clienteAxios.post('/posts', { contenido: nuevoPost }) // Reemplaza por tu esquema real
      
      // Si el backend devuelve el post creado, lo agregamos al inicio
      const postCreado = respuesta.data.post || respuesta.data
      setPosts([postCreado, ...posts])
      setNuevoPost('')
    } catch (error) {
      console.error('Error al publicar:', error)
      setErrorMsg('Tu pensamiento no pudo ser forjado en la red.')
    }
  }

  return (
    <div className="Olimpo-Contenedor">
      {/* Elementos ambientales de diseño claro */}
      <div className="Aura-Apolo-Cyan" />
      <div className="Aura-Afrodita-Magenta" />
      <div className="Red-Geometrica" />

      {/* Header idéntico en diseño */}
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

      {/* Distribución del Feed */}
      <main className="Cuerpo-Feed">
        {/* Sección Izquierda/Superior: Crear Pensamiento */}
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
                <textarea
                  placeholder="Comparte tu filosofía, código o perspectiva con el nuevo orden..."
                  className="Textarea-Olimpo"
                  value={nuevoPost}
                  onChange={(e) => setNuevoPost(e.target.value)}
                  maxLength={280}
                  required
                />
              </div>
              <div className="Fila-Editor-Acciones">
                <span className="Contador-Caracteres">
                  {280 - nuevoPost.length} caracteres restantes
                </span>
                <button type="submit" className="Btn-Primario-Feed">
                  Publicar Idea
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Sección Derecha/Inferior: Línea de Tiempo */}
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
              {posts.map((post) => (
                <article key={post._id || post.id} className="Card-Post Modal-Animacion">
                  <header className="Header-Post">
                    <div className="Avatar-Usuario">
                      {(post.usuario?.username || post.username || 'U').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="Nombre-Usuario">
                        {post.usuario?.username || post.username || 'Filósofo Anónimo'}
                      </h3>
                      <span className="Fecha-Post">
                        {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Hace instantes'}
                      </span>
                    </div>
                  </header>
                  <p className="Contenido-Post">{post.contenido}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer consistente */}
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