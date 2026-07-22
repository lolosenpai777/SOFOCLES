
import { useState, useEffect } from "react";
import clienteAxios from "../api/clienteAxios";
import "./PerfilModal.css";

function PerfilModal({ usuario, miId, siguiendo, manejarSeguir, cerrarModal }) {
  const [perfilData, setPerfilData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [guardando, setGuardando] = useState(false);

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

  if (!usuario) return null;

  const iniciales = (usuario.username || "?").slice(0, 2).toUpperCase();
  const loSigo = siguiendo.includes(usuario.id);

  return (
    <div
      className="Modal-Overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perfil-modal-titulo"
      onMouseDown={cerrarModal}
    >
      <section
        className="Modal-Confirmacion max-h-[80vh] overflow-y-auto"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="flex items-start justify-between gap-4 sticky top-0 bg-white/95 pb-4">
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

        {cargando ? (
          <div className="text-center py-8">
            <p className="text-stone-600">Cargando perfil...</p>
          </div>
        ) : perfilData ? (
          <>
            {/* Información básica */}
            <h2 id="perfil-modal-titulo" className="Titulo-Modal mt-4">
              {usuario.username}
            </h2>

            {/* Biografía */}
            {editando && esMiPerfil ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    Biografía
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={160}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Cuéntanos sobre ti..."
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    {160 - bio.length} caracteres restantes
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    URL del Avatar
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="Btn-Primario-Feed"
                    onClick={guardarCambios}
                    disabled={guardando}
                  >
                    {guardando ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    type="button"
                    className="Btn-Secundario"
                    onClick={() => setEditando(false)}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {perfilData.biography && (
                  <p className="Texto-Modal mt-2">{perfilData.biography}</p>
                )}

                {/* Estadísticas */}
                <div className="grid grid-cols-3 gap-3 mt-6 p-3 bg-emerald-50/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-700">
                      {perfilData.postsCount || 0}
                    </p>
                    <p className="text-xs text-stone-600">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-700">
                      {perfilData.followersCount || 0}
                    </p>
                    <p className="text-xs text-stone-600">Seguidores</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-700">
                      {perfilData.followingCount || 0}
                    </p>
                    <p className="text-xs text-stone-600">Siguiendo</p>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2 mt-4">
                  {!esMiPerfil && usuario.id && (
                    <button
                      type="button"
                      className={`Btn-Secundario flex-1 ${
                        loSigo ? "Siguiendo" : ""
                      }`}
                      onClick={() => manejarSeguir(usuario.id)}
                    >
                      {loSigo ? "Siguiendo" : "+ Seguir"}
                    </button>
                  )}

                  {esMiPerfil && (
                    <button
                      type="button"
                      className="Btn-Primario-Feed flex-1"
                      onClick={() => setEditando(true)}
                    >
                      Editar Perfil
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Posts del usuario */}
            {perfilData.posts && perfilData.posts.length > 0 && (
              <div className="mt-6 pt-6 border-t border-emerald-200">
                <h3 className="font-bold text-stone-700 mb-3">
                  Posts de {usuario.username}
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {perfilData.posts.map((post) => (
                    <div
                      key={post.id}
                      className="p-3 bg-stone-50 rounded-lg border border-emerald-100"
                    >
                      <p className="font-semibold text-sm text-stone-800">
                        {post.title}
                      </p>
                      {post.content && (
                        <p className="text-xs text-stone-600 mt-1">
                          {post.content.length > 100
                            ? `${post.content.substring(0, 100)}...`
                            : post.content}
                        </p>
                      )}
                      <p className="text-xs text-stone-500 mt-2">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-stone-600 mt-4">No se pudieron cargar los datos.</p>
        )}
      </section>
    </div>
  );
}

export default PerfilModal;
