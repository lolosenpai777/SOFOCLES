import { useState, useEffect, useRef } from "react";
import clienteAxios from "../api/clienteAxios";
import AvatarDisplay from "../components/AvatarDisplay";
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
                className="Btn-Quitar-Imagen font-bold text-xl cursor-pointer"
                onClick={() => setPostDetalle(null)}
              >
                X
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
              <h5 className="font-semibold text-sm mb-2 text-stone-600">
                Comentarios (
                {(postDetalle.comments || postDetalle.comentarios || []).length}
                )
              </h5>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(postDetalle.comments || postDetalle.comentarios || [])
                  .length === 0 ? (
                  <p className="text-xs text-stone-400 italic">
                    Aún no hay opiniones expresadas sobre esta idea.
                  </p>
                ) : (
                  (postDetalle.comments || postDetalle.comentarios).map(
                    (c, i) => (
                      <div
                        key={c._id || c.id || i}
                        className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/60 text-xs"
                      >
                        <span className="font-bold text-emerald-800 block">
                          @
                          {c.author?.username ||
                            c.usuario?.username ||
                            "Usuario"}
                          :
                        </span>
                        <p className="text-stone-700 mt-1">
                          {c.text || c.texto || c.contenido}
                        </p>
                      </div>
                    ),
                  )
                )}
              </div>
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
