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
  const [modoOscuro, setModoOscuro] = useState(() => {
    if (typeof window === "undefined") return false;
    const guardado = localStorage.getItem("sofocles-theme");
    if (guardado) return guardado === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", modoOscuro);
    localStorage.setItem("sofocles-theme", modoOscuro ? "dark" : "light");
  }, [modoOscuro]);



  const miId = usuarioAutenticado?._id || usuarioAutenticado?.id;
  const [busqueda, setBusqueda] = useState("");
  const [usuariosEncontrados, setUsuariosEncontrados] = useState([]);
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoContenido, setNuevoContenido] = useState("");
  const [mencionInput, setMencionInput] = useState("");
  const [usuariosParaMenciones, setUsuariosParaMenciones] = useState([]);
  const [mencionesSeleccionadas, setMencionesSeleccionadas] = useState([]);
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
  const [mencionesComentarioSeleccionadas, setMencionesComentarioSeleccionadas] = useState([]);
  const comentarioInputRef = useRef(null);
  const [cargandoComentario, setCargandoComentario] = useState(false);
  const [comentariosExpandido, setComentariosExpandido] = useState({}); // Para expandir/colapsar sección

  // Estados para Giphy
  const [abrirBuscadorGif, setAbrirBuscadorGif] = useState(false);
  const [gifSeleccionado, setGifSeleccionado] = useState(null);


  const [notificaciones, setNotificaciones] = useState([]);

