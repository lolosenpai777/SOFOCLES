import { useState, useEffect, useRef } from "react";
import { buscarGifs, obtenerGifsTrending } from "../api/giphy";
import "./GiphySearch.css";

function GiphySearch({ onSelectGif, onClose }) {
  const [gifs, setGifs] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const timeoutRef = useRef(null);

  // Cargar GIFs trending al abrir
  useEffect(() => {
    cargarTrending();
  }, []);

  const cargarTrending = async () => {
    setCargando(true);
    setError("");
    try {
      const resultado = await obtenerGifsTrending(20);
      setGifs(resultado);
    } catch (err) {
      setError("Error al cargar GIFs");
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const realizarBusqueda = async (query) => {
    if (!query.trim()) {
      setBusqueda("");
      cargarTrending();
      return;
    }

    setCargando(true);
    setError("");

    try {
      const resultado = await buscarGifs(query, 20);
      if (resultado.length === 0) {
        setError("No se encontraron GIFs");
        setGifs([]);
      } else {
        setGifs(resultado);
      }
    } catch (err) {
      setError("Error al buscar GIFs");
      console.error(err);
      setGifs([]);
    } finally {
      setCargando(false);
    }
  };

  const handleInputChange = (e) => {
    const valor = e.target.value;
    setBusqueda(valor);

    // Limpiar el timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Esperar a que el usuario deje de escribir
    timeoutRef.current = setTimeout(() => {
      realizarBusqueda(valor);
    }, 500);
  };

  const handleSelectGif = (gif) => {
    onSelectGif(gif);
    onClose();
  };

  return (
    <div className="Giphy-Modal-Overlay" onClick={onClose}>
      <div
        className="Giphy-Modal-Contenedor"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="Giphy-Modal-Header">
          <h2 className="Giphy-Modal-Titulo">Buscar GIFs</h2>
          <button
            type="button"
            className="Giphy-Modal-Cerrar"
            onClick={onClose}
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

        <div className="Giphy-Buscador-Contenedor">
          <input
            type="text"
            placeholder="Busca un GIF..."
            className="Giphy-Input-Busqueda"
            value={busqueda}
            onChange={handleInputChange}
          />
          {busqueda && (
            <button
              type="button"
              className="Giphy-Btn-Limpiar"
              onClick={() => {
                setBusqueda("");
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                }
                cargarTrending();
              }}
            >
              ✕
            </button>
          )}
        </div>

        {error && (
          <div className="Giphy-Error">
            <p>{error}</p>
          </div>
        )}

        {cargando ? (
          <div className="Giphy-Cargando">
            <div className="Giphy-Spinner"></div>
            <p>Cargando GIFs...</p>
          </div>
        ) : (
          <div className="Giphy-Grid">
            {gifs.length === 0 && !busqueda ? (
              <p className="Giphy-Vacio">No hay GIFs disponibles</p>
            ) : gifs.length === 0 ? (
              <p className="Giphy-Vacio">No se encontraron resultados</p>
            ) : (
              gifs.map((gif) => (
                <div
                  key={gif.id}
                  className="Giphy-Item"
                  onClick={() => handleSelectGif(gif)}
                  title={gif.title}
                >
                  <img
                    src={gif.url}
                    alt={gif.title}
                    loading="lazy"
                  />
                  <div className="Giphy-Item-Overlay">
                    <span>Seleccionar</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="Giphy-Footer">
          <small>Powered by Giphy</small>
        </div>
      </div>
    </div>
  );
}

export default GiphySearch;
