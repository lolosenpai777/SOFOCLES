import { useState } from "react";
import "./index.css";
import clienteAxios from "./api/clienteAxios";

function App() {
  // Estado para controlar qué ventana emergente está abierta ('login', 'registro' o null)
  const [modalActivo, setModalActivo] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const login = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    try {
      // Hacemos una petición POST a 'http://localhost:5000/api/auth/login'
      const respuesta = await clienteAxios.post("/auth/login", {
        email: email,
        password: password,
      });

      console.log("¡Conexión exitosa al Olimpo!", respuesta.data);

      // Aquí guardarías el token, cerrarías el modal, etc.
      setModalActivo(null);
    } catch (error) {
      console.error("Error al conectar con el templo:", error);
      // Capturamos el mensaje de error que nos mande el backend
      setErrorMsg(
        error.response?.data?.mensaje || "Error de conexión con el servidor",
      );
    }
  };

  return (
    <div className="Olimpo-Contenedor">
      {/* Efectos espectaculares del fondo */}
      <div className="Aura-Apolo-Cyan" />
      <div className="Aura-Afrodita-Magenta" />
      <div className="Red-Geometrica" />

      {/* 1. EL BANNER */}
      <header className="Banner-Olimpo">
        <h1 className="Logo-Sofocles">Sófocles</h1>
        <div className="Controles-Acceso">
          <button
            className="Btn-Secundario"
            onClick={() => setModalActivo("login")}
          >
            Iniciar sesión
          </button>
          <button
            className="Btn-Primario"
            onClick={() => setModalActivo("registro")}
          >
            Registrar
          </button>
        </div>
      </header>

      {/* 2. EL CENTRO */}
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

      {/* 3. EL FOOTER */}
      <footer className="Footer-Olimpo">
        <h3>Un nuevo orden social</h3>
        <p>
          Infórmate sobre este nuevo mundo, un enfoque distinto donde la
          filosofía del mañana y la arquitectura del código se encuentran.
        </p>
      </footer>

      {/* === VENTANA EMERGENTE: INICIAR SESIÓN === */}
      {modalActivo === "login" && (
        <div className="Overlay-Modal" onClick={() => setModalActivo(null)}>
          {/* El stopPropagation evita que se cierre el modal al hacer clic dentro de la tarjeta */}
          <div
            className="Card-Formulario Modal-Animacion"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="Btn-Cerrar" onClick={() => setModalActivo(null)}>
              ✕
            </button>

            <div className="text-center">
              <h2 className="Logo-Sofocles !text-3xl mb-1">Sófocles</h2>
              <p className="text-xs text-slate-400">
                Ingresa al templo de la red
              </p>
            </div>

            {/* Alerta visual por si el backend rechaza las credenciales */}
            {errorMsg && (
              <div className="text-xs text-red-400 bg-red-950/40 border border-red-500/20 p-3 rounded-xl text-center font-medium">
                {errorMsg}
              </div>
            )}

            {/* 3. CORREGIDO: Le pasamos la función 'login' al onSubmit del formulario */}
            <form className="flex flex-col gap-4" onSubmit={login}>
              <div className="Form-Grupo">
                <label>Correo Electrónico</label>
                {/* 3. CORREGIDO: Enlazamos el value y el onChange al estado 'email' */}
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
                {/* 3. CORREGIDO: Enlazamos el value y el onChange al estado 'password' */}
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
              onClick={() => setModalActivo("registro")}
            >
              ¿No tienes una cuenta? Regístrate aquí
            </button>
          </div>
        </div>
      )}

      {/* === VENTANA EMERGENTE: REGISTRO === */}
      {modalActivo === "registro" && (
        <div className="Overlay-Modal" onClick={() => setModalActivo(null)}>
          <div
            className="Card-Formulario Modal-Animacion"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="Btn-Cerrar" onClick={() => setModalActivo(null)}>
              ✕
            </button>

            <div className="text-center">
              <h2 className="Logo-Sofocles !text-3xl mb-1">Sófocles</h2>
              <p className="text-xs text-slate-400">
                Forja tu identidad en el orden
              </p>
            </div>

            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="Form-Grupo">
                <label>Nombre de Usuario</label>
                <input
                  type="text"
                  placeholder="Ejemplo: SalveCesar17"
                  className="Input-Olimpo"
                />
              </div>
              <div className="Form-Grupo">
                <label>Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="Ejemplo: romanos@sofocles.com"
                  className="Input-Olimpo"
                />
              </div>
              <div className="Form-Grupo">
                <label>Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="Input-Olimpo"
                />
              </div>
              <button
                type="submit"
                className="Btn-Primario w-full py-3 rounded-xl font-bold tracking-wider mt-2 cursor-pointer transition-all active:scale-95"
              >
                Crear Cuenta
              </button>
            </form>

            <button
              className="Enlace-Simple border-none bg-none cursor-pointer"
              onClick={() => setModalActivo("login")}
            >
              ¿Ya tienes cuenta? Inicia sesión aquí
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
