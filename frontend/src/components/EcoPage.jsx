import React, { useState, useEffect, useRef } from 'react';
import FluidGlassCard from './ui/FluidGlassCard';
import clienteAxios from '../api/clienteAxios';
import { interesesEcoValidos, MIN_INTERESES_ECO, TOPICOS_INTERESES } from '../utils/ecoNames';
import './EcoPage.css';

const REACCIONES = ['👍', '❤️', '💡', '🏛️', '🎭', '👏'];
const REPORTES_ECO = [
  ['HARASSMENT_BULLYING', 'Acoso'],
  ['IMPERSONATION', 'Suplantación de género/identidad'],
  ['SEXUAL_CONTENT', 'Contenido explícito'],
  ['HATE_SPEECH', 'Lenguaje de odio'],
  ['SPAM', 'Spam'],
];
const TOUR_ECO = [
  ['Identidad en las Sombras', 'Tu género declarado asigna una máscara y un alias para proteger tu identidad.'],
  ['Resonancia Dialéctica', 'La resonancia avanza con los mensajes y muestra afinidad de forma progresiva; tu identidad real permanece privada.'],
  ['Afinidad y Compatibilidad', 'Tus intereses ayudan a encontrar interlocutores con curiosidad y temas compartidos.'],
  ['Convivencia y Seguridad', 'Puedes citar, reaccionar y reportar una conducta inapropiada desde cualquier mensaje.'],
];

function adaptarConversacionEco(conversation, profileId) {
  const other = conversation.participants?.find((item) => item.profile.id !== profileId)?.profile;
  return {
    id: `server-${conversation.id}`,
    backendId: conversation.id,
    alias: other?.alias || 'Eco compatible',
    mascara: other?.mascara || '🎭',
    intereses: other?.interests || [],
    filosofia: '',
    resonancia: conversation.resonance || 0,
    compatibilidad: conversation.compatibility || 50,
    ultimoMensaje: conversation.messages?.at(-1)?.content || 'Nueva conversación compatible',
    horaUltimoMensaje: 'Ahora',
    mensajes: (conversation.messages || []).map((message) => ({
      id: message.id,
      remitente: message.authorProfileId === profileId ? 'propio' : 'eco',
      texto: message.content,
      hora: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      adjuntoUrl: message.attachmentUrl,
      cita: message.quotedMessage ? {
        id: message.quotedMessage.id,
        texto: message.quotedMessage.content,
        autor: message.quotedMessage.authorProfileId === profileId ? 'propio' : 'eco',
      } : null,
      reacciones: message.reactions?.reduce((items, reaction) => ({ ...items, [reaction.emoji]: (items[reaction.emoji] || 0) + 1 }), {}),
    })),
  };
}