// Función para obtener las notificaciones. Si el endpoint aún no existe,
// usa un fallback local para dejar la UI lista para conectar luego.
const obtenerNotificaciones = async () => {
  try {
    const respuesta = await clienteAxios
      .get("/notifications")
      .catch(() => clienteAxios.get("/notificaciones"))
      .catch(() => null);

    if (respuesta?.data) {
      const data = Array.isArray(respuesta.data)
        ? respuesta.data
        : respuesta.data.notifications || respuesta.data.notificaciones || [];
      setNotificaciones(data);
      localStorage.setItem("sofocles_notifications", JSON.stringify(data));
      return;
    }
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
  }

  const fallback = JSON.parse(
    localStorage.getItem("sofocles_notifications") || "null",
  );

  if (fallback && Array.isArray(fallback)) {
    setNotificaciones(fallback);
    return;
  }

  setNotificaciones([
    {
      id: "demo-1",
      usuario: "marco",
      mensaje: "te mencionó en una publicación",
      leida: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-2",
      usuario: "claudia",
      mensaje: "respondió a tu idea",
      leida: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);
};

const [postAEditar, setPostAEditar] = useState(null);
const [formularioEdicion, setFormularioEdicion] = useState({
  title: "",
  content: "",
  imagePreview: null,
  imageData: null,
  removeImage: false,
});
const inputEdicionRef = useRef(null);

  // Hashtags
  const [hashtags, setHashtags] = useState([]);
  const [hashtagsCargando, setHashtagsCargando] = useState(true);
  const [hashtagsError, setHashtagsError] = useState("");
  const [mostrarCategoriasHashtags, setMostrarCategoriasHashtags] =
    useState(false);

  const normalizarHashtag = (valor = "") =>
    valor.trim().toLowerCase().replace(/^#/, "");

  const formatearHashtag = (valor = "") => `#${normalizarHashtag(valor)}`;

  const normalizarListaHashtags = (lista = []) =>
    Array.from(
      new Set(lista.map((tag) => normalizarHashtag(tag)).filter(Boolean)),
    );

  const buscarUsuariosParaMenciones = async (texto) => {
    const valor = texto.trim();
    setMencionInput(texto);

    if (!valor) {
      setUsuariosParaMenciones([]);
      return;
    }

    try {
      const respuesta = await clienteAxios.get(
        `/users?search=${encodeURIComponent(valor)}`,
      );
      const data = respuesta.data?.users || respuesta.data || [];
      setUsuariosParaMenciones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error al buscar usuarios para mencionar:", error);
      setUsuariosParaMenciones([]);
    }
  };

  const agregarMencion = (usuario) => {
    const username = usuario.username || usuario.name || "usuario";
    const id = usuario._id || usuario.id;

    const yaSeleccionado = mencionesSeleccionadas.some(
      (mencion) => mencion.id === id || mencion.username === username,
    );

    if (!yaSeleccionado) {
      setMencionesSeleccionadas((prev) => [...prev, { id, username }]);
    }

    setNuevoContenido((prev) => {
      const textoBase = prev.trimEnd();
      const yaIncluida = textoBase.includes(`@${username}`);
      if (yaIncluida) return textoBase;
      const separador = textoBase && !textoBase.endsWith(" ") ? " " : "";
      return `${textoBase}${separador}@${username} `;
    });

    setMencionInput("");
    setUsuariosParaMenciones([]);
  };

  const insertarArrobaComentario = () => {
    const valor = "@";
    setNuevoComentario((prev) => {
      const textoBase = prev.trimEnd();
      const separador = textoBase && !textoBase.endsWith(" ") ? " " : "";
      return `${textoBase}${separador}${valor}`;
    });

    setTimeout(() => {
      comentarioInputRef.current?.focus();
      const longitud = comentarioInputRef.current?.value?.length || 0;
      comentarioInputRef.current?.setSelectionRange(longitud, longitud);
    }, 0);
  };

  const extraerHashtags = (texto = "") =>
    Array.from(
      new Set(
        (texto.match(/#[\p{L}\p{N}_-]+/gu) || []).map((tag) =>
          normalizarHashtag(tag),
        ),
      ),
    );

  const obtenerHashtagsDelPost = (post) => {
    const extraidos = extraerHashtags(
      `${post.title || ""} ${post.content || ""} ${post.contenido || ""}`,
    );
    const existentes = Array.isArray(post.hashtags)
      ? post.hashtags.map((tag) => normalizarHashtag(tag))
      : [];
    return Array.from(new Set([...existentes, ...extraidos]));
  };

  const postCoincideConHashtag = (post, hashtag) => {
    const etiqueta = normalizarHashtag(hashtag);
    if (!etiqueta) return true;
    return obtenerHashtagsDelPost(post).some((tag) => tag === etiqueta);
  };

  const aplicarFiltroLocal = (listaPosts, tipoFiltro) => {
    if (typeof tipoFiltro === "string" && tipoFiltro.startsWith("#")) {
      return listaPosts.filter((post) =>
        postCoincideConHashtag(post, tipoFiltro),
      );
    }
    return listaPosts;
  };

  const actualizarHashtagsDesdePosts = (listaPosts) => {
    const tags = Array.from(
      new Set(listaPosts.flatMap((post) => obtenerHashtagsDelPost(post))),
    );
    setHashtags(tags);
    setHashtagsCargando(false);
    setHashtagsError("");
  };

  // Obtener publicaciones
  const obtenerPosts = async (tipoFiltro = filtroFeed) => {
    try {
      setErrorMsg("");
      setCargandoFeed(true);

      const url =
        tipoFiltro === "seguidos" ? "/posts?filter=following" : "/posts";
      const respuesta = await clienteAxios.get(url);
      const listaPosts = Array.isArray(respuesta.data?.posts)
        ? respuesta.data.posts
        : Array.isArray(respuesta.data)
          ? respuesta.data
          : [];

      const listaFiltrada = aplicarFiltroLocal(listaPosts, tipoFiltro);
      setPosts(listaFiltrada);
      setNextCursor(respuesta.data?.nextCursor ?? null);
      actualizarHashtagsDesdePosts(listaFiltrada);
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
      } else if (texto.startsWith("#")) {
        const etiqueta = texto.trim();
        setFiltroFeed(etiqueta);
        await obtenerPosts(etiqueta);
        setUsuariosEncontrados([]);
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
      const respuesta = await clienteAxios.post(
        `/users/${idUsuarioAAccionar}/follow`,
      );

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
          : prev.filter((id) => id !== idUsuarioAAccionar),
      );
    }
  };

  // Publicar post
  const manejarEnvioPost = async (e) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || !nuevoContenido.trim()) return;

    try {
      const hashtagsDetectados = extraerHashtags(
        `${nuevoTitulo.trim()} ${nuevoContenido.trim()}`,
      );
      const payload = {
        title: nuevoTitulo.trim(),
        content: nuevoContenido.trim(),
      };

      if (nuevaImagen) {
        payload.imageData = nuevaImagen;
      }

      if (mencionesSeleccionadas.length > 0) {
        payload.mentions = mencionesSeleccionadas.map((m) => m.username);
      }

      const respuesta = await clienteAxios.post("/posts", payload);
      const postCreado = respuesta.data.post || respuesta.data;

      setPosts((prevPosts) => [{ ...postCreado }, ...prevPosts]);
      setHashtags((prevHashtags) =>
        normalizarListaHashtags([
          ...prevHashtags,
          ...hashtagsDetectados,
          ...obtenerHashtagsDelPost(postCreado),
        ]),
      );
      setNuevoTitulo("");
      setNuevoContenido("");
      setMencionInput("");
      setUsuariosParaMenciones([]);
      setMencionesSeleccionadas([]);
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

  const cargarMasPosts = async () => {
    if (!nextCursor || cargandoMas) return;
    try {
      setCargandoMas(true);
      const base = filtroFeed === "seguidos" ? "/posts?filter=following" : "/posts?";
      const separador = base.includes("?") && !base.endsWith("?") ? "&" : "";
      const { data } = await clienteAxios.get(`${base}${separador}cursor=${nextCursor}`);
      const nuevos = Array.isArray(data.posts) ? data.posts : [];
      setPosts((prev) => [...prev, ...nuevos]);
      setNextCursor(data.nextCursor ?? null);
    } catch { setErrorMsg("No se pudieron cargar más publicaciones."); }
    finally { setCargandoMas(false); }
  };

  const reportarPost = async (postId) => {
    const reason = window.prompt("¿Por qué quieres reportar esta publicación?", "Contenido inapropiado");
    if (!reason?.trim()) return;
    try {
      await clienteAxios.post("/reports", { postId, reason: reason.trim() });
      window.alert("Gracias. El reporte fue enviado al equipo de moderación.");
    } catch (error) {
      setErrorMsg(error.response?.data?.error || "No se pudo enviar el reporte.");
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

  //hashtag logica
  const obtenerHashtags = async () => {
    try {
      setHashtagsCargando(true);
      const respuesta = await clienteAxios.get("/hashtags");
      setHashtags(
        normalizarListaHashtags(respuesta.data.hashtags || respuesta.data),
      );
    } catch (error) {
      console.error("Error al traer los hashtags:", error);
      setHashtagsError("No se pudieron cargar los hashtags.");
    } finally {
      setHashtagsCargando(false);
    }
  };

  useEffect(() => {
    obtenerHashtags();
  }, []);

  useEffect(() => {
    const modalAbierto = Boolean(
      postDetalle || modalImagenAbierto || abrirBuscadorGif,
    );
    const overflowAnterior = document.body.style.overflow;

    if (modalAbierto) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, [postDetalle, modalImagenAbierto, abrirBuscadorGif]);

  //Hashtags en el filtrofeed haciendo que los hashtags existentes se filtren como carpetas
  const manejarFiltroHashtag = (hashtag) => {
    const etiqueta = formatearHashtag(hashtag);
    setFiltroFeed(etiqueta);
    obtenerPosts(etiqueta);
    setMostrarCategoriasHashtags(false);
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

      if (mencionesComentarioSeleccionadas.length > 0) {
        payload.mentions = mencionesComentarioSeleccionadas.map((m) => m.username);
      }

      const respuesta = await clienteAxios.post(
        `/posts/${postId}/comments`,
        payload,
      );
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
      setMencionesComentarioSeleccionadas([]);
      setGifSeleccionado(null);
    } catch (error) {
      console.error("Error al crear comentario:", error);
      setErrorMsg("No se pudo publicar el comentario.");
    } finally {
      setCargandoComentario(false);
    }
  };

 const abrirModalEditar = (post) => {
  const contenido = post.content || post.contenido || "";
  setPostAEditar(post);
  setFormularioEdicion({
    title: post.title || "",
    content: contenido,
    imagePreview: post.imageUrl || null,
    imageData: null,
    removeImage: false,
  });
};

 const manejarCambioEdicion = (campo, valor) => {
  setFormularioEdicion((prev) => ({ ...prev, [campo]: valor }));
};

 const seleccionarImagenEdicion = (event) => {
  const archivo = event.target.files?.[0];
  if (!archivo) return;

  if (!archivo.type.startsWith("image/")) {
    setErrorMsg("Selecciona una imagen válida para editar la publicación.");
    return;
  }

  const lector = new FileReader();
  lector.onload = () => {
    setFormularioEdicion((prev) => ({
      ...prev,
      imagePreview: lector.result,
      imageData: lector.result,
      removeImage: false,
    }));
    setErrorMsg("");
  };
  lector.readAsDataURL(archivo);
};

 const quitarImagenEdicion = () => {
  setFormularioEdicion((prev) => ({
    ...prev,
    imagePreview: null,
    imageData: null,
    removeImage: true,
  }));
  if (inputEdicionRef.current) inputEdicionRef.current.value = "";
};

 const manejarGuardarEdicion = async (id, datosEdicion) => {
  const payload = {
    title: datosEdicion.title?.trim() || undefined,
    content: datosEdicion.content?.trim() || undefined,
    removeImage: datosEdicion.removeImage || false,
  };

  if (datosEdicion.imageData) {
    payload.imageData = datosEdicion.imageData;
  }

  try {
    const respuesta = await clienteAxios.put(`/posts/${id}`, payload);
    const postActualizado = respuesta.data?.post || respuesta.data || null;

    setPosts((prev) =>
      prev.map((p) => {
        const pId = p._id || p.id;
        if (pId !== id) return p;

        const proximoContenido =
          postActualizado?.content ||
          datosEdicion.content?.trim() ||
          p.content ||
          p.contenido ||
          "";
        const proximaImagen = datosEdicion.removeImage
          ? null
          : postActualizado?.imageUrl || p.imageUrl || null;

        return {
          ...p,
          ...(postActualizado || {}),
          title: postActualizado?.title || datosEdicion.title?.trim() || p.title,
          content: proximoContenido,
          contenido: proximoContenido,
          imageUrl: proximaImagen,
        };
      }),
    );

    setPostAEditar(null);
    setFormularioEdicion({
      title: "",
      content: "",
      imagePreview: null,
      imageData: null,
      removeImage: false,
    });
    setErrorMsg("");
  } catch (error) {
    console.error("Error al editar el post:", error);
    setPosts((prev) =>
      prev.map((p) => {
        const pId = p._id || p.id;
        if (pId !== id) return p;
        const proximoContenido = datosEdicion.content?.trim() || p.content || p.contenido || "";
        return {
          ...p,
          title: datosEdicion.title?.trim() || p.title,
          content: proximoContenido,
          contenido: proximoContenido,
          imageUrl: datosEdicion.removeImage ? null : p.imageUrl || null,
        };
      }),
    );
    setPostAEditar(null);
    setErrorMsg(
      "La edición quedó lista para conectarse con el backend cuando tu compañero active el endpoint.",
    );
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

  const hashtagsDetectados = extraerHashtags(
    `${nuevoTitulo} ${nuevoContenido}`,
  );
  const filtroHashtagActivo = filtroFeed.startsWith("#")
    ? formatearHashtag(filtroFeed)
    : "";

  return (
    <div className={`Olimpo-Contenedor${modoOscuro ? " modo-oscuro" : ""}`}>
      <div className="Aura-Apolo-Cyan" />
      <div className="Aura-Afrodita-Magenta" />
      <div className="Red-Geometrica" />

      <header className="Banner-Olimpo">
        <div>
          <h1 className="Logo-Sofocles">Sófocles</h1>
          {usuarioAutenticado && (
            <p
              className="Texto-Header-Agora mt-2 text-xs uppercase tracking-[0.25em] cursor-pointer hover:text-emerald-300 hover:underline transition-all select-none"
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
        <div className="Controles-Acceso flex items-center gap-2">
          {modoOscuro ? (
            <button
              type="button"
              className="Btn-Secundario"
              onClick={() => setModoOscuro(false)}
              title="Volver al modo claro"
            >
              <img src="/sun-svgrepo-com.svg" alt="Modo claro" className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              className="Btn-Secundario"
              onClick={() => setModoOscuro(true)}
              title="Activar modo oscuro"
            >
              <img src="/cloud-moon-svgrepo-com.svg" alt="Modo oscuro" className="h-4 w-4" />
            </button>
          )}
          <button className="Btn-Secundario" onClick={cerrarSesion}>
            <img
              src="/user-xmark-svgrepo-com.svg"
              alt="Cerrar sesión"
              className="h-4 w-4"
            />
          </button>
        </div>
      </header>

      <main className="Cuerpo-Feed">
        {/* Editor de Post */}
        <section className="Columna-Editor">
          <div className="Card-Formulario-Feed">
            <h2 className="Titulo-Seccion">¿Qué idea ronda tu mente hoy?</h2>

            {errorMsg && (
              <div className="Mensaje-Error-Feed text-xs border p-3 rounded-xl text-center font-medium">
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
                  maxLength={1000}
                  required
                />

                <div className="rounded-2xl border border-emerald-700/10 bg-white/80 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Mencionar usuario..."
                      className="Input-Olimpo-Feed mb-0"
                      value={mencionInput}
                      onChange={(e) => buscarUsuariosParaMenciones(e.target.value)}
                    />
                    <button
                      type="button"
                      className="Btn-Secundario"
                      onClick={() => {
                        setMencionInput("");
                        setUsuariosParaMenciones([]);
                      }}
                    >
                      Limpiar
                    </button>
                  </div>

                  {usuariosParaMenciones.length > 0 && (
                    <div className="mt-2 rounded-xl border border-emerald-700/10 bg-stone-50 p-2">
                      {usuariosParaMenciones.map((usuario) => {
                        const uId = usuario._id || usuario.id;
                        return (
                          <button
                            key={uId}
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-stone-700 transition hover:bg-emerald-50"
                            onClick={() => agregarMencion(usuario)}
                          >
                            <span>@{usuario.username || usuario.name || "usuario"}</span>
                            <span className="text-[11px] uppercase tracking-[0.2em] text-stone-400">
                              Etiquetar
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {mencionesSeleccionadas.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {mencionesSeleccionadas.map((mencion) => (
                        <span
                          key={mencion.id || mencion.username}
                          className="rounded-full border border-emerald-700/20 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                        >
                          @{mencion.username}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {hashtagsDetectados.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {hashtagsDetectados.map((hashtag) => (
                      <span
                        key={hashtag}
                        className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-100/60 border border-emerald-500/20 rounded-lg"
                      >
                        #{hashtag}
                      </span>
                    ))}
                  </div>
                )}

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
                  {1000 - nuevoContenido.length} caracteres restantes
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
          <div className="flex items-start gap-2 mb-4 border-b border-emerald-700/10 pb-2">
            <button
              type="button"
              className={`Filtro-Feed-Boton px-3 py-1 text-xs font-bold rounded-lg transition-all border ${
                filtroFeed === "todos"
                  ? "Activo bg-emerald-700 text-white border-emerald-700"
                  : "text-stone-600 hover:bg-emerald-50 border-transparent"
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
              className={`Filtro-Feed-Boton px-3 py-1 text-xs font-bold rounded-lg transition-all border ${
                filtroFeed === "seguidos"
                  ? "Activo bg-emerald-700 text-white border-emerald-700"
                  : "text-stone-600 hover:bg-emerald-50 border-transparent"
              }`}
              onClick={() => {
                setFiltroFeed("seguidos");
                obtenerPosts("seguidos");
              }}
            >
              Siguiendo
            </button>

            <button
              type="button"
              className={`Filtro-Feed-Boton Btn-Filtro-Feed Btn-Filtro-Notificaciones px-3 py-1 text-xs font-bold rounded-lg transition-all border flex items-center gap-1.5 ${
                filtroFeed === "Notificaciones"
                  ? "Activo bg-emerald-700 text-white border-emerald-700"
                  : "text-stone-600 hover:bg-emerald-50 border-transparent"
              }`}
              onClick={() => {
                setFiltroFeed("Notificaciones");
                obtenerNotificaciones(); // 👈 Llamas a tu función/endpoint de notificaciones, NO a obtenerPosts
              }}
            >
              <img
                src="/bell-svgrepo-com.svg"
                alt=""
                className="h-4 w-4 Btn-Filtro-Icono"
                aria-hidden="true"
              />
              <span>Notificaciones</span>
            </button>

            <div className="ml-auto relative">
              <button
                type="button"
                className={`Filtro-Feed-Boton Hashtag-Trigger px-3 py-1 text-xs font-bold rounded-lg transition-all border ${
                  filtroFeed.startsWith("#")
                    ? "Activo bg-emerald-700 text-white border-emerald-700"
                    : "text-stone-600 hover:bg-emerald-50 border-transparent"
                }`}
                onClick={() => setMostrarCategoriasHashtags((prev) => !prev)}
              >
                Hashtags {mostrarCategoriasHashtags ? "▴" : "▾"}
              </button>

              {mostrarCategoriasHashtags && (
                <div className="Hashtag-Menu absolute right-0 mt-2 w-72 rounded-2xl border border-emerald-700/10 shadow-xl backdrop-blur-sm z-20 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-700/10">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
                      Categorías
                    </span>
                    {hashtagsCargando ? (
                      <span className="text-[11px] text-stone-500">
                        Cargando...
                      </span>
                    ) : null}
                  </div>

                  <div className="max-h-64 overflow-y-auto p-2">
                    {hashtagsError ? (
                      <p className="px-2 py-3 text-sm text-red-500">
                        {hashtagsError}
                      </p>
                    ) : hashtags.length > 0 ? (
                      hashtags.map((tag) => {
                        const etiqueta = formatearHashtag(tag);
                        const activo = filtroHashtagActivo === etiqueta;

                        return (
                          <button
                            key={tag}
                            type="button"
                            className={`Hashtag-Opcion w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm font-semibold transition-all ${
                              activo
                                ? "bg-emerald-700 text-white"
                                : "text-stone-700 hover:bg-emerald-50"
                            }`}
                            onClick={() => manejarFiltroHashtag(tag)}
                          >
                            <span>{etiqueta}</span>
                            <span className="text-xs opacity-70">
                              Ver publicaciones
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <p className="px-2 py-3 text-sm text-stone-500">
                        Todavía no hay categorías disponibles.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Buscador */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar publicaciones, @Usuarios y hashtags..."
              className="Input-Olimpo-Feed"
              value={busqueda}
              onChange={(e) => buscar(e.target.value)}
            />
          </div>

          {filtroFeed.startsWith("#") && (
            <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-800">
              Mostrando publicaciones con{" "}
              <span className="font-semibold">{filtroHashtagActivo}</span>
            </div>
          )}

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

          {/* Renderizado del Feed o Notificaciones */}
{cargandoFeed ? (
  <div className="Cargando-Contenedor">
    <span className="Texto-Cargando">Invocando el feed...</span>
  </div>
) : filtroFeed === "Notificaciones" ? (
  <div className="Lista-Notificaciones space-y-3">
    {notificaciones.length === 0 ? (
      <div className="Cargando-Contenedor">
        <p className="text-stone-500 font-light italic">
          No hay susurros en el Olimpo por ahora.
        </p>
      </div>
    ) : (
      notificaciones.map((n) => (
        <div
          key={n.id || n._id}
          className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${
            n.leida
              ? "bg-stone-900/40 border-stone-800/60 opacity-75"
              : "bg-emerald-950/20 border-emerald-500/30"
          }`}
        >
          <div className="p-2 rounded-full bg-stone-800 text-emerald-400 shrink-0">
            🔔
          </div>
          <div className="flex-1 text-xs">
            <p className="text-stone-200">
              <strong className="font-semibold text-white">
                @{n.usuario || n.sender?.username || "Usuario"}
              </strong>{" "}
              {n.mensaje || n.content}
            </p>
            <span className="text-[10px] text-stone-500 block mt-1">
              {n.createdAt
                ? new Date(n.createdAt).toLocaleDateString()
                : "Hace instantes"}
            </span>
          </div>
        </div>
      ))
    )}
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

              {usuarioAutenticado && autorId !== miId && (
                <button
                  type="button"
                  className="Btn-Accion-Post ml-auto"
                  onClick={() => reportarPost(pId)}
                  title="Reportar publicación"
                  aria-label="Reportar publicación"
                >
                  ⚑
                </button>
              )}

              {/* Acciones de Autor (Editar y Eliminar) */}
              {usuarioAutenticado && autorId === miId && (
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    className="Btn-Accion-Post"
                    onClick={() => abrirModalEditar(post)}
                    title="Editar publicación"
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
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21H3v-3.5L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="Btn-Accion-Post Eliminar"
                    onClick={() => abrirModalEliminar(pId)}
                    title="Eliminar publicación"
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
                </div>
              )}
            </div>
          </div>
        </article>
      );
    })}
    {nextCursor && <button type="button" className="Btn-Secundario w-full mt-4" onClick={cargarMasPosts} disabled={cargandoMas}>{cargandoMas ? "Cargando…" : "Cargar más"}</button>}
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
            className="Modal-Confirmacion max-w-4xl w-[95vw] max-h-[88vh] overflow-y-hidden"
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

            <div className="Modal-Contenido-Scroll">
              <div className="text-left space-y-3 border-b border-emerald-700/10 pb-4">
                <h4 className="Title-Post-Display text-lg">
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
                  className="w-full flex justify-between items-center font-semibold text-sm mb-3 text-stone-600 hover:text-emerald-700 transition-colors duration-200 group"
                  onClick={() =>
                    setComentariosExpandido((prev) => ({
                      ...prev,
                      [postDetalle._id || postDetalle.id]:
                        !prev[postDetalle._id || postDetalle.id],
                    }))
                  }
                >
                  <span>
                    Comentarios (
                    {
                      (postDetalle.comments || postDetalle.comentarios || [])
                        .length
                    }
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
                        className="comentarios-composer mb-4"
                      >
                        <div className="comentarios-composer__row flex-col items-stretch gap-2 md:flex-row md:items-end">
                          <div className="flex-1">
                            <input
                              ref={comentarioInputRef}
                              type="text"
                              placeholder="Expresa tu opinión..."
                              className="Input-Olimpo-Feed comentarios-composer__input"
                              value={nuevoComentario}
                              onChange={(e) => setNuevoComentario(e.target.value)}
                              maxLength={500}
                              disabled={cargandoComentario}
                            />

                            {mencionesComentarioSeleccionadas.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {mencionesComentarioSeleccionadas.map((mencion) => (
                                  <span
                                    key={mencion.id || mencion.username}
                                    className="rounded-full border border-emerald-700/20 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                  >
                                    @{mencion.username}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
                            <button
                              type="button"
                              className="Btn-Secundario"
                              onClick={insertarArrobaComentario}
                              title="Insertar @ para mencionar"
                            >
                              @
                            </button>
                            <button
                              type="button"
                              className="Btn-Secundario"
                              onClick={() => setAbrirBuscadorGif(true)}
                              title="Añadir GIF"
                              disabled={cargandoComentario}
                            >
                              <img
                                src="/image-square-svgrepo-com.svg"
                                alt="Añadir GIF"
                                className="h-4 w-4 object-contain"
                              />
                            </button>
                            <button
                              type="submit"
                              className="Btn-Primario-Feed comentarios-composer__submit"
                              disabled={
                                cargandoComentario ||
                                (!nuevoComentario.trim() && !gifSeleccionado)
                              }
                            >
                              {cargandoComentario ? "..." : "Enviar"}
                            </button>
                          </div>
                        </div>

                        {/* GIF Seleccionado */}
                        {gifSeleccionado && (
                          <div className="comentarios-composer__gif-preview">
                            <img
                              src={gifSeleccionado.url}
                              alt={gifSeleccionado.title}
                              className="comentarios-composer__gif-image"
                            />
                            <button
                              type="button"
                              className="comentarios-composer__gif-remove"
                              onClick={() => setGifSeleccionado(null)}
                              title="Quitar GIF"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        <span className="comentarios-composer__counter">
                          {500 - nuevoComentario.length} caracteres restantes
                        </span>
                      </form>
                    )}

                    {/* Lista de comentarios */}
                    <div className="comentarios-lista">
                      {(postDetalle.comments || postDetalle.comentarios || [])
                        .length === 0 ? (
                        <p className="comentarios-lista__empty">
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
                                className="comentarios-lista__item"
                              >
                                <div className="comentarios-lista__content">
                                  <div className="flex-1 min-w-0">
                                    <span className="comentarios-lista__author">
                                      @{cAuthorName}
                                    </span>
                                    <p className="comentarios-lista__text">
                                      {c.text || c.texto || c.contenido}
                                    </p>
                                    {c.gifUrl && (
                                      <img
                                        src={c.gifUrl}
                                        alt="GIF en comentario"
                                        className="comentarios-lista__gif"
                                      />
                                    )}
                                    <span className="comentarios-lista__date">
                                      {c.createdAt
                                        ? new Date(
                                            c.createdAt,
                                          ).toLocaleDateString()
                                        : "Hace poco"}
                                    </span>
                                  </div>
                                  {esMinioPost && (
                                    <button
                                      type="button"
                                      className="comentarios-lista__delete"
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

{/* Modal de edición con imagen preparada para conectar luego */}
{postAEditar && (
  <div
    className="Modal-Overlay"
    onMouseDown={() => {
      setPostAEditar(null);
      setFormularioEdicion({
        title: "",
        content: "",
        imagePreview: null,
        imageData: null,
        removeImage: false,
      });
    }}
  >
    <div
      className="Modal-Confirmacion max-w-lg w-full max-h-[85vh] flex flex-col"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <h3 className="Titulo-Modal mb-3">Editar Publicación</h3>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <input
          type="text"
          className="Input-Olimpo-Feed mb-3"
          value={formularioEdicion.title}
          onChange={(e) => manejarCambioEdicion("title", e.target.value)}
          placeholder="Título"
          maxLength={50}
        />

        <textarea
          className="Textarea-Olimpo w-full min-h-[120px] max-h-[280px] p-3 rounded-xl text-sm focus:outline-none focus:border-emerald-600 resize-y mb-3 transition-all"
          value={formularioEdicion.content}
          onChange={(e) => manejarCambioEdicion("content", e.target.value)}
          rows={Math.max(4, (formularioEdicion.content.match(/\n/g) || []).length + 3)}
          placeholder="Escribe el nuevo contenido de la publicación"
        />

        <input
          ref={inputEdicionRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={seleccionarImagenEdicion}
        />

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            type="button"
            className="Btn-Secundario"
            onClick={() => inputEdicionRef.current?.click()}
          >
            {formularioEdicion.imagePreview ? "Cambiar imagen" : "Agregar imagen"}
          </button>
          {formularioEdicion.imagePreview && (
            <button
              type="button"
              className="Btn-Secundario"
              onClick={quitarImagenEdicion}
            >
              Quitar imagen
            </button>
          )}
        </div>

        {formularioEdicion.imagePreview && (
          <img
            src={formularioEdicion.imagePreview}
            alt="Vista previa de la publicación"
            className="Imagen-Preview-Editor mb-3"
          />
        )}
      </div>

      <div className="flex justify-end gap-2 shrink-0 pt-2 border-t border-stone-200 mt-3">
        <button
          type="button"
          className="Btn-Secundario"
          onClick={() => {
            setPostAEditar(null);
            setFormularioEdicion({
              title: "",
              content: "",
              imagePreview: null,
              imageData: null,
              removeImage: false,
            });
          }}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="Btn-Primario-Feed"
          onClick={() => manejarGuardarEdicion(postAEditar._id || postAEditar.id, formularioEdicion)}
        >
          Guardar Cambios
        </button>
      </div>
    </div>
  </div>
)}

      <footer className="Footer-Olimpo mt-12 mb-16 md:mb-0">
        <h3>Un nuevo orden social</h3>
        <p>
          Discutiendo el mañana bajo una nueva arquitectura. Mantén la templanza
          en el código.
        </p>
      </footer>

      {/* Barra de Navegación Inferior Móvil */}
<nav className="Nav-Inferior-Olimpo">
  <button
    type="button"
    onClick={() => {
      setFiltroFeed("todos");
      obtenerPosts("todos");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }}
    className={`Btn-Nav-Item ${filtroFeed === "todos" ? "Activo" : ""}`}
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6" />
    </svg>
    <span>Feed</span>
  </button>

  <button
    type="button"
    onClick={() => {
      setFiltroFeed("seguidos");
      obtenerPosts("seguidos");
    }}
    className={`Btn-Nav-Item ${filtroFeed === "seguidos" ? "Activo" : ""}`}
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
    <span>Siguiendo</span>
  </button>

  <button
    type="button"
    onClick={() => {
      setFiltroFeed("Notificaciones");
      obtenerNotificaciones();
    }}
    className={`Btn-Nav-Item relative ${filtroFeed === "Notificaciones" ? "Activo" : ""}`}
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    <span>Avisos</span>
    {notificaciones.filter((n) => !n.leida).length > 0 && (
      <span className="Insignia-Notificacion" />
    )}
  </button>
</nav>
    </div>
  );
}

export default FeedScreen;
