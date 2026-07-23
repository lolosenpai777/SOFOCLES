import { useState, useEffect } from "react";
import clienteAxios from "../api/clienteAxios";
import AvatarDisplay from "../components/AvatarDisplay";
import "./PerfilModal.css";

function PerfilModal({ usuario, miId, siguiendo, manejarSeguir, cerrarModal }) {
  const [perfilData, setPerfilData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState({});

  const esMiPerfil = usuario?.id === miId;

  // Cargar datos del perfil
  useEffect(() => {
    const cargarPerfil = async () => {
      if (!usuario?.id) return;

      try {
        setCargando(true);
        const respuesta = await clienteAxios.get(`/users/${usuario.id}/profile`);
        setPerfilData(respuesta.data);
        setBio(respuesta.data.biography || "");
        setAvatarUrl(respuesta.data.avatarUrl || "");
      } catch (error) {
        console.error("Error cargando perfil:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarPerfil();
  }, [usuario?.id]);

  const guardarCambios = async () => {
    try {
      setGuardando(true);
      await clienteAxios.put("/users/profile", {
        biography: bio,
        avatarUrl: avatarUrl,
      });

      setPerfilData({
        ...perfilData,
        biography: bio,
        avatarUrl: avatarUrl,
      });

      setEditando(false);
    } catch (error) {
      console.error("Error guardando perfil:", error);
    } finally {
      setGuardando(false);
    }
  };

  const toggleExpandPost = (postId) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  if (!usuario) return null;

  const loSigo = (siguiendo || []).includes(usuario.id);

  return (
    <div
      className="Modal-Overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perfil-modal-titulo"
      onMouseDown={cerrarModal}
    >
      <section
        className="Modal-Confirmacion w-full max-w-lg max-h-[85vh] rounded-3xl bg-stone-50/95 border border-white/80 p-6 shadow-2xl backdrop-blur-xl relative flex flex-col overflow-hidden"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Header del modal con Avatar y Botón de Cerrar alineados */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200/60">
          <div className="flex items-center gap-3">
            <AvatarDisplay
              avatarUrl={perfilData?.avatarUrl}
              username={usuario.username}
              size="lg"
            />
            <div>
              <h2 id="perfil-modal-titulo" className="text-xl font-bold text-stone-800 tracking-tight">
                {usuario.username}
              </h2>
              <p className="text-xs text-stone-500 font-medium">@{usuario.username}</p>
            </div>
          </div>

          <button
            type="button"
            className="Btn-Modal-Cancelar"
            onClick={cerrarModal}
            aria-label="Cerrar perfil"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Contenido con scroll dinámico */}
        <div className="overflow-y-auto pr-1 mt-4 space-y-4">
          {cargando ? (
            <div className="text-center py-8">
              <p className="text-stone-500 text-sm italic">Invocando perfil del filósofo...</p>
            </div>
          ) : perfilData ? (
            <>
              {/* Formulario de Edición */}
              {editando && esMiPerfil ? (
                <div className="space-y-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-900/10">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Biografía
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={160}
                      className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Cuéntanos sobre ti..."
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      {160 - bio.length} caracteres restantes
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      URL del Avatar
                    </label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      className="Btn-Secundario flex-1"
                      onClick={guardarCambios}
                      disabled={guardando}
                    >
                      {guardando ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      type="button"
                      className="Btn-Modal-Cancelar"
                      onClick={() => setEditando(false)}
                      disabled={guardando}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Biografía en vista normal */}
                  {perfilData.biography && (
                    <p className="text-xs text-stone-600 bg-white/60 p-3 rounded-xl border border-stone-200/60 leading-relaxed italic">
                      "{perfilData.biography}"
                    </p>
                  )}

                  {/* Estadísticas */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-900/10 text-center">
                    <div>
                      <p className="text-base font-bold text-emerald-800">
                        {perfilData.postsCount || 0}
                      </p>
                      <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Posts</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-emerald-800">
                        {perfilData.followersCount || 0}
                      </p>
                      <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Seguidores</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-emerald-800">
                        {perfilData.followingCount || 0}
                      </p>
                      <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Siguiendo</p>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    {!esMiPerfil && usuario.id && (
                      <button
                        type="button"
                        className={`w-full py-2 rounded-xl text-xs font-semibold transition-all ${
                          loSigo
                            ? "bg-stone-200 text-stone-600 hover:bg-stone-300"
                            : "bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm shadow-emerald-700/20"
                        }`}
                        onClick={() => manejarSeguir(usuario.id)}
                      >
                        {loSigo ? "SIGUIENDO" : "+ SEGUIR"}
                      </button>
                    )}

                    {esMiPerfil && (
                      <button
                        type="button"
                        className="Btn-Secundario w-full"
                        onClick={() => setEditando(true)}
                      >
                        Editar Perfil
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Lista de Posts del usuario */}
{perfilData.posts && perfilData.posts.length > 0 && (
  <div className="pt-3 border-t border-stone-200/80">
    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-900/70 mb-3">
      Posts de {usuario.username}
    </h3>
    <div className="space-y-3">
      {perfilData.posts.map((post) => {
        const postId = post.id || post._id;
        const contenido = post.content || "";
        const esLargo = contenido.length > 80;
        const estaExpandido = expandedPosts[postId];
        
        const textoMostrar = esLargo && !estaExpandido
          ? `${contenido.substring(0, 80).trimEnd()}...`
          : contenido;

        return (
          <div
            key={postId}
            className="p-3 bg-white/80 rounded-2xl border border-stone-200/80 shadow-sm transition-all"
          >
            <p className="font-bold text-xs text-stone-800">
              {post.title}
            </p>
            
            {contenido && (
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                {textoMostrar}
              </p>
            )}

            {/* Botón Ver más / Ver menos */}
            {esLargo && (
              <button
                type="button"
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 mt-1 cursor-pointer transition-colors"
                onClick={() => toggleExpandPost(postId)}
              >
                {estaExpandido ? "Ver menos" : "Ver más"}
              </button>
            )}

            <p className="text-[10px] text-stone-400 mt-2">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        );
      })}
    </div>
  </div>
)}
            </>
          ) : (
            <p className="text-xs text-stone-500 text-center py-4">
              No se pudieron cargar los datos.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default PerfilModal;
