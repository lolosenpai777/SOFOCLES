import { useEffect, useState } from 'react'
import clienteAxios from './api/clienteAxios'
import FeedScreen from './styles/FeedScreen.jsx'
import AdminReports from './components/AdminReports.jsx'

function App() {
  const [modalActivo, setModalActivo] = useState(null)

  // Estados para Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Estados para Registro (¡Nuevos!)
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [emailRegistro, setEmailRegistro] = useState('')
  const [passwordRegistro, setPasswordRegistro] = useState('')

  // Estado para mensajes de error y éxito
  const [errorMsg, setErrorMsg] = useState('')
  const [mostrarExito, setMostrarExito] = useState(false)
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [verAdmin, setVerAdmin] = useState(false)
  const query = new URLSearchParams(window.location.search)
  const resetToken = query.get('token')
  const isReset = window.location.pathname.includes('restablecer-contrasena') && resetToken
  const isVerification = window.location.pathname.includes('verificar-correo') && resetToken
  const [newPassword, setNewPassword] = useState('')
  const [authNotice, setAuthNotice] = useState('')

  useEffect(() => {
    if (!isVerification) return
    clienteAxios.post('/auth/verificar-correo', { token: resetToken })
      .then(() => setAuthNotice('Correo verificado. Ya puedes iniciar sesión.'))
      .catch(() => setAuthNotice('El enlace de verificación no es válido o expiró.'))
  }, [isVerification, resetToken])

  useEffect(() => {
    const tokenGuardado = localStorage.getItem('sofocles_token')

    if (!tokenGuardado) {
      setCargandoSesion(false)
      return
    }

    const cargarSesion = async () => {
      try {
        const respuesta = await clienteAxios.get('/auth/me')
        setUsuarioAutenticado(respuesta.data.usuario)
      } catch {
        localStorage.removeItem('sofocles_token')
      } finally {
        setCargandoSesion(false)
      }
    }

    cargarSesion()
  }, [])

  // Función de Login
  const login = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    try {
      const respuesta = await clienteAxios.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem('sofocles_token', respuesta.data.token)
      setUsuarioAutenticado(respuesta.data.usuario)
      setModalActivo(null)
    } catch (error) {
      console.error('Error al conectar con el templo:', error)
      setErrorMsg(
        error.response?.data?.mensaje || 'Error de conexión con el servidor',
      )
    }
  }

  // Función de Registro (¡Nueva!)
  const registro = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    try {
      const respuesta = await clienteAxios.post("/auth/registro", {
        username: nombreUsuario,
        email: emailRegistro,
        password: passwordRegistro,
      });

      // Limpiamos los campos del registro
      setNombreUsuario('')
      setEmailRegistro('')
      setPasswordRegistro('')

      // Cerramos el modal de registro y abrimos la ventana de éxito
      setModalActivo(null)
      setMostrarExito(true)
    } catch (error) {
      console.error('Error al registrar en el templo:', error)
      setErrorMsg(error.response?.data?.mensaje || 'Error al crear la cuenta')
    }
  }

  const cerrarSesion = () => {
    localStorage.removeItem('sofocles_token')
    setUsuarioAutenticado(null)
  }

  const solicitarRecuperacion = async () => {
    const recoveryEmail = window.prompt('Escribe tu correo para recibir el enlace de recuperación:')
    if (!recoveryEmail) return
    try { await clienteAxios.post('/auth/recuperar-contrasena', { email: recoveryEmail }); setErrorMsg('Revisa tu correo si la cuenta existe.') }
    catch { setErrorMsg('No se pudo solicitar la recuperación.') }
  }

  const restablecerContrasena = async (event) => {
    event.preventDefault()
    try { await clienteAxios.post('/auth/restablecer-contrasena', { token: resetToken, password: newPassword }); setAuthNotice('Contraseña actualizada. Ya puedes iniciar sesión.') }
    catch (error) { setAuthNotice(error.response?.data?.error || 'No fue posible actualizar la contraseña.') }
  }

  if (cargandoSesion) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-sm uppercase tracking-[0.35em] text-slate-400">
          Cargando sesión...
        </div>
      </div>
    )
  }

  if (usuarioAutenticado) {
    if (verAdmin && usuarioAutenticado.role === 'ADMIN') return <AdminReports onClose={() => setVerAdmin(false)} />
    if (usuarioAutenticado.role === 'ADMIN') return <><div className="fixed right-4 top-4 z-50"><button className="Btn-Secundario" onClick={() => setVerAdmin(true)}>Moderación</button></div><FeedScreen usuarioAutenticado={usuarioAutenticado} cerrarSesion={cerrarSesion} /></>
    return <FeedScreen usuarioAutenticado={usuarioAutenticado} cerrarSesion={cerrarSesion} />
  }

  if (isReset) return <div className="Olimpo-Contenedor min-h-screen flex items-center justify-center"><form className="Card-Formulario flex flex-col gap-4" onSubmit={restablecerContrasena}><h1 className="Logo-Sofocles !text-3xl">Nueva contraseña</h1><input className="Input-Olimpo" type="password" minLength="8" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres"/><button className="Btn-Primario" type="submit">Actualizar contraseña</button>{authNotice && <p>{authNotice}</p>}</form></div>
  if (isVerification) return <div className="Olimpo-Contenedor min-h-screen flex items-center justify-center"><div className="Card-Formulario text-center"><h1 className="Logo-Sofocles !text-3xl">Verificación</h1><p>{authNotice || 'Verificando correo…'}</p></div></div>

  return (
    <div className="Olimpo-Contenedor">
      <div className="Aura-Apolo-Cyan" />
      <div className="Aura-Afrodita-Magenta" />
      <div className="Red-Geometrica" />

      <header className="Banner-Olimpo">
        <div>
          <h1 className="Logo-Sofocles">Sófocles</h1>
          {usuarioAutenticado && (
            <p className="mt-2 text-xs uppercase tracking-[0.25em] text-cyan-300/80">
              Sesión activa: {usuarioAutenticado.username}
            </p>
          )}
        </div>
        <div className="Controles-Acceso">
          {usuarioAutenticado ? (
            <button className="Btn-Secundario" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          ) : (
            <>
              <button
                className="Btn-Secundario"
                onClick={() => {
                  setErrorMsg('')
                  setModalActivo('login')
                }}
              >
                Iniciar sesión
              </button>
              <button
                className="Btn-Primario"
                onClick={() => {
                  setErrorMsg('')
                  setModalActivo('registro')
                }}
              >
                Registrar
              </button>
            </>
          )}
        </div>
      </header>

      <main className="Seccion-Hero">
        <div className="Detalle-Corona">✦ 🏛️ ✦</div>
        <h2 className="Eslogan-Olimpo">
          Vive la red desde{" "}
          <span className="Texto-Gradiente">otro enfoque</span>, otra forma de
          ver la vida...
        </h2>
        <div className="Caja-Conectados">
          <span className="Texto-Conectados">Conectados</span>
        </div>
      </main>

      <footer className="Footer-Olimpo">
        <h3>Un nuevo orden social</h3>
        <p>
          Infórmate sobre este nuevo mundo, un enfoque distinto donde la
          filosofía del mañana y la arquitectura del código se encuentran.
        </p>
      </footer>

      {/* MODAL DE LOGIN */}
      {modalActivo === "login" && (
        <div className="Overlay-Modal">
          <div className="Card-Formulario Modal-Animacion">
            <button className="Btn-Cerrar" onClick={() => setModalActivo(null)}>
              ✕
            </button>

            <div className="text-center">
              <h2 className="Logo-Sofocles !text-3xl mb-1">Sófocles</h2>
              <p className="text-xs text-slate-400">
                Ingresa al templo de la red
              </p>
            </div>

            {errorMsg && (
              <div className="text-xs text-red-400 bg-red-950/40 border border-red-500/20 p-3 rounded-xl text-center font-medium">
                {errorMsg}
              </div>
            )}

            <form className="flex flex-col gap-4" onSubmit={login}>
              <div className="Form-Grupo">
                <label>Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  className="Input-Olimpo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="Form-Grupo">
                <label>Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="Input-Olimpo"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="Btn-Primario w-full py-3 rounded-xl font-bold tracking-wider mt-2 cursor-pointer transition-all active:scale-95"
              >
                Ingresar
              </button>
            </form>

            <button
              className="Enlace-Simple border-none bg-none cursor-pointer"
              onClick={() => {
                setErrorMsg('')
                setModalActivo('registro')
              }}
            >
              ¿No tienes una cuenta? Regístrate aquí
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE REGISTRO */}
      {modalActivo === "registro" && (
        <div className="Overlay-Modal">
          <div className="Card-Formulario Modal-Animacion">
            <button className="Btn-Cerrar" onClick={() => setModalActivo(null)}>
              ✕
            </button>

            <div className="text-center">
              <h2 className="Logo-Sofocles !text-3xl mb-1">Sófocles</h2>
              <p className="text-xs text-slate-400">
                Forja tu identidad en el orden
              </p>
            </div>

            {errorMsg && (
              <div className="text-xs text-red-400 bg-red-950/40 border border-red-500/20 p-3 rounded-xl text-center font-medium">
                {errorMsg}
              </div>
            )}

            <form className="flex flex-col gap-4" onSubmit={registro}>
              <div className="Form-Grupo">
                <label>Nombre de Usuario</label>
                <input
                  type="text"
                  placeholder="Ejemplo: SalveCesar17"
                  className="Input-Olimpo"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  required
                />
              </div>
              <div className="Form-Grupo">
                <label>Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="Ejemplo: romanos@sofocles.com"
                  className="Input-Olimpo"
                  value={emailRegistro}
                  onChange={(e) => setEmailRegistro(e.target.value)}
                  required
                />
              </div>
              <div className="Form-Grupo">
                <label>Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="Input-Olimpo"
                  value={passwordRegistro}
                  onChange={(e) => setPasswordRegistro(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="Btn-Primario w-full py-3 rounded-xl font-bold tracking-wider mt-2 cursor-pointer transition-all active:scale-95"
              >
                Crear Cuenta
              </button>
            </form>

            <button className="Enlace-Simple border-none bg-none cursor-pointer" type="button" onClick={solicitarRecuperacion}>¿Olvidaste tu contraseña?</button>

            <button
              className="Enlace-Simple border-none bg-none cursor-pointer"
              onClick={() => {
                setErrorMsg('')
                setModalActivo('login')
              }}
            >
              ¿Ya tienes cuenta? Inicia sesión aquí
            </button>
          </div>
        </div>
      )}

      {/* VENTANA EMERGENTE: ¡USUARIO FORJADO EN EL OLIMPO! */}
      {mostrarExito && (
        <div className="Overlay-Modal">
          <div className="Card-Formulario Modal-Animacion border border-amber-500/30 text-center flex flex-col items-center gap-6 p-8">
            <div className="text-5xl animate-bounce">🏛️✨</div>

            <div>
              <h2 className="text-2xl font-black text-amber-400 tracking-wider uppercase mb-2">
                ¡Usuario Forjado en el Olimpo!
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Tu alma ha sido registrada con éxito en los registros de
                **Sófocles**. Tu camino hacia el nuevo orden social ha
                comenzado.
              </p>
            </div>

            <div className="w-full border-t border-slate-800 my-1" />

            <button
              onClick={() => {
                setMostrarExito(false)
                setModalActivo('login') // Lo manda directo a loguearse
              }}
              className="Btn-Primario w-full py-3 rounded-xl font-bold tracking-wider cursor-pointer transition-all active:scale-95 shadow-lg shadow-amber-500/10"
            >
              Ingresar al Templo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
