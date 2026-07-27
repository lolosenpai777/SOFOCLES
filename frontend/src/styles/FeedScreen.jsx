import { useState, useEffect, useRef } from "react";
import clienteAxios from "../api/clienteAxios";
import AvatarDisplay from "../components/AvatarDisplay";
import GiphySearch from "../components/GiphySearch";
import "./FeedScreen.css";
import PerfilModal from "./PerfilModal";

function FeedScreen({ usuarioAutenticado, cerrarSesion }) {
  // Inicialización de 'siguiendo'
  const initialFollowing = (() => {
    const f =
      usuarioAutenticado?.following || usuarioAutenticado?.siguiendo || [];
    if (!f) return [];
    if (f.length > 0 && typeof f[0] === "object")
      return f.map((u) => u.id || u._id);
    return f;
  })();

  const [siguiendo, setSiguiendo] = useState(initialFollowing);

  const miId = usuarioAutenticado?._id || usuarioAutenticado?.id;
  const [busqueda, setBusqueda] = useState("");
  const [usuariosEncontrados, setUsuariosEncontrados] = useState([]);
  const [posts, setPosts] = useState([]);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoContenido, setNuevoContenido] = useState("");
  const [nuevaImagen, setNuevaImagen] = useState(null);
  const [modalImagenAbierto, setModalImagenAbierto] = useState(false);
  const [errorImagen, setErrorImagen] = useState("");
  const inputImagenRef = useRef(null);
  const [cargandoFeed, setCargandoFeed] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [postAEliminar, setPostAEliminar] = useState(null);
  const [filtroFeed, setFiltroFeed] = useState("todos"); // 'todos' o 'seguidos'
  const [perfilSeleccionado, setPerfilSeleccionado] = useState(null);

  // Estado para el modal de detalle del post (al hacer clic en comentarios)
  const [postDetalle, setPostDetalle] = useState(null);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [cargandoComentario, setCargandoComentario] = useState(false);
  const [comentariosExpandido, setComentariosExpandido] = useState({}); // Para expandir/colapsar sección

  // Estados para Giphy
  const [abrirBuscadorGif, setAbrirBuscadorGif] = useState(false);
  const [gifSeleccionado, setGifSeleccionado] = useState(null);

  // Obtener publicaciones
  const obtenerPosts = async (tipoFiltro = filtroFeed) => {
    try {
      setErrorMsg("");
      setCargandoFeed(true);

      const url =
        tipoFiltro === "seguidos" ? "/posts?filter=following" : "/posts";
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
        const data = res.data?.users || res.data;
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

  // Seguir / Dejar de seguir
  const manejarSeguir = async (idUsuarioAAccionar) => {
    if (!miId || idUsuarioAAccionar === miId) return;

    // Guardar estado anterior por si falla
    const estabasSiguiendo = siguiendo.includes(idUsuarioAAccionar);

    // Actualizar UI inmediatamente (optimista)
    setSiguiendo((prev) => {
      const yaLoSigo = prev.includes(idUsuarioAAccionar);
      return yaLoSigo
        ? prev.filter((id) => id !== idUsuarioAAccionar)
        : [...prev, idUsuarioAAccionar];
    });

    try {
      const respuesta = await clienteAxios.post(`/users/${idUsuarioAAccionar}/follow`);
      
      // Sincronizar con la respuesta del servidor para garantizar consistencia
      if (respuesta.data.siguiendo) {
        setSiguiendo(respuesta.data.siguiendo);
      } else if (respuesta.data.following) {
        setSiguiendo(respuesta.data.following);
      }
    } catch (error) {
      console.error("Error al intentar seguir al usuario:", error);
      
      // Revertir al estado anterior si hay error
      setSiguiendo((prev) =>
        estabasSiguiendo
          ? [...prev, idUsuarioAAccionar]
          : prev.filter((id) => id !== idUsuarioAAccionar)
      );
    }
  };

  // Publicar post
  const manejarEnvioPost = async (e) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || !nuevoContenido.trim()) return;

    try {
      const payload = {
        title: nuevoTitulo.trim(),
        content: nuevoContenido.trim(),
      };

      if (nuevaImagen) {
        payload.imageData = nuevaImagen;
      }

      const respuesta = await clienteAxios.post("/posts", payload);
      const postCreado = respuesta.data.post || respuesta.data;

      setPosts((prevPosts) => [{ ...postCreado }, ...prevPosts]);
      setNuevoTitulo("");
      setNuevoContenido("");
      setNuevaImagen(null);
    } catch (error) {
      console.error("Error al publicar:", error);
      setErrorMsg("Tu pensamiento no pudo ser forjado en la red.");
    }
  };

  // Procesar archivo de imagen desde el modal
  const seleccionarImagen = (event) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      setErrorImagen("Selecciona un archivo de imagen válido.");
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      setErrorImagen("La imagen no puede superar los 5 MB.");
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      setNuevaImagen(lector.result);
      setErrorImagen("");
      setModalImagenAbierto(false);
    };
    lector.readAsDataURL(archivo);
  };

  // Gestión de eliminación
  const abrirModalEliminar = (postId) => setPostAEliminar(postId);
  const cancelarEliminacion = () => setPostAEliminar(null);

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

  // Expandir/colapsar texto
  const toggleExpandPost = (postId) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Dar/quitar Like
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

      // Si el post abierto en el modal es al que le dimos Like, actualizamos también su estado local
      if (postDetalle && (postDetalle._id || postDetalle.id) === postId) {
        setPostDetalle((prev) => {
          const yaTieneLike = prev.likes?.includes(miId);
          const nuevosLikes = yaTieneLike
            ? prev.likes.filter((id) => id !== miId)
            : [...(prev.likes || []), miId];
          return { ...prev, likes: nuevosLikes };
        });
      }
    } catch (error) {
      console.error("Error al interactuar con el post:", error);
    }
  };

  // Crear comentario
  const manejarEnvioComentario = async (e, postId) => {
    e.preventDefault();
    if (!nuevoComentario.trim() && !gifSeleccionado) return;
    if (!postDetalle) return;

    setCargandoComentario(true);
    try {
      const payload = {
        text: nuevoComentario.trim(),
      };

      if (gifSeleccionado) {
        payload.gifUrl = gifSeleccionado.originalUrl;
      }

      const respuesta = await clienteAxios.post(`/posts/${postId}/comments`, payload);
      const comentarioCreado = respuesta.data.comment;

      // Actualizar postDetalle con el nuevo comentario
      setPostDetalle((prev) => ({
        ...prev,
        comments: [comentarioCreado, ...(prev.comments || [])],
      }));

      // Actualizar el post en el feed también
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          const pId = post._id || post.id;
          if (pId === postId) {
            return {
              ...post,
              comments: [comentarioCreado, ...(post.comments || [])],
            };
          }
          return post;
        }),
      );

      setNuevoComentario("");
      setGifSeleccionado(null);
    } catch (error) {
      console.error("Error al crear comentario:", error);
      setErrorMsg("No se pudo publicar el comentario.");
    } finally {
      setCargandoComentario(false);
    }
  };

  // Eliminar comentario
  const manejarEliminarComentario = async (postId, comentarioId) => {
    try {
      await clienteAxios.delete(`/posts/${postId}/comments/${comentarioId}`);

      // Actualizar postDetalle
      setPostDetalle((prev) => ({
        ...prev,
        comments: (prev.comments || []).filter(
          (c) => (c._id || c.id) !== comentarioId,
        ),
      }));

      // Actualizar el post en el feed también
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          const pId = post._id || post.id;
          if (pId === postId) {
            return {
              ...post,
              comments: (post.comments || []).filter(
                (c) => (c._id || c.id) !== comentarioId,
              ),
            };
          }
          return post;
        }),
      );
    } catch (error) {
      console.error("Error al eliminar comentario:", error);
      setErrorMsg("No se pudo eliminar el comentario.");
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
            <p
              className="mt-2 text-xs uppercase tracking-[0.25em] text-emerald-700/80 cursor-pointer hover:text-emerald-900 hover:underline transition-all select-none"
              onClick={() =>
                setPerfilSeleccionado({
                  id: miId,
                  username: usuarioAutenticado.username,
                })
              }
              title="Ver mi perfil"
            >
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
                  placeholder="Comparte tu filosofía, idea o perspectiva con el nuevo orden..."
                  className="Textarea-Olimpo"
                  value={nuevoContenido}
                  onChange={(e) => setNuevoContenido(e.target.value)}
                  maxLength={280}
                  required
                />

                <button
                  type="button"
                  className="Btn-Secundario mt-2"
                  onClick={() => setModalImagenAbierto(true)}
                >
                  {nuevaImagen ? "Cambiar Imagen" : "Agregar Imagen"}
                </button>

                {nuevaImagen && (
                  <div className="relative mt-3">
                    <img
                      src={nuevaImagen}
                      alt="Vista previa de la publicación"
                      className="Imagen-Preview-Editor"
                    />
                    <button
                      type="button"
                      className="Btn-Quitar-Imagen"
                      onClick={() => {
                        setNuevaImagen(null);
                        if (inputImagenRef.current)
                          inputImagenRef.current.value = "";
                      }}
                      aria-label="Quitar imagen"
                    >
                      ×
                    </button>
                  </div>
                )}
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
          {/* Filtros */}
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

          {/* Usuarios Encontrados */}
          {usuariosEncontrados.length > 0 && (
            <div className="Lista-Usuarios mb-4">
              {usuariosEncontrados.map((usuario) => {
                const uId = usuario._id || usuario.id;
                if (uId === miId) return null;

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

          {/* Renderizado de Feed */}
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
                const autorId =
                  post.author?._id ||
                  post.author?.id ||
                  post.usuario?._id ||
                  post.usuario?.id;
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

                const comentarios = post.comments || post.comentarios || [];
                const cantidadComentarios = comentarios.length;

                const cantidadLikes = likes.length;
                const loSigo = siguiendo.includes(autorId);

                return (
                  <article key={pId} className="Card-Post Modal-Animacion">
                    <header className="Header-Post">
                      <div className="Acciones-Post flex items-center w-full">
                        <button
                          type="button"
                          className="p-0 border-none bg-transparent cursor-pointer"
                          onClick={() =>
                            setPerfilSeleccionado({
                              id: autorId,
                              username: authorName,
                            })
                          }
                          aria-label={`Ver perfil de ${authorName}`}
                        >
                          <AvatarDisplay
                            avatarUrl={
                              post.author?.avatarUrl || post.usuario?.avatarUrl
                            }
                            username={authorName}
                            size="md"
                          />
                        </button>
                        <div className="ml-3">
                          <h3 className="Nombre-Usuario">{authorName}</h3>
                          <span className="Fecha-Post">
                            {post.createdAt
                              ? new Date(post.createdAt).toLocaleDateString()
                              : "Hace instantes"}
                          </span>
                        </div>

                        {usuarioAutenticado && autorId !== miId && (
                          <button
                            type="button"
                            className={`Btn-Secundario ml-auto ${loSigo ? "Siguiendo" : ""}`}
                            onClick={() => manejarSeguir(autorId)}
                          >
                            {loSigo ? "Siguiendo" : "+ Seguir"}
                          </button>
                        )}
                      </div>
                    </header>

                    <div className="Cuerpo-Post-Contenido">
                      <h4 className="Title-Post-Display">
                        {post.title || "Pensamiento sin título"}
                      </h4>
                      <p className="Contenido-Post">
                        {isExpanded ? content : preview}
                      </p>

                      {post.imageUrl && (
                        <img
                          src={post.imageUrl}
                          alt={`Imagen de la publicación de ${authorName}`}
                          className="Imagen-Post"
                        />
                      )}

                      {shouldTruncate && (
                        <button
                          type="button"
                          className="Btn-VerMas"
                          onClick={() => toggleExpandPost(pId)}
                        >
                          {isExpanded ? "Ver menos" : "Ver más"}
                        </button>
                      )}

                      <div className="flex items-center gap-4 mt-3">
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
                          <span className="Contador-Likes">
                            {cantidadLikes}
                          </span>
                        </button>

                        {/* Botón de Comentarios */}
                        <button
                          type="button"
                          className="Btn-Comentario-Post"
                          onClick={() => setPostDetalle(post)}
                          aria-label="Comentarios"
                          title="Ver publicación y comentarios"
                        >
                          {/* SVG Inline en lugar de <img /> */}
                          <svg
                            className="Icono-Like"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          <span className="Contador-Likes">
                            {cantidadComentarios}
                          </span>
                        </button>
                        {usuarioAutenticado && autorId === miId && (
                          <button
                            type="button"
                            className="Btn-Eliminar-Post ml-auto"
                            onClick={() => abrirModalEliminar(pId)}
                            title="Eliminar publicación"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Modal de Detalle de Publicación / Comentarios */}
      {postDetalle && (
        <div
          className="Modal-Overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-post-titulo"
          onMouseDown={() => setPostDetalle(null)}
        >
          <div
            className="Modal-Confirmacion max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 id="modal-post-titulo" className="Titulo-Modal text-left">
                Publicación de @
                {postDetalle.author?.username ||
                  postDetalle.usuario?.username ||
                  "Anónimo"}
              </h3>
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors duration-200 text-stone-500 hover:text-stone-700"
                onClick={() => setPostDetalle(null)}
                title="Cerrar"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="text-left space-y-3 border-b border-emerald-700/10 pb-4">
              <h4 className="font-bold text-lg text-emerald-950">
                {postDetalle.title || "Pensamiento sin título"}
              </h4>
              <p className="text-stone-700 text-sm whitespace-pre-line">
                {postDetalle.content || postDetalle.contenido}
              </p>
              {postDetalle.imageUrl && (
                <img
                  src={postDetalle.imageUrl}
                  alt="Imagen del post"
                  className="rounded-xl max-h-60 w-full object-cover mt-2"
                />
              )}
            </div>

            {/* Sección de Comentarios */}
            <div className="mt-4 text-left">
              <button
                type="button"
                className="w-full flex justify-between items-center font-semibold text-sm mb-2 text-stone-600 hover:text-emerald-700 transition-colors duration-200 group"
                onClick={() =>
                  setComentariosExpandido((prev) => ({
                    ...prev,
                    [postDetalle._id || postDetalle.id]: !prev[
                      postDetalle._id || postDetalle.id
                    ],
                  }))
                }
              >
                <span>
                  Comentarios (
                  {(postDetalle.comments || postDetalle.comentarios || []).length}
                  )
                </span>
                <svg
                  className={`w-5 h-5 transition-transform duration-300 group-hover:text-emerald-700 ${
                    comentariosExpandido[postDetalle._id || postDetalle.id]
                      ? "rotate-180"
                      : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>

              {comentariosExpandido[postDetalle._id || postDetalle.id] && (
                <>
                  {/* Formulario para nuevo comentario */}
                  {usuarioAutenticado && (
                    <form
                      onSubmit={(e) =>
                        manejarEnvioComentario(
                          e,
                          postDetalle._id || postDetalle.id,
                        )
                      }
                      className="mb-3 pb-3 border-b border-emerald-700/10"
                    >
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Expresa tu opinión..."
                          className="Input-Olimpo-Feed flex-1"
                          value={nuevoComentario}
                          onChange={(e) => setNuevoComentario(e.target.value)}
                          maxLength={500}
                          disabled={cargandoComentario}
                        />
                        <button
                          type="button"
                          className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors duration-200 disabled:opacity-50"
                          onClick={() => setAbrirBuscadorGif(true)}
                          title="Añadir GIF"
                          disabled={cargandoComentario}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.828 14.828a4 4 0 01-5.656 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </button>
                        <button
                          type="submit"
                          className="Btn-Primario-Feed px-3 py-1 text-xs"
                          disabled={
                            cargandoComentario ||
                            (!nuevoComentario.trim() && !gifSeleccionado)
                          }
                        >
                          {cargandoComentario ? "..." : "Enviar"}
                        </button>
                      </div>

                      {/* GIF Seleccionado */}
                      {gifSeleccionado && (
                        <div className="relative mb-2 inline-block">
                          <img
                            src={gifSeleccionado.url}
                            alt={gifSeleccionado.title}
                            className="rounded-lg max-h-32 max-w-full"
                          />
                          <button
                            type="button"
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors"
                            onClick={() => setGifSeleccionado(null)}
                            title="Quitar GIF"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      <span className="text-xs text-stone-400 mt-1 block">
                        {500 - nuevoComentario.length} caracteres restantes
                      </span>
                    </form>
                  )}

                  {/* Lista de comentarios */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(postDetalle.comments || postDetalle.comentarios || []).length === 0 ? (
                      <p className="text-xs text-stone-400 italic">
                        Aún no hay opiniones expresadas sobre esta idea.
                      </p>
                    ) : (
                      (postDetalle.comments || postDetalle.comentarios).map(
                        (c, i) => {
                          const cId = c._id || c.id;
                          const cAuthorId =
                            c.author?.id || c.author?._id || c.authorId;
                          const cAuthorName = c.author?.username || "Usuario";
                          const esMinioPost = cAuthorId === miId;

                          return (
                            <div
                              key={cId || i}
                              className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/60 text-xs"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <span className="font-bold text-emerald-800 block">
                                    @{cAuthorName}
                                  </span>
                                  <p className="text-stone-700 mt-1">
                                    {c.text || c.texto || c.contenido}
                                  </p>
                                  {c.gifUrl && (
                                    <img
                                      src={c.gifUrl}
                                      alt="GIF en comentario"
                                      className="mt-2 rounded max-h-24 max-w-full"
                                    />
                                  )}
                                  <span className="text-xs text-stone-400 block mt-1">
                                    {c.createdAt
                                      ? new Date(c.createdAt).toLocaleDateString()
                                      : "Hace poco"}
                                  </span>
                                </div>
                                {esMinioPost && (
                                  <button
                                    type="button"
                                    className="ml-2 p-1 rounded hover:bg-red-100 transition-colors duration-200 text-stone-400 hover:text-red-600"
                                    onClick={() =>
                                      manejarEliminarComentario(
                                        postDetalle._id || postDetalle.id,
                                        cId,
                                      )
                                    }
                                    title="Eliminar comentario"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3H4v2h16V7h-3z"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        },
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Modal Vista Perfil */}
      {perfilSeleccionado && (
        <PerfilModal
          usuario={perfilSeleccionado}
          miId={miId}
          siguiendo={siguiendo}
          manejarSeguir={manejarSeguir}
          cerrarModal={() => setPerfilSeleccionado(null)}
        />
      )}

      {/* Modal Imagen */}
      {modalImagenAbierto && (
        <div
          className="Modal-Overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="imagen-modal-titulo"
          onMouseDown={() => setModalImagenAbierto(false)}
        >
          <section
            className="Modal-Confirmacion Modal-Imagen"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="imagen-modal-titulo" className="Titulo-Modal">
              Añadir imagen a la publicación
            </h2>
            <p className="Texto-Modal">
              Elige una imagen de tu PC (JPG, PNG, WEBP o GIF; máximo 5 MB).
            </p>
            {errorImagen && <p className="Error-Imagen">{errorImagen}</p>}
            <input
              ref={inputImagenRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={seleccionarImagen}
            />
            <div className="Acciones-Modal">
              <button
                type="button"
                className="Btn-Primario-Feed"
                onClick={() => inputImagenRef.current?.click()}
              >
                Elegir imagen
              </button>
              <button
                type="button"
                className="Btn-Modal-Cancelar"
                onClick={() => setModalImagenAbierto(false)}
              >
                Cancelar
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Modal Búsqueda GIFs */}
      {abrirBuscadorGif && (
        <GiphySearch
          onSelectGif={setGifSeleccionado}
          onClose={() => setAbrirBuscadorGif(false)}
        />
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
