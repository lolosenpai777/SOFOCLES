import { useCallback, useEffect, useRef, useState } from 'react'
import clienteAxios from './api/clienteAxios'
import FeedScreen from './styles/FeedScreen.jsx'
import AdminReports from './components/AdminReports.jsx'
import AdminUsersModeration from './components/AdminUsersModeration.jsx'
import AdminRoute from './components/AdminRoute.jsx'
import UsernameSetupModal from './components/UsernameSetupModal.jsx'
import { formatDateWithRelative } from './utils/formatDate'

function parseAdminRoute(pathname) {
  if (pathname === '/admin/users' || pathname === '/admin/users/') {
    return {
      isMatch: true,
      section: 'users',
      caseId: null,
    }
  }

  const match = pathname.match(/^\/admin\/reports(?:\/(\d+))?\/?$/)
  if (!match) return null
  return {
    isMatch: true,
    section: 'reports',
    caseId: match[1] ? Number(match[1]) : null,
  }
}

function App() {
  const [modalActivo, setModalActivo] = useState(null)

  // Estados para Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Estados para Registro
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [emailRegistro, setEmailRegistro] = useState('')
  const [passwordRegistro, setPasswordRegistro] = useState('')
  const [registerFieldErrors, setRegisterFieldErrors] = useState({})
  const [availability, setAvailability] = useState({ username: null, email: null })
  const [availabilityTouched, setAvailabilityTouched] = useState({ username: false, email: false })
  const availabilityRequestId = useRef({ username: 0, email: 0 })

  // Estado para mensajes de error y éxito
  const [errorMsg, setErrorMsg] = useState('')
  const [mostrarExito, setMostrarExito] = useState(false)
  const [mostrarVerificacion, setMostrarVerificacion] = useState(false)
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [pathname, setPathname] = useState(window.location.pathname)

  const query = new URLSearchParams(window.location.search)
  const resetToken = query.get('token')
  const isReset = pathname.includes('restablecer-contrasena') && resetToken
  const isVerification = pathname.includes('verificar-correo') && resetToken
  const isOAuthCallback = pathname === '/oauth/callback' || pathname === '/oauth/callback/'
  const oauthCode = query.get('code')

  const [newPassword, setNewPassword] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationNotice, setVerificationNotice] = useState('')
  const [verificandoCodigo, setVerificandoCodigo] = useState(false)

  const adminRoute = parseAdminRoute(pathname)

  const navigateTo = useCallback((nextPath, options = {}) => {
    const { replace = false } = options
    const target = nextPath || '/'
    if (replace) {
      window.history.replaceState({}, '', target)
    } else {
      window.history.pushState({}, '', target)
    }
    setPathname(window.location.pathname)
  }, [])

  useEffect(() => {
    const fields = [
      { field: 'username', value: nombreUsuario },
      { field: 'email', value: emailRegistro },
    ]
    const timers = []

    for (const { field, value } of fields) {
      const requestId = ++availabilityRequestId.current[field]
      if (!availabilityTouched[field] || !value.trim()) {
        setAvailability((current) => ({ ...current, [field]: null }))
        continue
      }

      setAvailability((current) => ({ ...current, [field]: { checking: true } }))
      const timer = window.setTimeout(async () => {
        try {
          const { data } = await clienteAxios.get('/auth/check-availability', {
            params: { field, value },
          })
          if (requestId === availabilityRequestId.current[field]) {
            setAvailability((current) => ({ ...current, [field]: { available: data.available } }))
          }
        } catch (error) {
          console.error('No se pudo comprobar disponibilidad:', error)
          if (requestId === availabilityRequestId.current[field]) {
            setAvailability((current) => ({ ...current, [field]: null }))
          }
        }
      }, 500)
      timers.push(timer)
    }

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [availabilityTouched, emailRegistro, nombreUsuario])

  useEffect(() => {
    if (!isVerification) return
    clienteAxios
      .post('/auth/verificar-correo', { token: resetToken })
      .then(() => setAuthNotice('Correo verificado. Ya puedes iniciar sesión.'))
      .catch(() => setAuthNotice('El enlace de verificación no es válido o expiró.'))
  }, [isVerification, resetToken])

  useEffect(() => {
    const oauthError = query.get('oauthError')
    const oauthLinked = query.get('oauthLinked')

    if (oauthError === 'SOCIAL_EMAIL_REQUIRES_PASSWORD') {
      setErrorMsg(
        'Ya existe una cuenta con ese correo. Inicia sesión con tu contraseña y vincula la cuenta desde tu perfil.'
      )
    } else if (oauthError === 'LAST_LOGIN_METHOD') {
      setErrorMsg('No puedes desvincular tu único método de acceso. Establece una contraseña primero.')
    } else if (oauthError) {
      setErrorMsg('No se pudo completar la operación social. Inténtalo nuevamente.')
    } else if (oauthLinked) {
      setAuthNotice(`Cuenta de ${oauthLinked} vinculada correctamente.`)
    }
  }, [pathname])

  useEffect(() => {
    if (!isOAuthCallback || !oauthCode) return
    clienteAxios
      .post('/auth/oauth/exchange', { code: oauthCode })
      .then(({ data }) => {
        localStorage.setItem('sofocles_token', data.token)
        setUsuarioAutenticado(data.usuario)
        navigateTo('/', { replace: true })
      })
      .catch((err) => {
        console.error(err)
        setErrorMsg('No se pudo completar el inicio de sesión social. Inténtalo nuevamente.')
        navigateTo('/login', { replace: true })
      })
  }, [isOAuthCallback, navigateTo, oauthCode])

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

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

  useEffect(() => {
    if (!cargandoSesion && !usuarioAutenticado && adminRoute?.isMatch) {
      navigateTo('/login', { replace: true })
    }
  }, [adminRoute, cargandoSesion, navigateTo, usuarioAutenticado])

  // Función de Login
  const login = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    try {
      const respuesta = await clienteAxios.post('/auth/login', {
        email,
        password,
      })

      localStorage.setItem('sofocles_token', respuesta.data.token)
      setUsuarioAutenticado(respuesta.data.usuario)
      setModalActivo(null)
    } catch (error) {
      console.error('Error al conectar con el templo:', error)
      const payload = error.response?.data
      if (payload?.code === 'ACCOUNT_SUSPENDED') {
        if (payload?.suspendedUntil) {
          setErrorMsg(`Tu cuenta está suspendida hasta ${formatDateWithRelative(payload.suspendedUntil)}`)
        } else {
          setErrorMsg('Tu cuenta está suspendida permanentemente')
        }
        return
      }
      setErrorMsg(payload?.mensaje || 'Error de conexión con el servidor')
    }
  }

  // Función de Registro
  const registro = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setRegisterFieldErrors({})

    try {
      await clienteAxios.post('/auth/registro', {
        username: nombreUsuario,
        email: emailRegistro,
        password: passwordRegistro,
      })

      // Limpiamos los campos del registro
      setNombreUsuario('')
      setEmailRegistro('')
      setPasswordRegistro('')
      setVerificationEmail(emailRegistro.trim())
      setVerificationCode('')
      setVerificationNotice('Cuenta creada. Revisa tu correo e ingresa el código para activar tu cuenta.')

      // Cerramos el modal de registro y abrimos la ventana de éxito
      setModalActivo(null)
      setMostrarVerificacion(true)
    } catch (error) {
      console.error('Error al registrar en el templo:', error)
      const payload = error.response?.data || {}
      setRegisterFieldErrors(payload.field ? { [payload.field]: payload.message || payload.mensaje } : {})
      setErrorMsg(payload.field ? '' : payload.mensaje || 'Error al crear la cuenta')
    }
  }

  const cerrarSesion = () => {
    localStorage.removeItem('sofocles_token')
    setUsuarioAutenticado(null)
  }

  const solicitarRecuperacion = async () => {
    const recoveryEmail = window.prompt('Escribe tu correo para recibir el enlace de recuperación:')
    if (!recoveryEmail) return
    try {
      await clienteAxios.post('/auth/recuperar-contrasena', { email: recoveryEmail })
      setErrorMsg('Revisa tu correo si la cuenta existe.')
    } catch {
      setErrorMsg('No se pudo solicitar la recuperación.')
    }
  }

  const restablecerContrasena = async (event) => {
    event.preventDefault()
    try {
      await clienteAxios.post('/auth/restablecer-contrasena', { token: resetToken, password: newPassword })
      setAuthNotice('Contraseña actualizada. Ya puedes iniciar sesión.')
    } catch (error) {
      setAuthNotice(error.response?.data?.error || 'No fue posible actualizar la contraseña.')
    }
  }

  const verificarCodigo = async (event) => {
    event.preventDefault()
    if (verificandoCodigo) return
    setVerificationNotice('')
    setVerificandoCodigo(true)
    try {
      const { data } = await clienteAxios.post('/auth/verify-email', {
        email: verificationEmail,
        code: verificationCode,
      })
      localStorage.setItem('sofocles_token', data.token)
      setUsuarioAutenticado(data.usuario)
      setMostrarVerificacion(false)
      setVerificationCode('')
      setVerificationNotice('')
      setAuthNotice('Correo verificado correctamente. Ya puedes iniciar sesión.')
      navigateTo('/', { replace: true })
    } catch (error) {
      console.error(error)
      setVerificationNotice(error.response?.data?.error || 'No se pudo verificar el código.')
    } finally {
      setVerificandoCodigo(false)
    }
  }

  const reenviarCodigo = async () => {
    setVerificationNotice('')
    try {
      await clienteAxios.post('/auth/resend-verification', { email: verificationEmail })
      setVerificationNotice('Si el correo puede recibir un código, lo recibirás pronto.')
    } catch (error) {
      console.error(error)
      setVerificationNotice('No se pudo solicitar el código. Inténtalo nuevamente.')
    }
  }

  const completarUsernameSetup = (updatedUser) => {
    setUsuarioAutenticado((current) => ({ ...current, ...updatedUser, needsUsernameSetup: false }))
  }

  if (cargandoSesion) {
    return (
      <div className="Olimpo-Contenedor min-h-screen flex items-center justify-center">
        <div className="text-sm uppercase tracking-[0.35em]" style={{ color: 'var(--text-muted)' }}>
          Cargando sesión...
        </div>
      </div>
    )
  }

  if (isOAuthCallback) {
    return (
      <div className="Olimpo-Contenedor">
        <div className="Auth-Scene">
          <div className="Auth-Panel">
            <p className="Auth-Panel__meta">Completando inicio de sesión...</p>
          </div>
        </div>
      </div>
    )
  }

  if (usuarioAutenticado) {
    if (usuarioAutenticado.needsUsernameSetup) {
      return <UsernameSetupModal user={usuarioAutenticado} onCompleted={completarUsernameSetup} />
    }

    if (adminRoute?.isMatch) {
      return (
        <AdminRoute
          user={usuarioAutenticado}
          onRedirectToLogin={() => navigateTo('/login', { replace: true })}
          onBackToFeed={() => navigateTo('/')}
        >
          {adminRoute.section === 'reports' ? (
            <AdminReports
              currentUser={usuarioAutenticado}
              initialCaseId={adminRoute.caseId}
              onBack={() => navigateTo('/')}
              onCaseChange={(caseId) => navigateTo(`/admin/reports/${caseId}`)}
              onOpenUsersModeration={() => navigateTo('/admin/users')}
            />
          ) : (
            <AdminUsersModeration
              onBack={() => navigateTo('/')}
              onOpenReports={() => navigateTo('/admin/reports')}
            />
          )}
        </AdminRoute>
      )
    }

    return (
      <FeedScreen
        usuarioAutenticado={usuarioAutenticado}
        cerrarSesion={cerrarSesion}
        onOpenAdminReports={() => navigateTo('/admin/reports')}
      />
    )
  }

  if (isReset) {
    return (
      <div className="Olimpo-Contenedor">
        <div className="Auth-Scene">
          <form className="Auth-Panel" onSubmit={restablecerContrasena}>
            <div className="Logo-Stage__mark mx-auto" style={{ maxWidth: '13rem' }}>
              <img src="/logosofo.png" alt="Sófocles" />
            </div>
            <h1 className="sr-only">Nueva contraseña</h1>
            <div className="Form-Grupo">
              <label>Nueva contraseña</label>
              <input
                className="Input-Olimpo"
                type="password"
                minLength="8"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <button className="Btn-Primario" type="submit">
              Actualizar contraseña
            </button>
            {authNotice && <p className="Auth-Panel__meta">{authNotice}</p>}
          </form>
        </div>
      </div>
    )
  }

  if (isVerification) {
    return (
      <div className="Olimpo-Contenedor">
        <div className="Auth-Scene">
          <div className="Auth-Panel">
            <div className="Logo-Stage__mark mx-auto" style={{ maxWidth: '13rem' }}>
              <img src="/logosofo.png" alt="Sófocles" />
            </div>
            <h1 className="sr-only">Verificación</h1>
            <p className="Auth-Panel__meta">{authNotice || 'Verificando correo…'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="Olimpo-Contenedor">
      <div className="Aura-Apolo-Cyan" />
      <div className="Aura-Afrodita-Magenta" />
      <div className="Red-Geometrica" />

      <main className="Auth-Scene">
        <section className="Home-Layout">
          <div className="Home-Panel Home-Panel--copy">
            <span className="Home-Kicker">Templo social contemporáneo</span>
            <div className="Logo-Stage Home-Branding">
              <div className="Logo-Stage__mark Home-Branding__mark">
                <img src="/logosofo.png" alt="Sófocles" />
              </div>
              <p className="Home-Headline">Una página de inicio más editorial, más limpia y con presencia real.</p>
              <p className="Home-Subcopy">
                Accede con tu cuenta, crea una nueva identidad o entra con Google y Discord desde una interfaz más
                clara y visual.
              </p>
            </div>

            <div className="Home-Metrics">
              <article className="Home-MetricCard">
                <strong>Login</strong>
                <span>Acceso directo y rápido</span>
              </article>
              <article className="Home-MetricCard">
                <strong>Register</strong>
                <span>Altas con verificación por correo</span>
              </article>
              <article className="Home-MetricCard">
                <strong>OAuth</strong>
                <span>Google y Discord integrados</span>
              </article>
            </div>

            <div className="Auth-Panel__actions Auth-Panel__actions--hero Home-Actions">
              {usuarioAutenticado ? (
                <button className="Btn-Primario" onClick={cerrarSesion}>
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

            {errorMsg && <p className="Auth-Panel__meta text-red-600">{errorMsg}</p>}
          </div>

          <aside className="Home-Panel Home-Panel--visual">
            <div className="Home-PreviewCard">
              <p className="Home-PreviewCard__eyebrow">Experiencia de entrada</p>
              <h2 className="Home-PreviewCard__title">
                Login y registro con contraste, jerarquía y foco en conversión.
              </h2>
              <p className="Home-PreviewCard__text">
                La nueva portada separa mejor la marca, los accesos y la propuesta visual para que el primer impacto
                sea más claro.
              </p>
              <div className="Home-PreviewCard__chips">
                <span>Glass UI</span>
                <span>Marca centrada</span>
                <span>Accesos directos</span>
              </div>
            </div>

            <div className="Home-InfoGrid">
              <article>
                <strong>1</strong>
                <span>Abre login o registro desde la portada</span>
              </article>
              <article>
                <strong>2</strong>
                <span>Usa OAuth o correo con validación</span>
              </article>
              <article>
                <strong>3</strong>
                <span>Entra al feed con una sesión persistente</span>
              </article>
            </div>
          </aside>
        </section>
      </main>

      {/* MODAL DE LOGIN */}
      {modalActivo === 'login' && (
        <div className="Overlay-Modal">
          <div className="Card-Formulario Card-Formulario--auth Card-Formulario--login Modal-Animacion">
            <button className="Btn-Cerrar" onClick={() => setModalActivo(null)}>
              ✕
            </button>

            <div className="Auth-CardHero text-center">
              <div className="Logo-Lockup Logo-Lockup--compact justify-center mb-1">
                <div className="Logo-Marca Logo-Marca--compact">
                  <img src="/logosofo.png" alt="Sófocles" />
                </div>
              </div>
              <p className="Auth-CardHero__eyebrow">Acceso inmediato</p>
              <p className="Auth-CardHero__title">Ingresa al templo de la red</p>
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

            <div className="Auth-CardSocial flex flex-row items-center justify-center gap-4 pt-2">
              <button
                type="button"
                className="Btn-Social-Icon"
                aria-label="Continuar con Google"
                title="Continuar con Google"
                onClick={() => {
                  window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'}/auth/google`
                }}
              >
                <img src="/google-178-svgrepo-com.svg" alt="Google" className="w-6 h-6 object-contain" />
              </button>

              <button
                type="button"
                className="Btn-Social-Icon"
                aria-label="Continuar con Discord"
                title="Continuar con Discord"
                onClick={() => {
                  window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'}/auth/discord`
                }}
              >
                <img src="/discord-svgrepo-com.svg" alt="Discord" className="w-6 h-6 object-contain" />
              </button>
            </div>

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
      {modalActivo === 'registro' && (
        <div className="Overlay-Modal">
          <div className="Card-Formulario Card-Formulario--auth Card-Formulario--register Modal-Animacion">
            <button className="Btn-Cerrar" onClick={() => setModalActivo(null)}>
              ✕
            </button>

            <div className="Auth-CardHero text-center">
              <div className="Logo-Lockup Logo-Lockup--compact justify-center mb-1">
                <div className="Logo-Marca Logo-Marca--compact">
                  <img src="/logosofo.png" alt="Sófocles" />
                </div>
              </div>
              <p className="Auth-CardHero__eyebrow">Crear cuenta</p>
              <p className="Auth-CardHero__title">Forja tu identidad en el orden</p>
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
                  onChange={(e) => {
                    setNombreUsuario(e.target.value)
                    setRegisterFieldErrors((current) => ({ ...current, username: '' }))
                    setAvailability((current) => ({ ...current, username: null }))
                  }}
                  onBlur={() => setAvailabilityTouched((current) => ({ ...current, username: true }))}
                  required
                />
                {registerFieldErrors.username && (
                  <p className="text-xs text-red-400 mt-1">{registerFieldErrors.username}</p>
                )}
                {availability.username?.checking && (
                  <p className="text-xs text-slate-400 mt-1">Comprobando disponibilidad…</p>
                )}
                {availability.username?.available === true && (
                  <p className="text-xs text-emerald-400 mt-1">✓ Username disponible</p>
                )}
                {availability.username?.available === false && (
                  <p className="text-xs text-red-400 mt-1">✗ Ese username ya está en uso</p>
                )}
              </div>

              <div className="Form-Grupo">
                <label>Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="Ejemplo: romanos@sofocles.com"
                  className="Input-Olimpo"
                  value={emailRegistro}
                  onChange={(e) => {
                    setEmailRegistro(e.target.value)
                    setRegisterFieldErrors((current) => ({ ...current, email: '' }))
                    setAvailability((current) => ({ ...current, email: null }))
                  }}
                  onBlur={() => setAvailabilityTouched((current) => ({ ...current, email: true }))}
                  required
                />
                {registerFieldErrors.email && (
                  <div className="text-xs text-red-400 mt-1 flex flex-col gap-1">
                    <span>{registerFieldErrors.email}</span>
                    <button
                      type="button"
                      className="underline text-amber-300 text-left"
                      onClick={() => {
                        setErrorMsg('')
                        setModalActivo('login')
                      }}
                    >
                      Iniciar sesión o recuperar contraseña
                    </button>
                  </div>
                )}
                {availability.email?.checking && (
                  <p className="text-xs text-slate-400 mt-1">Comprobando disponibilidad…</p>
                )}
                {availability.email?.available === true && (
                  <p className="text-xs text-emerald-400 mt-1">✓ Correo disponible</p>
                )}
                {availability.email?.available === false && (
                  <p className="text-xs text-red-400 mt-1">✗ Ya existe una cuenta con este correo</p>
                )}
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

            <div className="Auth-CardSocial flex flex-row items-center justify-center gap-4 pt-2">
              <button
                type="button"
                className="Btn-Social-Icon"
                aria-label="Continuar con Google"
                title="Continuar con Google"
                onClick={() => {
                  window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'}/auth/google`
                }}
              >
                <img src="/google-178-svgrepo-com.svg" alt="Google" className="w-6 h-6 object-contain" />
              </button>

              <button
                type="button"
                className="Btn-Social-Icon"
                aria-label="Continuar con Discord"
                title="Continuar con Discord"
                onClick={() => {
                  window.location.href = `${import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'}/auth/discord`
                }}
              >
                <img src="/discord-svgrepo-com.svg" alt="Discord" className="w-6 h-6 object-contain" />
              </button>
            </div>

            <button
              className="Enlace-Simple border-none bg-none cursor-pointer"
              type="button"
              onClick={solicitarRecuperacion}
            >
              ¿Olvidaste tu contraseña?
            </button>

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

      {/* VENTANA EMERGENTE: VERIFICACIÓN CÓDIGO */}
      {mostrarVerificacion && (
        <div className="Overlay-Modal">
          <div className="Card-Formulario Modal-Animacion text-center flex flex-col items-center gap-4 p-8">
            <div className="text-5xl" aria-hidden="true">
              ✉️
            </div>
            <h2 className="text-2xl font-black text-amber-400 uppercase">¡Cuenta creada!</h2>
            <p className="text-sm text-slate-300">Revisa tu correo e ingresa el código para activar tu cuenta.</p>
            <p className="text-sm text-slate-400">Enviamos un código de seis dígitos a {verificationEmail}.</p>
            {verificationNotice && <p className="text-sm text-slate-300">{verificationNotice}</p>}

            <form className="w-full flex flex-col gap-3" onSubmit={verificarCodigo}>
              <input
                className="Input-Olimpo text-center tracking-[0.4em]"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]{6}"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
              />
              <button
                type="submit"
                disabled={verificandoCodigo}
                className="Btn-Primario w-full py-3 rounded-xl font-bold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verificandoCodigo ? 'Verificando…' : 'Verificar correo'}
              </button>
            </form>

            <button onClick={reenviarCodigo} className="Enlace-Simple border-none bg-none cursor-pointer">
              Reenviar código
            </button>
            <button
              onClick={() => {
                setMostrarVerificacion(false)
                setModalActivo('login')
              }}
              className="Enlace-Simple border-none bg-none cursor-pointer"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      )}

      {/* VENTANA EMERGENTE: ÉXITO */}
      {mostrarExito && (
        <div className="Overlay-Modal">
          <div className="Card-Formulario Modal-Animacion border border-amber-500/30 text-center flex flex-col items-center gap-6 p-8">
            <div className="text-5xl animate-bounce">🏛️✨</div>

            <div>
              <h2 className="text-2xl font-black text-amber-400 tracking-wider uppercase mb-2">
                ¡Usuario Forjado en el Olimpo!
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Tu alma ha sido registrada con éxito en los registros de **Sófocles**. Tu camino hacia el nuevo orden
                social ha comenzado.
              </p>
            </div>

            <div className="w-full border-t border-slate-800 my-1" />

            <button
              onClick={() => {
                setMostrarExito(false)
                setModalActivo('login')
              }}
              className="Btn-Primario w-full py-3 rounded-xl font-bold tracking-wider cursor-pointer transition-all active:scale-95 shadow-lg shadow-amber-500/10"
            >
              Ingresar al Templo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App