export default function EcoPage({ currentUser, onBackToFeed }) {
  // Sincronización del tema oscuro/claro
  const [modoOscuro, setModoOscuro] = useState(() => {
    if (typeof window === 'undefined') return true;
    const guardado = localStorage.getItem('sofocles-theme');
    return guardado ? guardado === 'dark' : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', modoOscuro);
    localStorage.setItem('sofocles-theme', modoOscuro ? 'dark' : 'light');
  }, [modoOscuro]);

  // Identidad incógnita del propio usuario en Eco
  const [miIdentidad, setMiIdentidad] = useState(null);
  const [ecoProfile, setEcoProfile] = useState(null);
  const [cargandoEco, setCargandoEco] = useState(true);
  const [ecoError, setEcoError] = useState('');
  const [generoDeclarado, setGeneroDeclarado] = useState('');
  const [generoConfirmado, setGeneroConfirmado] = useState(false);
  const [creandoPerfil, setCreandoPerfil] = useState(false);
  const [guardandoIntereses, setGuardandoIntereses] = useState(false);

  const [interesesSeleccionados, setInteresesSeleccionados] = useState([]);
  const [pasoOnboarding, setPasoOnboarding] = useState(0);
  const [mostrarTour, setMostrarTour] = useState(false);
  const [fechaLimiteEdad, setFechaLimiteEdad] = useState(() => {
    return Date.now() + 86400000;
  });
  const [tiempoEdad, setTiempoEdad] = useState(() => Math.max(0, fechaLimiteEdad - Date.now()));
  const [documentoEdad, setDocumentoEdad] = useState(null);
  const [mostrarDocumento, setMostrarDocumento] = useState(false);
  const [respuestaActiva, setRespuestaActiva] = useState(null);
  const [adjunto, setAdjunto] = useState(null);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [reporteCategoria, setReporteCategoria] = useState(REPORTES_ECO[0][0]);
  const [reporteDetalles, setReporteDetalles] = useState('');
  const [reporteEstado, setReporteEstado] = useState('');
  const [revisionEcoAbierta, setRevisionEcoAbierta] = useState(false);
  const [documentosEcoPendientes, setDocumentosEcoPendientes] = useState([]);
  const [documentoEcoSeleccionado, setDocumentoEcoSeleccionado] = useState(null);
  const [documentoEcoImagen, setDocumentoEcoImagen] = useState('');
  const [procesandoRevisionEco, setProcesandoRevisionEco] = useState(false);
  const puedeRevisarEco = currentUser?.role === 'ADMIN' || ['JUNIOR', 'ADMIN'].includes(currentUser?.moderationRole);

  // Conversaciones / Chats activos
  const [chats, setChats] = useState([]);
  const [chatActivoId, setChatActivoId] = useState(null);
  const [busquedaEco, setBusquedaEco] = useState('');
  const chatActivo = chats.find((c) => c.id === chatActivoId) || chats[0];
  const chatsVisibles = chats.filter((chat) => {
    const termino = busquedaEco.trim().toLowerCase();
    if (!termino) return true;
    return `${chat.alias} ${chat.filosofia} ${(chat.intereses || []).join(' ')}`.toLowerCase().includes(termino);
  });
  const interesesGuardados = interesesEcoValidos(interesesSeleccionados)
    && ecoProfile?.interests?.length >= MIN_INTERESES_ECO
    && interesesSeleccionados.every((interes) => ecoProfile.interests.includes(interes));

  // Vista móvil / tablets ('chats' | 'sala' | 'espejo')
  const [vistaMovil, setVistaMovil] = useState('sala');

  // Input y estado de envío
  const [inputTexto, setInputTexto] = useState('');
  const scrollRef = useRef(null);
  const ecoInterfaceRef = useRef(null);
  const [seccionEco, setSeccionEco] = useState(null);
  const [menuEcoAbierto, setMenuEcoAbierto] = useState(false);

  const elegirSeccionEco = (seccion) => {
    setSeccionEco(seccion);
    setVistaMovil(seccion === 'progreso' ? 'espejo' : seccion === 'chats' ? 'sala' : 'chats');
    window.requestAnimationFrame(() => {
      ecoInterfaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const volverAlSelectorEco = () => {
    setSeccionEco(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const timer = window.setInterval(() => setTiempoEdad(Math.max(0, fechaLimiteEdad - Date.now())), 1000);
    return () => window.clearInterval(timer);
  }, [fechaLimiteEdad]);

  useEffect(() => {
    if (!currentUser) {
      setCargandoEco(false);
      return undefined;
    }
    setEcoProfile(null);
    setCargandoEco(true);
    setInteresesSeleccionados([]);
    setChats([]);
    setChatActivoId(null);
    setEcoError('');
    let activo = true;
    clienteAxios.get('/eco/profile')
      .then(({ data }) => {
        if (!activo) return;
        if (!data.profile) {
          setEcoProfile(null);
          setInteresesSeleccionados([]);
          setChats([]);
          setChatActivoId(null);
          return;
        }
        setEcoProfile(data.profile);
        setMiIdentidad({ alias: data.profile.alias, mascara: data.profile.mascara, genero: data.profile.genderDeclared });
        setInteresesSeleccionados(data.profile.interests || []);
        setFechaLimiteEdad(new Date(data.profile.ageVerificationDeadline).getTime());
        setTiempoEdad(Math.max(0, new Date(data.profile.ageVerificationDeadline).getTime() - Date.now()));
      })
      .catch((error) => {
        if (error.response?.status !== 404) setEcoError(error.response?.data?.error || 'No se pudo cargar el perfil Eco.');
      })
      .finally(() => { if (activo) setCargandoEco(false); });
    return () => { activo = false; };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!ecoProfile) return undefined;
    let activo = true;
    const consultarEstado = async () => {
      try {
        const { data } = await clienteAxios.get('/eco/verification/status');
        if (!activo || !data.profile) return;
        setEcoProfile(data.profile);
        const deadline = new Date(data.profile.ageVerificationDeadline).getTime();
        setFechaLimiteEdad(deadline);
        setTiempoEdad(Math.max(0, deadline - Date.now()));
      } catch (error) {
        if (activo && error.response?.status !== 401) setEcoError(error.response?.data?.error || 'No se pudo actualizar el estado de verificación.');
      }
    };
    const interval = window.setInterval(consultarEstado, 15000);
    return () => { activo = false; window.clearInterval(interval); };
  }, [ecoProfile?.id]);

  useEffect(() => {
    if (!ecoProfile || ecoProfile.interests.length < MIN_INTERESES_ECO || !ecoProfile.canChat) {
      setChats([]);
      setChatActivoId(null);
      return undefined;
    }
    let activo = true;
    const cargarConversaciones = async () => {
      try {
        const { data } = await clienteAxios.get('/eco/chats');
        if (!activo) return;
        const conversations = (data.conversations || []).map((conversation) => adaptarConversacionEco(conversation, ecoProfile.id));
        setChats(conversations);
        setChatActivoId((idActual) => conversations.some((chat) => chat.id === idActual) ? idActual : conversations[0]?.id || null);
      } catch (error) {
        if (!activo) return;
        if (error.response?.status === 403) {
          try {
            const { data } = await clienteAxios.get('/eco/profile');
            if (activo && data.profile) setEcoProfile(data.profile);
          } catch { /* El intervalo de estado de verificación mostrará el error. */ }
        } else {
          setEcoError(error.response?.data?.error || 'No se pudieron cargar tus conversaciones.');
        }
      }
    };
    cargarConversaciones();
    const interval = window.setInterval(cargarConversaciones, 4000);
    return () => { activo = false; window.clearInterval(interval); };
  }, [ecoProfile?.id, ecoProfile?.canChat, ecoProfile?.interests?.length]);

  // Auto-scroll en el chat activo
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatActivo?.mensajes]);

  const crearPerfilEco = async (event) => {
    event.preventDefault();
    if (!generoDeclarado || !generoConfirmado || creandoPerfil) return;
    setCreandoPerfil(true);
    setEcoError('');
    try {
      const { data } = await clienteAxios.post('/eco/profile', { genderDeclared: generoDeclarado, genderConfirmed: true });
      setEcoProfile(data.profile);
      setMiIdentidad({ alias: data.profile.alias, mascara: data.profile.mascara, genero: data.profile.genderDeclared });
      setInteresesSeleccionados([]);
      setChats([]);
      setChatActivoId(null);
      setFechaLimiteEdad(new Date(data.profile.ageVerificationDeadline).getTime());
      setTiempoEdad(Math.max(0, new Date(data.profile.ageVerificationDeadline).getTime() - Date.now()));
    } catch (error) {
      setEcoError(error.response?.data?.error || 'No se pudo crear tu perfil Eco.');
    } finally {
      setCreandoPerfil(false);
    }
  };

  const alternarInteres = async (interes) => {
    if (guardandoIntereses) return;
    const siguiente = interesesSeleccionados.includes(interes)
      ? interesesSeleccionados.filter((item) => item !== interes)
      : [...interesesSeleccionados, interes];
    // Durante el primer registro se debe poder llegar a seis. La restricción
    // solo aplica al quitar intereses cuando ya se alcanzó el mínimo.
    if (ecoProfile && interesesSeleccionados.length >= MIN_INTERESES_ECO && siguiente.length < MIN_INTERESES_ECO) {
      setEcoError(`Mantén al menos ${MIN_INTERESES_ECO} intereses seleccionados.`);
      return;
    }
    setInteresesSeleccionados(siguiente);
    if (!ecoProfile || siguiente.length < MIN_INTERESES_ECO) return;
    setEcoError('');
    setGuardandoIntereses(true);
    try {
      const { data } = await clienteAxios.put('/eco/profile/interests', { interests: siguiente });
      setInteresesSeleccionados(data.profile.interests);
      setEcoProfile(data.profile);
    } catch (error) {
      setEcoError(error.response?.data?.error || 'No se pudieron guardar tus intereses.');
    } finally {
      setGuardandoIntereses(false);
    }
  };

  const avanzarTourEco = async () => {
    if (pasoOnboarding < TOUR_ECO.length - 1) {
      setPasoOnboarding((paso) => paso + 1);
      return;
    }
    try {
      const { data } = await clienteAxios.post('/eco/profile/tour');
      setEcoProfile(data.profile);
      setMostrarTour(false);
    } catch (error) {
      setEcoError(error.response?.data?.error || 'No se pudo completar el recorrido de Eco.');
    }
  };

  const cargarDocumentosEco = async () => {
    try {
      const { data } = await clienteAxios.get('/eco/admin/age-documents');
      setDocumentosEcoPendientes(data.documents || []);
      setDocumentoEcoSeleccionado((actual) => data.documents?.some((documento) => documento.userId === actual?.userId) ? actual : data.documents?.[0] || null);
    } catch (error) {
      setEcoError(error.response?.data?.error || 'No se pudo cargar la cola de verificación.');
    }
  };

  const resolverRevisionEco = async (status) => {
    if (!documentoEcoSeleccionado || procesandoRevisionEco) return;
    setProcesandoRevisionEco(true);
    try {
      await clienteAxios.patch(`/eco/admin/profiles/${documentoEcoSeleccionado.userId}/age-status`, { status });
      setDocumentoEcoSeleccionado(null);
      setDocumentoEcoImagen('');
      await cargarDocumentosEco();
    } catch (error) {
      setEcoError(error.response?.data?.error || 'No se pudo guardar la decisión de moderación.');
    } finally {
      setProcesandoRevisionEco(false);
    }
  };

  useEffect(() => {
    if (!revisionEcoAbierta || !documentoEcoSeleccionado) {
      setDocumentoEcoImagen('');
      return undefined;
    }
    let activo = true;
    let url = '';
    clienteAxios.get(`/eco/admin/profiles/${documentoEcoSeleccionado.userId}/age-document`, { responseType: 'blob' })
      .then(({ data }) => {
        if (!activo) return;
        url = URL.createObjectURL(data);
        setDocumentoEcoImagen(url);
      })
      .catch((error) => setEcoError(error.response?.data?.error || 'No se pudo abrir el documento privado.'));
    return () => {
      activo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [revisionEcoAbierta, documentoEcoSeleccionado?.userId]);

  const leerArchivoComoDataUrl = (archivo) => new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });

  const manejarDocumento = async (event) => {
    const archivo = event.target.files?.[0];
    if (!archivo || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(archivo.type)) {
      setEcoError('El documento debe ser PNG, JPEG, WebP o GIF.');
      return;
    }
    if (archivo.size > 8 * 1024 * 1024) {
      setEcoError('El documento supera el límite de 8 MB.');
      return;
    }
    const preview = await leerArchivoComoDataUrl(archivo);
    setDocumentoEdad({ nombre: archivo.name, preview });
  };

  const manejarAdjunto = async (event) => {
    const archivo = event.target.files?.[0];
    if (!archivo || !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(archivo.type)) {
      setEcoError('El adjunto debe ser PNG, JPEG, WebP o GIF.');
      return;
    }
    if (archivo.size > 8 * 1024 * 1024) {
      setEcoError('El adjunto supera el límite de 8 MB.');
      return;
    }
    const preview = await leerArchivoComoDataUrl(archivo);
    setAdjunto({ nombre: archivo.name, preview, url: null, uploading: true });
    try {
      const { data } = await clienteAxios.post('/uploads/posts', { imageData: preview });
      setAdjunto((actual) => ({ ...actual, url: data.url, uploading: false }));
    } catch {
      setAdjunto(null);
    }
  };

  const alternarReaccion = async (mensajeId, reaccion) => {
    if (!chatActivo?.backendId) return;
    try {
      const { data } = await clienteAxios.post(`/eco/messages/${mensajeId}/reactions`, { emoji: reaccion });
      setChats((actuales) => actuales.map((chat) => chat.id !== chatActivo.id ? chat : {
        ...chat,
        mensajes: chat.mensajes.map((mensaje) => {
          if (mensaje.id !== mensajeId) return mensaje;
          const reacciones = { ...mensaje.reacciones };
          reacciones[reaccion] = Math.max(0, (reacciones[reaccion] || 0) + (data.active ? 1 : -1));
          return { ...mensaje, reacciones };
        }),
      }));
    } catch (error) {
      setEcoError(error.response?.data?.error || 'No se pudo guardar la reacción.');
    }
  };

  const enviarReporte = async (event) => {
    event.preventDefault();
    if (!chatActivo?.backendId) {
      setReporteEstado('Selecciona una conversación activa para enviar el reporte.');
      return;
    }
    try {
      await clienteAxios.post(`/eco/chats/${chatActivo.backendId}/report`, {
        category: reporteCategoria,
        details: reporteDetalles.trim() || undefined,
      });
      setReporteEstado('Reporte enviado al equipo de moderación.');
      setReporteDetalles('');
    } catch (error) {
      setReporteEstado(error.response?.data?.error || 'No se pudo enviar el reporte.');
    }
  };

  const enviarDocumentoEdad = async () => {
    if (!documentoEdad) return;
    try {
      const { data } = await clienteAxios.post('/eco/verification/document', { imageData: documentoEdad.preview });
      setEcoProfile(data.profile);
      setMostrarDocumento(false);
      setReporteEstado('Documento recibido para revisión.');
      setDocumentoEdad(null);
    } catch (error) {
      setEcoError(error.response?.data?.error || 'No se pudo enviar el documento.');
    }
  };

  // Enviar mensaje en el chat activo
  const manejarEnvio = async (e) => {
    if (e) e.preventDefault();
    const texto = inputTexto.trim();
    if ((!texto && !adjunto?.url) || adjunto?.uploading || !chatActivo?.backendId || !ecoProfile?.canChat) return;
    try {
      await clienteAxios.post(`/eco/chats/${chatActivo.backendId}/messages`, {
        content: texto,
        attachmentUrl: adjunto?.url || null,
        quotedMessageId: respuestaActiva?.id || null,
      });
      const { data } = await clienteAxios.get('/eco/chats');
      const conversations = (data.conversations || []).map((conversation) => adaptarConversacionEco(conversation, ecoProfile.id));
      setChats(conversations);
    } catch (error) {
      setEcoError(error.response?.data?.error || 'No se pudo enviar el mensaje.');
      return;
    }

    setInputTexto('');
    setRespuestaActiva(null);
    setAdjunto(null);

  };

  // Crear un nuevo chat / conectar con nuevo Eco
  const crearNuevoChat = async () => {
    if (!ecoProfile) return setEcoError('Primero crea tu perfil Eco.');
    setEcoError('');
    try {
      const { data } = await clienteAxios.post('/eco/chats/match');
      const nuevoChat = adaptarConversacionEco(data.conversation, ecoProfile.id);
      setChats((prev) => [nuevoChat, ...prev.filter((chat) => chat.id !== nuevoChat.id)]);
      setChatActivoId(nuevoChat.id);
      setVistaMovil('sala');
    } catch (error) {
      setEcoError(error.response?.data?.error || 'No hay un Eco compatible disponible todavía.');
    }
  };

  // Niveles de revelación del chat activo
  const res = chatActivo?.resonancia || 0;
  const nivel1 = res >= 25;
  const nivel2 = res >= 50;
  const nivel3 = res >= 75;
  const nivel4 = res >= 100;

  if (!currentUser) {
    return (
      <div className="Eco-Modal-Backdrop">
        <section className="Eco-Modal-Card" role="dialog" aria-modal="true">
          <h3>Acceso a Eco</h3>
          <p>Necesitas iniciar sesión en Sófocles para crear tu identidad incógnita y participar en conversaciones seguras.</p>
          <button type="button" className="Eco-Btn-Primario" onClick={() => { window.location.href = '/login'; }}>
            Iniciar sesión o registrarme
          </button>
          <button type="button" className="Eco-Btn-Secundario mt-3" onClick={onBackToFeed}>Volver</button>
        </section>
      </div>
    );
  }

  return (
    <div className={`Eco-Contenedor ${modoOscuro ? 'theme-dark' : ''} ${seccionEco ? `Eco-Contenedor--${seccionEco}` : 'Eco-Contenedor--selector'}`}>
      {/* Fondo místico estático del Olimpo */}
      <div className="Aura-Apolo-Cyan" />
      <div className="Aura-Afrodita-Magenta" />
      <div className="Red-Geometrica" />

      <header className="Eco-Header">
        <div className="Eco-Header__inner">
          <div className="Eco-Header__brand" onClick={onBackToFeed} title="Volver al Feed">
            <div className="Eco-Header__title-group">
              <span className="Eco-Header__title">Eco</span>
              <span className="Eco-Header__subtitle">Incógnito Dialéctico</span>
            </div>
          </div>
          <div className="Eco-Header__actions">
            {puedeRevisarEco && <button type="button" className="Eco-Btn-Secundario" onClick={async () => { setRevisionEcoAbierta(true); await cargarDocumentosEco(); }}>Revisar documentos</button>}
            <button type="button" className="Eco-Btn-Icon" onClick={() => setModoOscuro((actual) => !actual)} title="Cambiar tema">
              <img src={modoOscuro ? "/sun-svgrepo-com.svg" : "/cloud-moon-svgrepo-com.svg"} alt="" className="w-4 h-4 object-contain" />
            </button>
            <button
              type="button"
              className="Eco-Btn-Secundario"
              onClick={() => {
                if (onBackToFeed) onBackToFeed();
                else window.location.href = '/';
              }}
              title="Volver"
            >
              <span>Volver</span>
            </button>
          </div>
        </div>
      </header>

      {!seccionEco && <section className="Eco-Launchpad" aria-labelledby="eco-launchpad-title">
        <div className="Eco-Launchpad__hero">
          <div className="Eco-Launchpad__copy">
            <div className="Eco-Launchpad__eyebrow">UN ÁGORA PARA LA MENTE CURIOSA <span>✦</span></div>
            <h1 id="eco-launchpad-title">Habla<br /><em>sin el velo.</em><span>Encuentra tu eco.</span></h1>
            <p>Una identidad incógnita para conversar con libertad, descubrir nuevas miradas y dejar que las ideas hablen primero.</p>
            <div className="Eco-Launchpad__hint"><span>Haz clic en el isotipo</span><small>para abrir las rutas de Eco</small></div>
          </div>
          <div className={`Eco-Echo-Art ${menuEcoAbierto ? 'is-open' : ''}`}>
            <div className="Eco-Echo-Art__grain" />
            <div className="Eco-Echo-Art__orbit Eco-Echo-Art__orbit--one" />
            <div className="Eco-Echo-Art__orbit Eco-Echo-Art__orbit--two" />
            <div className="Eco-Echo-Art__quote">“La identidad<br /><strong>también se escucha.</strong>”</div>
            <div className="Eco-Echo-Art__note">ideas<br />en movimiento ↝</div>
            <button type="button" className="Eco-Echo-Art__isotipo" onClick={() => setMenuEcoAbierto((open) => !open)} aria-expanded={menuEcoAbierto} aria-label="Abrir opciones de Eco">
              <img src="/isotipoblancosimple-removebg-preview.png" alt="Abrir Eco" />
              <span>eco</span>
            </button>
            <div className="Eco-Echo-Art__instruction" aria-hidden="true">
              <strong>Haz clic en el isotipo</strong>
              <span>para abrir las funciones</span>
            </div>
            <button type="button" className="Eco-Echo-Art__option Eco-Echo-Art__option--chats" onClick={() => elegirSeccionEco('chats')}><b>◌</b><span>Chats</span><small>conversa</small></button>
            <button type="button" className="Eco-Echo-Art__option Eco-Echo-Art__option--search" onClick={() => elegirSeccionEco('busqueda')}><b>⌕</b><span>Búsqueda</span><small>descubre</small></button>
            <button type="button" className="Eco-Echo-Art__option Eco-Echo-Art__option--progress" onClick={() => elegirSeccionEco('progreso')}><b>✦</b><span>Progreso</span><small>revela</small></button>
          </div>
        </div>
        <div className="Eco-Launchpad__footer">
          <span>EL ÁGORA DE LO ANÓNIMO</span>
          <span className="Eco-Launchpad__line" />
          <span>Desliza para entrar</span>
        </div>
      </section>}

      {/* PESTAÑAS PARA MÓVILES Y PANTALLAS PEQUEÑAS */}
      <div className="Eco-Nav-Movil-Tabs">
        <button
          type="button"
          className={`Eco-Nav-Tab-Btn ${vistaMovil === 'chats' ? 'Activo' : ''}`}
          onClick={() => setVistaMovil('chats')}
        >
          <span>💬 Chats ({chats.length})</span>
        </button>
        <button
          type="button"
          className={`Eco-Nav-Tab-Btn ${vistaMovil === 'sala' ? 'Activo' : ''}`}
          onClick={() => setVistaMovil('sala')}
        >
          <span>🗨️ Sala</span>
        </button>
        <button
          type="button"
          className={`Eco-Nav-Tab-Btn ${vistaMovil === 'espejo' ? 'Activo' : ''}`}
          onClick={() => setVistaMovil('espejo')}
        >
          <span>🔍 Revelación ({res}%)</span>
        </button>
      </div>

      {/* LAYOUT DE 3 COLUMNAS QUE SE ADAPTA EXACTAMENTE A LA PANTALLA */}
      <main className="Eco-Main-3Col" ref={ecoInterfaceRef}>
        {seccionEco && (
          <button type="button" className="Eco-Back-To-Launchpad" onClick={volverAlSelectorEco} aria-label="Volver al selector de Eco" title="Volver arriba">
            ↑ <span>Elegir otra sección</span>
          </button>
        )}
        {/* =================================================================
            COLUMNA 1: LISTA DE CHATS ENTRE USUARIOS
            ================================================================= */}
        <aside
          className={`Eco-Panel-Chats ${
            vistaMovil === 'chats' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <div className="Eco-Chats__header">
            <h3 className="Eco-Chats__titulo">Ecos Activos</h3>
            <button
              type="button"
              className="Eco-Btn-NuevoChat"
              onClick={crearNuevoChat}
              title="Iniciar nuevo chat anónimo"
            >
              <span>+ Nuevo Eco</span>
            </button>
          </div>
          {seccionEco === 'busqueda' && (
            <label className="Eco-Busqueda">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={busquedaEco}
                onChange={(event) => setBusquedaEco(event.target.value)}
                placeholder="Busca un alias o interés..."
                aria-label="Buscar ecos"
              />
            </label>
          )}

          <div className="Eco-Chats__lista">
            {chatsVisibles.map((chat) => {
              const esActivo = chat.id === chatActivoId;
              return (
                <button
                  key={chat.id}
                  type="button"
                  className={`Eco-Chats__item ${esActivo ? 'Activo' : ''}`}
                  onClick={() => {
                    setChatActivoId(chat.id);
                    setVistaMovil('sala');
                  }}
                >
                  <div className="Eco-Chats__item-avatar">
                    {chat.mascara}
                  </div>
                  <div className="Eco-Chats__item-info">
                    <div className="Eco-Chats__item-top">
                      <h4 className="Eco-Chats__item-alias">
                        {chat.alias}
                      </h4>
                      <span className="Eco-Chats__item-hora">{chat.horaUltimoMensaje}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p className="Eco-Chats__item-ultimo-msg">{chat.ultimoMensaje}</p>
                      <span className="Eco-Chats__item-tag-res">{chat.resonancia}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {chatsVisibles.length === 0 && (
              <p className="Eco-Busqueda__empty">{seccionEco === 'busqueda' && busquedaEco ? 'No encontramos un eco con esa pista.' : 'Aún no tienes conversaciones. Busca un Eco compatible para empezar.'}</p>
            )}
          </div>
        </aside>

        {/* =================================================================
            COLUMNA 2: SALA DE CHAT (OCUPA EL ESPACIO CENTRAL HASTA ABAJO)
            ================================================================= */}
        <section
          className={`Eco-Panel-Chat ${
            vistaMovil === 'sala' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <FluidGlassCard
            as="div"
            className="Eco-Chat-Card Eco-Chat-Card--monocromo"
            mode="cube"
            thickness={5}
            chromaticAberration={0.05}
            interactive={false}
          >
            {/* Cabecera del chat activo */}
            <div className="Eco-Chat__header">
              <div className="Eco-Chat__header-info">
                <div className="Eco-Chat__header-avatar">
                  <span>{chatActivo?.mascara || miIdentidad?.mascara || '🎭'}</span>
                </div>
                <div className="Eco-Chat__header-meta">
                  <h4>{chatActivo?.alias || 'Elige un Eco para empezar'}</h4>
                  <p>
                    {chatActivo ? `Incógnito • Resonancia al ${res}%` : 'Tus conversaciones reales aparecerán aquí'}
                  </p>
                </div>
              </div>

              {/* Botón rápido para ver el espejo en resoluciones medianas */}
              <button
                type="button"
                className="Eco-Btn-Secundario xl:hidden"
                onClick={() => setVistaMovil('espejo')}
              >
                <span>Ver Espejo ({res}%)</span>
              </button>
              <button type="button" className="Eco-Btn-Reportar" disabled={!chatActivo?.backendId} onClick={() => setMostrarReporte(true)}>
                ⚑ Reportar
              </button>
            </div>

            {/* Historial de mensajes (Scroll interno exclusivo) */}
            <div className="Eco-Mensajes-Scroll" ref={scrollRef}>
              {!chatActivo && <div className="Eco-Busqueda__empty">Inicia una búsqueda para encontrar una conversación compatible. Eco no crea interlocutores de demostración.</div>}
              {chatActivo?.mensajes?.map((msg) => {
                if (msg.tipo === 'sistema') {
                  return (
                    <div key={msg.id} className="Eco-Hito-Sistema">
                      <span>{msg.texto}</span>
                    </div>
                  );
                }

                const esPropio = msg.remitente === 'propio';
                return (
                  <div
                    key={msg.id}
                    className={`Eco-Mensaje-Fila ${
                      esPropio ? 'Eco-Mensaje-Fila--propia' : 'Eco-Mensaje-Fila--ajena'
                    }`}
                  >
                    <div className="Eco-Mensaje-Avatar">
                      {esPropio ? (miIdentidad?.mascara || 'Tú') : (chatActivo?.mascara || '🎭')}
                    </div>
                    <div className="Eco-Burbuja">
                      {msg.cita && <div className="Eco-Cita-Dentro">{msg.cita.autor === 'propio' ? 'Tu mensaje' : 'Mensaje citado'}: {msg.cita.texto}</div>}
                      <p className="m-0">{msg.texto}</p>
                      {msg.adjuntoUrl && <img className="Eco-Mensaje-Adjunto-Img" src={msg.adjuntoUrl} alt="Adjunto del mensaje" />}
                      {msg.reacciones && <div className="Eco-Reacciones-Container">
                        {Object.entries(msg.reacciones).filter(([, count]) => count > 0).map(([reaccion, count]) => (
                          <button key={reaccion} type="button" className="Eco-Reaccion-Pill" onClick={() => alternarReaccion(msg.id, reaccion)}>{reaccion} {count}</button>
                        ))}
                      </div>}
                      <div className="Eco-Burbuja__meta">
                        <span>{msg.hora}</span>
                      </div>
                    </div>
                    <div className="Eco-Mensaje-Acciones">
                      <button type="button" className="Eco-Btn-Accion-Msg" onClick={() => setRespuestaActiva(msg)}>Responder</button>
                      {REACCIONES.map((reaccion) => <button key={reaccion} type="button" className="Eco-Btn-Accion-Msg" onClick={() => alternarReaccion(msg.id, reaccion)}>{reaccion}</button>)}
                    </div>
                  </div>
                );
              })}

            </div>

            {/* Formulario de entrada de mensaje */}
            <div className="Eco-Input-Area Eco-Input-Area--estatico">
              {respuestaActiva && <div className="Eco-Barra-Cita-Activa"><span>Respondiendo a: {respuestaActiva.texto}</span><button type="button" onClick={() => setRespuestaActiva(null)} aria-label="Cancelar respuesta">×</button></div>}
              {adjunto && <div className="Eco-Preview-Adjunto-Bar"><img src={adjunto.preview} alt="Vista previa del adjunto" /><span>{adjunto.uploading ? 'Subiendo...' : adjunto.nombre}</span><button type="button" onClick={() => setAdjunto(null)} aria-label="Quitar adjunto">×</button></div>}
              <form onSubmit={manejarEnvio} className="Eco-Formulario">
                <label className="Eco-Btn-Adjunto" title="Adjuntar imagen">
                  <span aria-hidden="true">📎</span>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={manejarAdjunto} />
                </label>
                <input
                  type="text"
                  className="Eco-Input-Text Eco-Input-Text--mono"
                  placeholder="Escribe tu mensaje en el anonimato..."
                  value={inputTexto}
                  onChange={(e) => setInputTexto(e.target.value)}
                  maxLength={500}
                  disabled={!chatActivo?.backendId || !ecoProfile?.canChat}
                />
                <button
                  type="submit"
                  className="Eco-Btn-Enviar Eco-Btn-Enviar--mono"
                  disabled={!chatActivo?.backendId || !ecoProfile?.canChat || (!inputTexto.trim() && !adjunto?.url) || adjunto?.uploading}
                  title="Enviar"
                >
                  <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </form>
            </div>
          </FluidGlassCard>
        </section>

        {/* =================================================================
            COLUMNA 3: EL ESPEJO DE ECO (REVELACIÓN PROGRESIVA)
            ================================================================= */}
        <aside
          className={`Eco-Panel-Espejo ${
            vistaMovil === 'espejo' ? 'flex' : 'hidden xl:flex'
          }`}
        >
          {chatActivo && (
            <>
              {/* Avatar y máscara */}
              <div className="Eco-Espejo__avatar-wrapper">
                <div className="Eco-Avatar-Contenedor">
                  <div className="Eco-Avatar-Mascara"><span className="text-2xl">{chatActivo.mascara}</span></div>
                </div>

                <h3 className="Eco-Espejo__alias">{chatActivo.alias}</h3>
                <span className="Eco-Espejo__status">
                  En incógnito
                </span>
                <div className="Eco-Espejo__acciones">
                  <button type="button" className="Eco-Btn-Secundario" onClick={() => setVistaMovil('sala')}>Seguir conversando</button>
                </div>
              </div>

              {/* Medidor de Resonancia */}
              <div className="Eco-Resonancia-Seccion">
                <div className="Eco-Resonancia-Header">
                  <span className="Eco-Resonancia-Titulo">Resonancia</span>
                  <span className="Eco-Resonancia-Porcentaje">{res}%</span>
                </div>
                <div className="Eco-Barra-Pista">
                  <div className="Eco-Barra-Relleno" style={{ width: `${res}%` }} />
                </div>
                <p className="Eco-Barra-Hint">
                  {nivel4
                    ? '100% alcanzado'
                    : 'Dialoga más para desbloquear las fichas'}
                </p>
              </div>

              {/* Fichas de información */}
              <div className="Eco-Fichas-Lista">
                {/* 25% */}
                <div className={`Eco-Ficha ${nivel1 ? 'Desbloqueada' : ''}`}>
                  <div className="Eco-Ficha__header">
                    <span className="Eco-Ficha__label">Intereses</span>
                    <span className="Eco-Ficha__nivel-tag">25%</span>
                  </div>
                  <div className="Eco-Ficha__contenido">
                    {nivel1 ? (
                      <div className="Eco-Tags-Lista">
                        {chatActivo.intereses?.map((tag) => (
                          <span key={tag} className="Eco-Tag-Item">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="Eco-Ficha__bloqueado">
                        <span>🔒</span>
                        <span>Se devela con 25%</span>
                        <span className="Eco-Ficha__blur-text">#Etica #Poesia</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 50% */}
                <div className={`Eco-Ficha ${nivel2 ? 'Desbloqueada' : ''}`}>
                  <div className="Eco-Ficha__header">
                      <span className="Eco-Ficha__label">Afinidad</span>
                    <span className="Eco-Ficha__nivel-tag">50%</span>
                  </div>
                  <div className="Eco-Ficha__contenido">
                    {nivel2 ? (
                      <div>
                        <p className="italic mb-1">La conversación comparte intereses y compatibilidad dialéctica.</p>
                        <span className="text-[10px] text-stone-400 block">Intereses en común: {chatActivo.intereses?.length || 0}</span>
                      </div>
                    ) : (
                      <div className="Eco-Ficha__bloqueado">
                        <span>🔒</span>
                        <span>Se devela con 50%</span>
                        <span className="Eco-Ficha__blur-text">Filosofía oculta...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 75% */}
                <div className={`Eco-Ficha ${nivel3 ? 'Desbloqueada' : ''}`}>
                  <div className="Eco-Ficha__header">
                      <span className="Eco-Ficha__label">Compatibilidad</span>
                    <span className="Eco-Ficha__nivel-tag">75%</span>
                  </div>
                  <div className="Eco-Ficha__contenido">
                    {nivel3 ? (
                      <span className="text-amber-400 font-semibold">{chatActivo.compatibilidad}%</span>
                    ) : (
                      <div className="Eco-Ficha__bloqueado">
                        <span>🔒</span>
                        <span>Se devela con 75%</span>
                        <span className="Eco-Ficha__blur-text">Rango oculto</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 100% */}
                <div className={`Eco-Ficha ${nivel4 ? 'Desbloqueada' : ''}`}>
                  <div className="Eco-Ficha__header">
                      <span className="Eco-Ficha__label">Anonimato</span>
                    <span className="Eco-Ficha__nivel-tag">100%</span>
                  </div>
                  <div className="Eco-Ficha__contenido">
                    {nivel4 ? (
                      <p className="font-bold text-emerald-400 text-sm mb-1">La identidad real permanece privada.</p>
                    ) : (
                      <div className="Eco-Ficha__bloqueado">
                        <span>🔒</span>
                        <span>Se devela al 100%</span>
                        <span className="Eco-Ficha__blur-text">@identidad</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </>
          )}
        </aside>
      </main>

      {!cargandoEco && !ecoProfile && (
        <div className="Eco-Modal-Backdrop">
          <section className="Eco-Modal-Card" role="dialog" aria-modal="true" aria-labelledby="eco-profile-title">
            <h3 id="eco-profile-title">Crea tu identidad Eco</h3>
            <p>Elige el género que declaras para generar un alias incógnito. Esta elección se guarda en tu perfil Eco y no aparece en el chat.</p>
            <form onSubmit={crearPerfilEco} className="Eco-Reporte-Form">
              <label>Género declarado
                <select value={generoDeclarado} onChange={(event) => setGeneroDeclarado(event.target.value)} required>
                  <option value="">Selecciona una opción</option>
                  <option value="femenino">Femenino</option>
                  <option value="masculino">Masculino</option>
                  <option value="neutro">Neutro</option>
                </select>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={generoConfirmado} onChange={(event) => setGeneroConfirmado(event.target.checked)} required />
                <span>Confirmo formalmente que el género que declaré es correcto.</span>
              </label>
              <button type="submit" className="Eco-Btn-Primario" disabled={!generoDeclarado || !generoConfirmado || creandoPerfil}>
                {creandoPerfil ? 'Creando perfil…' : 'Crear perfil Eco'}
              </button>
            </form>
          </section>
        </div>
      )}

      {!cargandoEco && ecoProfile && (!ecoProfile.tourCompleted || !interesesEcoValidos(interesesSeleccionados)) && !mostrarTour && (
        <div className="Eco-Modal-Backdrop">
          <section className="Eco-Modal-Card" role="dialog" aria-modal="true" aria-labelledby="eco-intereses-title">
            <h3 id="eco-intereses-title">Encuentra tu resonancia</h3>
            <p>Selecciona al menos seis intereses para mejorar la afinidad de tus conversaciones. {interesesSeleccionados.length} de {MIN_INTERESES_ECO} seleccionados.</p>
            <div className="Eco-Intereses-Grid">
              {TOPICOS_INTERESES.map((interes) => (
                <button key={interes.id} type="button" disabled={guardandoIntereses} className={`Eco-Interes-Chip ${interesesSeleccionados.includes(interes.id) ? 'Seleccionado' : ''}`} onClick={() => alternarInteres(interes.id)}>
                  <span>{interes.icono}</span><span>{interes.label}</span>
                </button>
              ))}
            </div>
            <button type="button" className="Eco-Btn-Primario" disabled={!interesesGuardados || guardandoIntereses} onClick={() => { setPasoOnboarding(0); setMostrarTour(true); }}>{guardandoIntereses ? 'Guardando…' : 'Continuar'}</button>
          </section>
        </div>
      )}

      {mostrarTour && (
        <div className="Eco-Modal-Backdrop">
          <section className="Eco-Modal-Card" role="dialog" aria-modal="true" aria-labelledby="eco-tour-title">
            <div className="Eco-Tour-Pasos">{TOUR_ECO.map((_, index) => <span key={index} className={`Eco-Tour-Dot ${pasoOnboarding === index ? 'Activo' : ''}`} />)}</div>
            <h3 id="eco-tour-title">{TOUR_ECO[pasoOnboarding][0]}</h3>
            <p>{TOUR_ECO[pasoOnboarding][1]}</p>
            <div className="flex justify-center gap-2">
              {pasoOnboarding > 0 && <button type="button" className="Eco-Btn-Secundario" onClick={() => setPasoOnboarding((paso) => paso - 1)}>Anterior</button>}
              <button type="button" className="Eco-Btn-Primario" onClick={avanzarTourEco}>
                {pasoOnboarding === TOUR_ECO.length - 1 ? 'Entrar a Eco' : 'Siguiente'}
              </button>
            </div>
          </section>
        </div>
      )}

      {!seccionEco && ecoProfile && ecoProfile.ageStatus !== 'VERIFIED' && <div className="Eco-Banner-Verificacion">
        <div className="Eco-Banner-Verificacion__info">
          <span>{ecoProfile.ageStatus === 'SUBMITTED' ? 'Documento recibido; está pendiente de revisión.' : ecoProfile.ageStatus === 'EXPIRED' ? 'El plazo de verificación venció. Completa la revisión para volver a chatear.' : ecoProfile.ageStatus === 'REJECTED' ? 'El documento no fue aceptado. Envía una imagen nueva para revisión.' : 'Tienes 24 horas desde que creaste tu perfil para enviar tu documento de identidad.'}</span>
          {ecoProfile.ageStatus !== 'SUBMITTED' && <strong className="Eco-Banner-Verificacion__timer">{String(Math.floor(tiempoEdad / 3600000)).padStart(2, '0')}:{String(Math.floor((tiempoEdad % 3600000) / 60000)).padStart(2, '0')}:{String(Math.floor((tiempoEdad % 60000) / 1000)).padStart(2, '0')}</strong>}
        </div>
        {ecoProfile.ageStatus !== 'SUBMITTED' && <button type="button" className="Eco-Btn-VerificarAhora" onClick={() => setMostrarDocumento(true)}>{ecoProfile.ageStatus === 'EXPIRED' || ecoProfile.ageStatus === 'REJECTED' ? 'Enviar documento' : 'Verificar ahora'}</button>}
      </div>}

      {ecoError && <div className="Eco-Toast-Error" role="status">{ecoError}</div>}
      {revisionEcoAbierta && puedeRevisarEco && <div className="Eco-Modal-Backdrop">
        <section className="Eco-Modal-Card Eco-Moderacion-Modal" role="dialog" aria-modal="true" aria-labelledby="eco-review-title">
          <div className="flex items-center justify-between gap-3">
            <h3 id="eco-review-title">Verificación de edad</h3>
            <button type="button" className="Eco-Btn-Secundario" onClick={() => setRevisionEcoAbierta(false)}>Cerrar</button>
          </div>
          <p>Los documentos se cargan desde almacenamiento privado y solo están disponibles para moderadores.</p>
          <div className="Eco-Moderacion-Contenido">
            <div className="Eco-Moderacion-Cola">
              {documentosEcoPendientes.length === 0 && <p className="Eco-Busqueda__empty">No hay documentos pendientes.</p>}
              {documentosEcoPendientes.map((documento) => <button key={documento.userId} type="button" className={`Eco-Moderacion-Item ${documentoEcoSeleccionado?.userId === documento.userId ? 'Activo' : ''}`} onClick={() => setDocumentoEcoSeleccionado(documento)}>
                <strong>{documento.alias}</strong><span>{documento.ageStatus}</span>
              </button>)}
            </div>
            <div className="Eco-Moderacion-Documento">
              {documentoEcoImagen ? <img src={documentoEcoImagen} alt={`Documento enviado por ${documentoEcoSeleccionado?.alias || 'el usuario'}`} /> : <p>{documentoEcoSeleccionado ? 'Cargando documento…' : 'Selecciona un documento para revisarlo.'}</p>}
            </div>
          </div>
          {documentoEcoSeleccionado && <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="Eco-Btn-Secundario" disabled={procesandoRevisionEco} onClick={() => resolverRevisionEco('REJECTED')}>Rechazar</button>
            <button type="button" className="Eco-Btn-Primario" disabled={procesandoRevisionEco || !documentoEcoImagen} onClick={() => resolverRevisionEco('VERIFIED')}>{procesandoRevisionEco ? 'Guardando…' : 'Aprobar'}</button>
          </div>}
        </section>
      </div>}
      {mostrarDocumento && <div className="Eco-Modal-Backdrop"><section className="Eco-Modal-Card" role="dialog" aria-modal="true"><h3>Documento de identidad</h3><p>La imagen se prepara para el endpoint seguro de moderación. No compartas documentos por el chat.</p><label className="Eco-Dropzone-Doc"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={manejarDocumento} />{documentoEdad ? <img src={documentoEdad.preview} alt="Vista previa del documento" /> : <><span className="text-2xl">▣</span><span>Seleccionar fotografía</span></>}</label><div className="flex justify-center gap-2"><button type="button" className="Eco-Btn-Secundario" onClick={() => setMostrarDocumento(false)}>Cerrar</button><button type="button" className="Eco-Btn-Primario" disabled={!documentoEdad} onClick={enviarDocumentoEdad}>Enviar a moderación</button></div></section></div>}

      {mostrarReporte && <div className="Eco-Modal-Backdrop"><section className="Eco-Modal-Card" role="dialog" aria-modal="true"><h3>Reportar conducta</h3><form className="Eco-Reporte-Form" onSubmit={enviarReporte}><label>Motivo<select value={reporteCategoria} onChange={(event) => setReporteCategoria(event.target.value)}>{REPORTES_ECO.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Detalles<textarea value={reporteDetalles} onChange={(event) => setReporteDetalles(event.target.value)} maxLength={1000} placeholder="Describe brevemente lo ocurrido" /></label>{reporteEstado && <p>{reporteEstado}</p>}<div className="flex justify-end gap-2"><button type="button" className="Eco-Btn-Secundario" onClick={() => setMostrarReporte(false)}>Cerrar</button><button type="submit" className="Eco-Btn-Primario">Enviar reporte</button></div></form></section></div>}


    </div>
  );
}
