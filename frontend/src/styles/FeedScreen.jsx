import { useState, useEffect } from "react";
import clienteAxios from "../api/clienteAxios";
import "./FeedScreen.css";

function FeedScreen({ usuarioAutenticado, cerrarSesion }) {
  // Revisa si el usuario autenticado trae su lista de seguidos
  const initialFollowing = (() => {
    const f = usuarioAutenticado?.following || usuarioAutenticado?.siguiendo || []
    if (!f) return []
    // If backend returns array of objects, map to ids
    if (f.length > 0 && typeof f[0] === 'object') return f.map((u) => u.id || u._id)
    return f
  })()

  const [siguiendo, setSiguiendo] = useState(initialFollowing)

  // Obtenemos tu ID una sola vez
  const miId = usuarioAutenticado?._id || usuarioAutenticado?.id;
  const [busqueda, setBusqueda] = useState("");
  const [usuariosEncontrados, setUsuariosEncontrados] = useState([]);
  const [posts, setPosts] = useState([]);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoContenido, setNuevoContenido] = useState("");
  const [cargandoFeed, setCargandoFeed] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [postAEliminar, setPostAEliminar] = useState(null);
  const [filtroFeed, setFiltroFeed] = useState("todos"); // 'todos' o 'seguidos'

  // Obtener las publicaciones
  const obtenerPosts = async (tipoFiltro = filtroFeed) => {
    try {
      setErrorMsg("");
      setCargandoFeed(true);

      const url = tipoFiltro === "seguidos" ? "/posts?filter=following" : "/posts";

      const respuesta = await clienteAxios.get(url);
      setPosts(respuesta.data.posts || respuesta.data);
    } catch (error) {
      console.error("Error al traer el feed:", error);
      setErrorMsg("No se pudo cargar el conocimiento del Olimpo.");
    } finally {
      setCargandoFeed(false);
    }
  };

  useEffect(() => {
    obtenerPosts();
  }, []);

  // Función de búsqueda
  const buscar = async (texto) => {
    setBusqueda(texto);

    if (!texto.trim()) {
      obtenerPosts();
      setUsuariosEncontrados([]);
      return;
    }

    try {
      if (texto.startsWith("@")) {
        const usuario = texto.slice(1);
        const res = await clienteAxios.get(`/users?search=${usuario}`);
        const data = res.data?.users || res.data
        setUsuariosEncontrados(data);
        setPosts([]);
      } else {
        const res = await clienteAxios.get(`/posts/search?query=${texto}`);
        setPosts(res.data);
        setUsuariosEncontrados([]);
      }
    } catch (error) {
      console.error("Error en la búsqueda:", error);
    }
  };

  const manejarSeguir = async (idUsuarioAAccionar) => {
    if (!miId || idUsuarioAAccionar === miId) return;

    try {
      await clienteAxios.post(`/users/${idUsuarioAAccionar}/follow`);

      setSiguiendo((prev) => {
        const yaLoSigo = prev.includes(idUsuarioAAccionar);
        return yaLoSigo
          ? prev.filter((id) => id !== idUsuarioAAccionar)
          : [...prev, idUsuarioAAccionar];
      });
    } catch (error) {
      console.error("Error al intentar seguir al usuario:", error);
    }
  };

  // Crear una nueva publicación
  const manejarEnvioPost = async (e) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || !nuevoContenido.trim()) return;

    try {
      const respuesta = await clienteAxios.post("/posts", {
        title: nuevoTitulo,
        content: nuevoContenido,
      });

      const postCreado = respuesta.data.post || respuesta.data;
      setPosts([postCreado, ...posts]);

      setNuevoTitulo("");
      setNuevoContenido("");
    } catch (error) {
      console.error("Error al publicar:", error);
      setErrorMsg("Tu pensamiento no pudo ser forjado en la red.");
    }
  };

  const abrirModalEliminar = (postId) => {
    setPostAEliminar(postId);
  };

  const cancelarEliminacion = () => {
    setPostAEliminar(null);
  };

  const eliminarPost = async () => {
    if (!postAEliminar) return;

    try {
      await clienteAxios.delete(`/posts/${postAEliminar}`);
      setPosts((postsActuales) =>
        postsActuales.filter((post) => (post._id || post.id) !== postAEliminar),
      );
      setPostAEliminar(null);
    } catch (error) {
      console.error("Error al eliminar el post:", error);
      setErrorMsg("No se pudo eliminar la publicación.");
    }
  };

  const toggleExpandPost = (postId) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const manejarLikePost = async (postId) => {
    if (!usuarioAutenticado) return;

    try {
      const respuesta = await clienteAxios.post(`/posts/${postId}/like`);
      const postActualizado = respuesta.data.post || respuesta.data;

      setPosts((postsActuales) =>
        postsActuales.map((post) => {
          const idActual = post._id || post.id;
          if (idActual === postId) {
            if (
              postActualizado &&
              (postActualizado.likes || postActualizado.megustas)
            ) {
              return { ...post, ...postActualizado };
            } else {
              const yaTieneLike = post.likes?.includes(miId);
              const nuevosLikes = yaTieneLike
                ? post.likes.filter((id) => id !== miId)
                : [...(post.likes || []), miId];
              return { ...post, likes: nuevosLikes };
            }
          }
          return post;
        }),
      );
    } catch (error) {
      console.error("Error al interactuar con el post:", error);
    }
  };

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
        {/* Editor de Post */}
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
          {/* Filtros de la Línea de Tiempo */}
          <div className="flex gap-2 mb-4 border-b border-emerald-700/10 pb-2">
            <button
              type="button"
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                filtroFeed === "todos"
                  ? "bg-emerald-700 text-white"
                  : "text-stone-600 hover:bg-emerald-50"
              }`}
              onClick={() => {
                setFiltroFeed("todos");
                obtenerPosts("todos");
              }}
            >
              Todos
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                filtroFeed === "seguidos"
                  ? "bg-emerald-700 text-white"
                  : "text-stone-600 hover:bg-emerald-50"
              }`}
              onClick={() => {
                setFiltroFeed("seguidos");
                obtenerPosts("seguidos");
              }}
            >
              Siguiendo
            </button>
          </div>

          {/* Buscador */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar publicaciones o @Usuarios..."
              className="Input-Olimpo-Feed"
              value={busqueda}
              onChange={(e) => buscar(e.target.value)}
            />
          </div>

          {/* Lista de Usuarios Encontrados */}
          {usuariosEncontrados.length > 0 && (
            <div className="Lista-Usuarios mb-4">
              {usuariosEncontrados.map((usuario) => {
                const uId = usuario._id || usuario.id;

                if (uId === miId) return null; // No mostrarte a ti mismo

                const loSigo = siguiendo.includes(uId);

                return (
                  <div
                    key={uId}
                    className="Fila-Usuario flex justify-between items-center p-2"
                  >
                    <span>@{usuario.username}</span>
                    <button
                      type="button"
                      className={`Btn-Secundario ${loSigo ? "Siguiendo" : ""}`}
                      onClick={() => manejarSeguir(uId)}
                    >
                      {loSigo ? "Siguiendo" : "+ Seguir"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Renderizado de Feed / Estados de carga */}
          {cargandoFeed ? (
            <div className="Cargando-Contenedor">
              <span className="Texto-Cargando">Invocando el feed...</span>
            </div>
          ) : posts.length === 0 && usuariosEncontrados.length === 0 ? (
            <div className="Cargando-Contenedor">
              <p className="text-stone-500 font-light italic">
                El ágora está en silencio. Sé el primero en dejar una marca.
              </p>
            </div>
          ) : (
            <div className="Lista-Posts">
              {posts.map((post) => {
                const pId = post._id || post.id;
                const authorName =
                  post.author?.username ||
                  post.usuario?.username ||
                  post.username ||
                  "Filósofo Anónimo";
                const content = post.content || post.contenido || "";
                const isExpanded = expandedPosts[pId];
                const shouldTruncate = content.length > 180;
                const preview = shouldTruncate
                  ? `${content.slice(0, 180).trimEnd()}...`
                  : content;

                const likes = post.likes || post.megustas || [];
                const tieneLike = likes.some((like) => {
                  if (typeof like === "string") return like === miId;
                  return (like._id || like.id) === miId;
                });

                const cantidadLikes = likes.length;

                return (
                  <article key={pId} className="Card-Post Modal-Animacion">
                    <header className="Header-Post">
                      <div className="Avatar-Usuario">
                        {authorName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="Nombre-Usuario">{authorName}</h3>
                        <span className="Fecha-Post">
                          {post.createdAt
                            ? new Date(post.createdAt).toLocaleDateString()
                            : "Hace instantes"}
                        </span>
                      </div>

                      {usuarioAutenticado &&
                        (post.author?._id ||
                          post.author?.id ||
                          post.usuario?._id ||
                          post.usuario?.id) !== miId && (
                          <button
                            type="button"
                            className={`Btn-Secundario ml-auto ${
                              siguiendo.includes(
                                post.author?._id ||
                                  post.author?.id ||
                                  post.usuario?._id ||
                                  post.usuario?.id,
                              )
                                ? "Siguiendo"
                                : ""
                            }`}
                            onClick={() =>
                              manejarSeguir(
                                post.author?._id ||
                                  post.author?.id ||
                                  post.usuario?._id ||
                                  post.usuario?.id,
                              )
                            }
                          >
                            {siguiendo.includes(
                              post.author?._id ||
                                post.author?.id ||
                                post.usuario?._id ||
                                post.usuario?.id,
                            )
                              ? "Siguiendo"
                              : "+ Seguir"}
                          </button>
                        )}
                    </header>

                    <div className="Cuerpo-Post-Contenido">
                      <h4 className="Title-Post-Display">
                        {post.title || "Pensamiento sin título"}
                      </h4>
                      <p className="Contenido-Post">
                        {isExpanded ? content : preview}
                      </p>

                      {shouldTruncate && (
                        <button
                          type="button"
                          className="Btn-VerMas"
                          onClick={() => toggleExpandPost(pId)}
                        >
                          {isExpanded ? "Ver menos" : "Ver más"}
                        </button>
                      )}

                      {usuarioAutenticado &&
                        ((post.author?._id || post.author?.id) === miId ||
                          (post.usuario?._id || post.usuario?.id) === miId) && (
                          <button
                            type="button"
                            className="Btn-Eliminar-Post"
                            onClick={() => abrirModalEliminar(pId)}
                          >
                            🗑️
                          </button>
                        )}

                      <button
                        type="button"
                        className={`Btn-Like-Post ${tieneLike ? "Activo" : ""}`}
                        onClick={() => manejarLikePost(pId)}
                        aria-label="Me gusta"
                      >
                        <svg
                          className="Icono-Like"
                          viewBox="0 0 24 24"
                          fill={tieneLike ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 20s-6.5-4.35-8.2-8.03A4.82 4.82 0 0 1 7.8 4.7c1.47 0 2.76.74 3.5 1.93.74-1.19 2.03-1.93 3.5-1.93a4.82 4.82 0 0 1 3.99 7.97C18.5 15.65 12 20 12 20z" />
                        </svg>

                        <span className="Contador-Likes">{cantidadLikes}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Modal Confirmación Eliminar */}
      {postAEliminar && (
        <div
          className="Modal-Overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-eliminar-titulo"
        >
          <div className="Modal-Confirmacion">
            <h3 id="modal-eliminar-titulo" className="Titulo-Modal">
              Retirar pensamiento del ágora
            </h3>
            <p className="Texto-Modal">
              ¿Estás seguro de que deseas eliminar esta publicación? Esta acción
              no se puede deshacer.
            </p>
            <div className="Acciones-Modal">
              <button
                type="button"
                className="Btn-Modal-Cancelar"
                onClick={cancelarEliminacion}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="Btn-Modal-Confirmar"
                onClick={eliminarPost}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="Footer-Olimpo mt-12">
        <h3>Un nuevo orden social</h3>
        <p>
          Discutiendo el mañana bajo una nueva arquitectura. Mantén la templanza
          en el código.
        </p>
      </footer>
    </div>
  );
}

export default FeedScreen;