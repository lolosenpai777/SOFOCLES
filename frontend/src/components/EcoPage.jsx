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
  ['Identidad en las Sombras', 'Tu género verificado asigna una máscara y un alias histórico para proteger tu identidad.'],
  ['Resonancia Dialéctica', 'La identidad se revela progresivamente al alcanzar 25%, 50%, 75% y 100% de resonancia.'],
  ['Afinidad y Compatibilidad', 'Tus intereses ayudan a encontrar interlocutores con curiosidad y temas compartidos.'],
  ['Convivencia y Seguridad', 'Puedes citar, reaccionar y reportar una conducta inapropiada desde cualquier mensaje.'],
];

// Base de chats iniciales entre usuarios incógnitos
const CHATS_INICIALES = [
  {
    id: 'chat-1',
    alias: 'Voz del Ágora',
    mascara: '🎭',
    filosofia: 'Busco la concordia en las contradicciones. La dialéctica es mi brújula.',
    intereses: ['#Filosofia', '#Etica', '#Poesia', '#Tragedia'],
    antiguedad: 'Cofundador del Olimpo • Ciclo II',
    reputacion: 'Pensador de Élite',
    usernameReal: 'hipatia_atenea',
    avatarReal: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    resonancia: 35,
    ultimoMensaje: 'Hay algo liberador en hablar sin el peso de las apariencias.',
    horaUltimoMensaje: '10:42',
    mensajes: [
      {
        id: 'msg-1-1',
        tipo: 'sistema',
        texto: '✦ Has entrado al Eco. Dos identidades veladas se encuentran en el Olimpo.'
      },
      {
        id: 'msg-1-2',
        remitente: 'eco',
        texto: 'Saludos, alma del Olimpo. ¿De qué idea te gustaría hablar hoy en este rincón sin juicios?',
        hora: '10:40'
      },
      {
        id: 'msg-1-3',
        remitente: 'propio',
        texto: 'Me fascina dialogar en el anonimato, las ideas pesan más que los títulos.',
        hora: '10:41'
      },
      {
        id: 'msg-1-4',
        remitente: 'eco',
        texto: 'Hay algo liberador en hablar sin el peso de las apariencias.',
        hora: '10:42'
      }
    ],
    respuestas: [
      'Sócrates decía que la dialéctica ilumina lo que el orgullo oculta.',
      'Siento que nuestras reflexiones resuenan en un plano muy cercano.',
      'Las mejores conversaciones son aquellas que dejan preguntas más altas que las respuestas.',
      '¡La resonancia es total! El velo ha caído por completo entre nosotros.'
    ]
  },
  {
    id: 'chat-2',
    alias: 'Caravaggio en Claroscuro',
    mascara: '🎨',
    filosofia: 'El contraste entre luz y sombra revela la auténtica belleza humana.',
    intereses: ['#Pintura', '#Estetica', '#HistoriaDelArte', '#Pasiones'],
    antiguedad: 'Artesano del Olimpo • Ciclo III',
    reputacion: 'Maestro del Lienzo',
    usernameReal: 'michelangelo_merisi',
    avatarReal: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    resonancia: 15,
    ultimoMensaje: '¿Prefieres la calma del mármol o la fuerza de la tormenta?',
    horaUltimoMensaje: 'Ayer',
    mensajes: [
      {
        id: 'msg-2-1',
        tipo: 'sistema',
        texto: '✦ Conexión establecida con una mente artística en la penumbra.'
      },
      {
        id: 'msg-2-2',
        remitente: 'eco',
        texto: '¿Prefieres la calma del mármol o la fuerza de la tormenta?',
        hora: 'Ayer'
      }
    ],
    respuestas: [
      'Pocos se atreven a mirar las sombras sin pestañear. Me agrada tu franqueza.',
      'El arte no es decorar el mundo, es desentrañar sus misterios ocultos.',
      'A través de tus palabras casi puedo pintar los rasgos de tu pensamiento.',
      '¡Teofanía alcanzada! Es un gozo conocer a la mente detrás del lienzo.'
    ]
  },
  {
    id: 'chat-3',
    alias: 'Arquitecta del Porvenir',
    mascara: '📐',
    filosofia: 'El espacio no se divide en muros, sino en flujos de libertad.',
    intereses: ['#Arquitectura', '#Geometria', '#Futuro', '#Estructuras'],
    antiguedad: 'Constructora • Ciclo I',
    reputacion: 'Arquitecta Suprema',
    usernameReal: 'zaha_vanguardia',
    avatarReal: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    resonancia: 60,
    ultimoMensaje: 'Las ciudades ideales nacen primero en conversaciones como esta.',
    horaUltimoMensaje: '11:15',
    mensajes: [
      {
        id: 'msg-3-1',
        tipo: 'sistema',
        texto: '✦ Resonancia avanzada al 60%. Filosofía y reputación desbloqueadas.'
      },
      {
        id: 'msg-3-2',
        remitente: 'eco',
        texto: 'Las ciudades ideales nacen primero en conversaciones como esta.',
        hora: '11:15'
      }
    ],
    respuestas: [
      'Las curvas y la fluidez desafían la rigidez del pensamiento tradicional.',
      'Estamos a un solo paso de que conozcas quién diseña estas ideas contigo.',
      '¡El proyecto está completo! Bienvenido a la luz de la verdad.'
    ]
  }
];

function adaptarConversacionEco(conversation, profileId) {
  const other = conversation.participants?.find((item) => item.profile.id !== profileId)?.profile;
  return {
    id: `server-${conversation.id}`,
    backendId: conversation.id,
    alias: other?.alias || 'Eco compatible',
    mascara: other?.mascara || '🎭',
    intereses: other?.interests || [],
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
      cita: message.quotedMessage ? { texto: message.quotedMessage.content, autor: 'eco' } : null,
      reacciones: message.reactions?.reduce((items, reaction) => ({ ...items, [reaction.emoji]: (items[reaction.emoji] || 0) + 1 }), {}),
    })),
    respuestas: [],
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
  const [miIdentidad, setMiIdentidad] = useState(() => {
    if (typeof window === 'undefined') return null;
    const guardada = localStorage.getItem('sofocles_eco_identity');
    return guardada ? JSON.parse(guardada) : null;
  });
  const [ecoProfile, setEcoProfile] = useState(null);
  const [cargandoEco, setCargandoEco] = useState(true);
  const [ecoError, setEcoError] = useState('');

  // Modal de bienvenida / selección de género si es primera visita
  const [mostrarModalGenero, setMostrarModalGenero] = useState(true);
  const [generoSeleccionado, setGeneroSeleccionado] = useState('masculino');
  const [aceptoGenero, setAceptoGenero] = useState(false);
  const [interesesSeleccionados, setInteresesSeleccionados] = useState(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('sofocles_eco_interests') || '[]'); } catch { return []; }
  });
  const [pasoOnboarding, setPasoOnboarding] = useState(0);
  const [mostrarTour, setMostrarTour] = useState(false);
  const [fechaLimiteEdad, setFechaLimiteEdad] = useState(() => {
    if (typeof window === 'undefined') return Date.now() + 86400000;
    const guardada = Number(localStorage.getItem('sofocles_eco_age_deadline'));
    if (guardada && guardada > Date.now()) return guardada;
    const limite = Date.now() + 86400000;
    localStorage.setItem('sofocles_eco_age_deadline', String(limite));
    return limite;
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

  // Conversaciones / Chats activos
  const [chats, setChats] = useState(CHATS_INICIALES);
  const [chatActivoId, setChatActivoId] = useState('chat-1');
  const chatActivo = chats.find((c) => c.id === chatActivoId) || chats[0];

  // Vista móvil / tablets ('chats' | 'sala' | 'espejo')
  const [vistaMovil, setVistaMovil] = useState('sala');

  // Input y estado de envío
  const [inputTexto, setInputTexto] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const [mostrarTeofania, setMostrarTeofania] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => setTiempoEdad(Math.max(0, fechaLimiteEdad - Date.now())), 1000);
    return () => window.clearInterval(timer);
  }, [fechaLimiteEdad]);

  useEffect(() => {
    let activo = true;
    clienteAxios.get('/eco/profile')
      .then(({ data }) => {
        if (!activo || !data.profile) return;
        setEcoProfile(data.profile);
        setMiIdentidad({ alias: data.profile.alias, mascara: data.profile.mascara, genero: data.profile.genderDeclared });
        setInteresesSeleccionados(data.profile.interests || []);
        setFechaLimiteEdad(new Date(data.profile.ageVerificationDeadline).getTime());
        setMostrarModalGenero(false);
      })
      .catch((error) => {
        if (error.response?.status !== 404) setEcoError(error.response?.data?.error || 'No se pudo cargar el perfil Eco.');
      })
      .finally(() => { if (activo) setCargandoEco(false); });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!ecoProfile || ecoProfile.interests.length < MIN_INTERESES_ECO) return;
    clienteAxios.get('/eco/chats')
      .then(({ data }) => {
        const conversations = (data.conversations || []).map((conversation) => adaptarConversacionEco(conversation, ecoProfile.id));
        if (conversations.length) {
          setChats(conversations);
          setChatActivoId(conversations[0].id);
        }
      })
      .catch((error) => setEcoError(error.response?.data?.error || 'No se pudieron cargar tus conversaciones.'));
  }, [ecoProfile]);

  // Auto-scroll en el chat activo
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatActivo?.mensajes, escribiendo]);

  // Manejo de selección de género y asignación de nombre incógnito
  const confirmarGeneroIdentidad = async () => {
    try {
      const { data } = await clienteAxios.post('/eco/profile', { genderDeclared: generoSeleccionado, genderConfirmed: true });
      const profile = data.profile;
      setEcoProfile(profile);
      setMiIdentidad({ alias: profile.alias, mascara: profile.mascara, genero: profile.genderDeclared });
      setFechaLimiteEdad(new Date(profile.ageVerificationDeadline).getTime());
      setMostrarModalGenero(false);
    } catch (error) {
      setEcoError(error.response?.data?.error || 'No se pudo crear tu perfil Eco.');
    }
  };

  const alternarInteres = (interes) => {
    setInteresesSeleccionados((actuales) => {
      const siguiente = actuales.includes(interes)
        ? actuales.filter((item) => item !== interes)
        : [...actuales, interes];
      localStorage.setItem('sofocles_eco_interests', JSON.stringify(siguiente));
      if (siguiente.length >= MIN_INTERESES_ECO && ecoProfile) {
        clienteAxios.put('/eco/profile/interests', { interests: siguiente })
          .then(({ data }) => setEcoProfile(data.profile))
          .catch((error) => setEcoError(error.response?.data?.error || 'No se pudieron guardar tus intereses.'));
      }
      return siguiente;
    });
  };

  const leerArchivoComoDataUrl = (archivo) => new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = reject;
    lector.readAsDataURL(archivo);
  });

  const manejarDocumento = async (event) => {
    const archivo = event.target.files?.[0];
    if (!archivo || !archivo.type.startsWith('image/')) return;
    const preview = await leerArchivoComoDataUrl(archivo);
    setDocumentoEdad({ nombre: archivo.name, preview });
  };

  const manejarAdjunto = async (event) => {
    const archivo = event.target.files?.[0];
    if (!archivo || !archivo.type.startsWith('image/')) return;
    const preview = await leerArchivoComoDataUrl(archivo);
    setAdjunto({ nombre: archivo.name, preview, url: null, uploading: true });
    try {
      const { data } = await clienteAxios.post('/uploads/posts', { imageData: preview });
      setAdjunto((actual) => ({ ...actual, url: data.url, uploading: false }));
    } catch {
      setAdjunto(null);
    }
  };

  const alternarReaccion = (mensajeId, reaccion) => {
    setChats((actuales) => actuales.map((chat) => chat.id !== chatActivo.id ? chat : {
      ...chat,
      mensajes: chat.mensajes.map((mensaje) => {
        if (mensaje.id !== mensajeId) return mensaje;
        const reacciones = { ...mensaje.reacciones };
        reacciones[reaccion] = reacciones[reaccion] ? 0 : 1;
        return { ...mensaje, reacciones };
      }),
    }));
  };

  const enviarReporte = async (event) => {
    event.preventDefault();
    if (!chatActivo?.reportedUserId) {
      setReporteEstado('Esta conversación aún no tiene un identificador de usuario verificable.');
      return;
    }
    try {
      await clienteAxios.post('/reports', {
        userId: chatActivo.reportedUserId,
        category: reporteCategoria,
        details: reporteDetalles.trim() || undefined,
      });
      setReporteEstado('Reporte enviado al equipo de moderación.');
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
    } catch (error) {
      setEcoError(error.response?.data?.error || 'No se pudo enviar el documento.');
    }
  };

  // Enviar mensaje en el chat activo
  const manejarEnvio = async (e) => {
    if (e) e.preventDefault();
    const texto = inputTexto.trim();
    if ((!texto && !adjunto?.url) || adjunto?.uploading || escribiendo || !chatActivo) return;

    const ahora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nuevoMsgPropio = {
      id: `usr-${Date.now()}`,
      remitente: 'propio',
      texto,
      hora: ahora,
      cita: respuestaActiva ? { texto: respuestaActiva.texto, autor: respuestaActiva.remitente } : null,
      adjuntoUrl: adjunto?.url || null,
    };

    if (chatActivo.backendId) {
      try {
        await clienteAxios.post(`/eco/chats/${chatActivo.backendId}/messages`, {
          content: texto,
          attachmentUrl: adjunto?.url || null,
          quotedMessageId: respuestaActiva?.id || null,
        });
      } catch (error) {
        setEcoError(error.response?.data?.error || 'No se pudo enviar el mensaje.');
        return;
      }
    }

    const nuevaResonancia = Math.min(100, (chatActivo.resonancia || 0) + 20);
    const cruzado100 = nuevaResonancia >= 100 && chatActivo.resonancia < 100;

    // Actualizar conversación
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatActivo.id) return c;
        return {
          ...c,
          resonancia: nuevaResonancia,
          ultimoMensaje: texto,
          horaUltimoMensaje: ahora,
          mensajes: [...c.mensajes, nuevoMsgPropio]
        };
      })
    );

    setInputTexto('');
    setRespuestaActiva(null);
    setAdjunto(null);

    if (cruzado100) {
      setTimeout(() => setMostrarTeofania(true), 600);
    }

    // Respuesta del interlocutor anónimo tras breve pausa dialéctica
    setEscribiendo(true);
    setTimeout(() => {
      setEscribiendo(false);
      const respuestasPool = chatActivo.respuestas || [];
      const respuestaTexto =
        respuestasPool[Math.floor(Math.random() * respuestasPool.length)] ||
        'La claridad de tu pensamiento enriquece este diálogo.';

      const msgEco = {
        id: `eco-${Date.now()}`,
        remitente: 'eco',
        texto: respuestaTexto,
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatActivo.id) return c;
          return {
            ...c,
            ultimoMensaje: respuestaTexto,
            horaUltimoMensaje: msgEco.hora,
            mensajes: [...c.mensajes, msgEco]
          };
        })
      );
    }, 1200);
  };

  // Crear un nuevo chat / conectar con nuevo Eco
  const crearNuevoChat = async () => {
    if (ecoProfile) {
      try {
        const { data } = await clienteAxios.post('/eco/chats/match');
        const nuevoChat = adaptarConversacionEco(data.conversation, ecoProfile.id);
        setChats((prev) => [nuevoChat, ...prev.filter((chat) => chat.id !== nuevoChat.id)]);
        setChatActivoId(nuevoChat.id);
        setVistaMovil('sala');
        return;
      } catch (error) {
        setEcoError(error.response?.data?.error || 'No hay un Eco compatible disponible todavía.');
      }
    }
    const identidadesNuevas = [
      {
        alias: 'Platón de la Academia',
        mascara: '📜',
        filosofia: 'El mundo sensible es solo un pálido reflejo de las ideas eternas.',
        intereses: ['#Metafisica', '#Dialogos', '#MitoDeLaCaverna'],
        antiguedad: 'Filósofo Primordial • Ciclo I',
        reputacion: 'Maestro de la Dialéctica',
        usernameReal: 'platon_filosofo',
        avatarReal: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80'
      },
      {
        alias: 'Artemisia en el Taller',
        mascara: '🎨',
        filosofia: 'Pinto con la vehemencia de quien defiende su propia alma.',
        intereses: ['#Claroscuro', '#PinturaBarroca', '#Fortaleza'],
        antiguedad: 'Pintora Distinguida • Ciclo II',
        reputacion: 'Genio de la Luz',
        usernameReal: 'artemisia_g',
        avatarReal: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80'
      }
    ];

    const pick = identidadesNuevas[Math.floor(Math.random() * identidadesNuevas.length)];
    const nuevoId = `chat-${Date.now()}`;
    const nuevoChat = {
      id: nuevoId,
      ...pick,
      resonancia: 15,
      ultimoMensaje: 'Saludos, un nuevo eco se abre paso en la penumbra.',
      horaUltimoMensaje: 'Ahora',
      mensajes: [
        {
          id: `sys-${Date.now()}`,
          tipo: 'sistema',
          texto: '✦ Te has conectado con un nuevo Eco en el Olimpo.'
        },
        {
          id: `eco-${Date.now()}`,
          remitente: 'eco',
          texto: 'Saludos, un nuevo eco se abre paso en la penumbra. ¿Qué tema deseas explorar?',
          hora: 'Ahora'
        }
      ],
      respuestas: [
        'Un pensamiento digno de ser esculpido en piedra.',
        'En la contradicción dialéctica surge la verdadera luz.',
        'Nuestras ideas se van entrelazando con naturalidad.'
      ]
    };

    setChats((prev) => [nuevoChat, ...prev]);
    setChatActivoId(nuevoId);
    setVistaMovil('sala');
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
    <div className={`Eco-Contenedor ${modoOscuro ? 'theme-dark' : ''}`}>
      {/* Fondo místico estático del Olimpo */}
      <div className="Aura-Apolo-Cyan" />
      <div className="Aura-Afrodita-Magenta" />
      <div className="Red-Geometrica" />

      {/* HEADER COMPACTO (60px) */}
      <header className="Eco-Header">
        <div className="Eco-Header__inner">
          <div className="Eco-Header__brand" onClick={onBackToFeed} title="Volver al Feed">
            <img src="/logosofo.png" alt="Sófocles" className="Eco-Header__logo" />
            <div className="Eco-Header__title-group">
              <span className="Eco-Header__title">Eco</span>
              <span className="Eco-Header__subtitle">Incógnito Dialéctico</span>
            </div>
          </div>

          {/* Tu identidad actual en Eco */}
          {miIdentidad && (
            <div
              className="Eco-Header__user-tag"
              onClick={() => setMostrarModalGenero(true)}
              title="Haz clic para cambiar tu género o regenerar tu identidad incógnita"
            >
              <span>{miIdentidad.mascara}</span>
              <span className="hidden sm:inline">Tu alias:</span>
              <span className="font-bold">{miIdentidad.alias}</span>
            </div>
          )}

          <div className="Eco-Header__actions">
            {modoOscuro ? (
              <button
                type="button"
                className="Eco-Btn-Icon"
                onClick={() => setModoOscuro(false)}
                title="Cambiar a Modo Claro"
              >
                <img src="/sun-svgrepo-com.svg" alt="Modo Claro" className="w-4 h-4 object-contain" />
              </button>
            ) : (
              <button
                type="button"
                className="Eco-Btn-Icon"
                onClick={() => setModoOscuro(true)}
                title="Cambiar a Modo Oscuro"
              >
                <img src="/cloud-moon-svgrepo-com.svg" alt="Modo Oscuro" className="w-4 h-4 object-contain" />
              </button>
            )}

            <button
              type="button"
              className="Eco-Btn-Secundario"
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else if (onBackToFeed) {
                  onBackToFeed();
                } else {
                  window.location.href = '/';
                }
              }}
              title="Volver"
            >
              <span>Volver</span>
            </button>
          </div>
        </div>
      </header>

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
      <main className="Eco-Main-3Col">
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

          <div className="Eco-Chats__lista">
            {chats.map((chat) => {
              const esActivo = chat.id === chatActivoId;
              const estaRevelado = chat.resonancia >= 100;
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
                    {estaRevelado ? '👤' : chat.mascara}
                  </div>
                  <div className="Eco-Chats__item-info">
                    <div className="Eco-Chats__item-top">
                      <h4 className="Eco-Chats__item-alias">
                        {estaRevelado ? `@${chat.usernameReal}` : chat.alias}
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
                  <span>{nivel4 ? '👤' : chatActivo?.mascara}</span>
                </div>
                <div className="Eco-Chat__header-meta">
                  <h4>{nivel4 ? `@${chatActivo?.usernameReal}` : chatActivo?.alias}</h4>
                  <p>
                    {nivel4
                      ? 'Identidad develada'
                      : `Incógnito • Resonancia al ${res}%`}
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
              <button type="button" className="Eco-Btn-Reportar" onClick={() => setMostrarReporte(true)}>
                ⚑ Reportar
              </button>
            </div>

            {/* Historial de mensajes (Scroll interno exclusivo) */}
            <div className="Eco-Mensajes-Scroll" ref={scrollRef}>
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
                      {esPropio ? (miIdentidad?.mascara || 'Tú') : chatActivo.mascara}
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

              {escribiendo && (
                <div className="Eco-Escribiendo-Indicador">
                  <span>El interlocutor medita su respuesta...</span>
                </div>
              )}
            </div>

            {/* Formulario de entrada de mensaje */}
            <div className="Eco-Input-Area Eco-Input-Area--estatico">
              {respuestaActiva && <div className="Eco-Barra-Cita-Activa"><span>Respondiendo a: {respuestaActiva.texto}</span><button type="button" onClick={() => setRespuestaActiva(null)} aria-label="Cancelar respuesta">×</button></div>}
              {adjunto && <div className="Eco-Preview-Adjunto-Bar"><img src={adjunto.preview} alt="Vista previa del adjunto" /><span>{adjunto.uploading ? 'Subiendo...' : adjunto.nombre}</span><button type="button" onClick={() => setAdjunto(null)} aria-label="Quitar adjunto">×</button></div>}
              <form onSubmit={manejarEnvio} className="Eco-Formulario">
                <label className="Eco-Btn-Adjunto" title="Adjuntar imagen">
                  <span aria-hidden="true">📎</span>
                  <input type="file" accept="image/*" hidden onChange={manejarAdjunto} />
                </label>
                <input
                  type="text"
                  className="Eco-Input-Text Eco-Input-Text--mono"
                  placeholder="Escribe tu mensaje en el anonimato..."
                  value={inputTexto}
                  onChange={(e) => setInputTexto(e.target.value)}
                  maxLength={500}
                />
                <button
                  type="submit"
                  className="Eco-Btn-Enviar Eco-Btn-Enviar--mono"
                  disabled={(!inputTexto.trim() && !adjunto?.url) || adjunto?.uploading || escribiendo}
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
                  <img
                    src={chatActivo.avatarReal}
                    alt="Avatar velado"
                    className="Eco-Avatar-Img"
                    style={{
                      filter: nivel4
                        ? 'none'
                        : nivel3
                        ? 'blur(5px) grayscale(30%)'
                        : 'blur(16px) grayscale(90%)'
                    }}
                  />
                  {!nivel4 && (
                    <div
                      className="Eco-Avatar-Mascara"
                      style={{ opacity: nivel3 ? 0.35 : 0.85 }}
                    >
                      <span className="text-2xl">{chatActivo.mascara}</span>
                    </div>
                  )}
                </div>

                <h3 className="Eco-Espejo__alias">
                  {nivel4 ? `@${chatActivo.usernameReal}` : chatActivo.alias}
                </h3>
                <span className="Eco-Espejo__status">
                  {nivel4 ? 'Identidad Revelada' : 'En incógnito'}
                </span>
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
                    <span className="Eco-Ficha__label">Pensamiento</span>
                    <span className="Eco-Ficha__nivel-tag">50%</span>
                  </div>
                  <div className="Eco-Ficha__contenido">
                    {nivel2 ? (
                      <div>
                        <p className="italic mb-1">"{chatActivo.filosofia}"</p>
                        <span className="text-[10px] text-stone-400 block">
                          {chatActivo.antiguedad}
                        </span>
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
                    <span className="Eco-Ficha__label">Rango en el Olimpo</span>
                    <span className="Eco-Ficha__nivel-tag">75%</span>
                  </div>
                  <div className="Eco-Ficha__contenido">
                    {nivel3 ? (
                      <span className="text-amber-400 font-semibold">
                        {chatActivo.reputacion}
                      </span>
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
                    <span className="Eco-Ficha__label">Identidad Real</span>
                    <span className="Eco-Ficha__nivel-tag">100%</span>
                  </div>
                  <div className="Eco-Ficha__contenido">
                    {nivel4 ? (
                      <div>
                        <p className="font-bold text-emerald-400 text-sm mb-1">
                          @{chatActivo.usernameReal}
                        </p>
                        <button
                          type="button"
                          className="text-xs text-amber-300 underline"
                          onClick={() => {
                            if (window.opener) {
                              window.opener.location.href = `/perfil/${chatActivo.usernameReal}`;
                            } else {
                              window.open(`/perfil/${chatActivo.usernameReal}`, '_blank');
                            }
                          }}
                        >
                          Ver perfil en Sófocles ↗
                        </button>
                      </div>
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

              {/* Botón de test rápido (+25% resonancia) */}
              <div className="mt-3 pt-2 border-t border-emerald-700/10 text-center">
                <button
                  type="button"
                  className="text-[11px] text-stone-400 hover:text-emerald-400"
                  onClick={() => {
                    const nueva = Math.min(100, res + 25);
                    setChats((prev) =>
                      prev.map((c) => (c.id === chatActivo.id ? { ...c, resonancia: nueva } : c))
                    );
                    if (nueva >= 100 && res < 100) setMostrarTeofania(true);
                  }}
                >
                  ⚡ Impulso de Resonancia (+25%)
                </button>
              </div>
            </>
          )}
        </aside>
      </main>

      {/* =================================================================
          MODAL DE BIENVENIDA Y ELECCIÓN DE GÉNERO (PRIMERA VEZ)
          ================================================================= */}
      {mostrarModalGenero && (
        <div className="Eco-Modal-Onboarding">
          <div className="Eco-Modal-Onboarding__box">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-400/40 mx-auto flex items-center justify-center text-2xl mb-3">
              🏛️
            </div>
            <h3 className="font-serif text-xl font-bold text-emerald-400 mb-1">
              Bienvenido al Eco
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed mb-4">
              Antes de ingresar a las sombras del Olimpo, indícanos cómo resuena tu espíritu para conferirte una identidad incógnita inspirada en la historia, la mitología, el arte y la arquitectura.
            </p>

            <div className="Eco-Genero-Opciones">
              <button
                type="button"
                className={`Eco-Genero-Card ${generoSeleccionado === 'femenino' ? 'Seleccionado' : ''}`}
                onClick={() => setGeneroSeleccionado('femenino')}
              >
                <span className="text-2xl">🌿</span>
                <span className="font-bold text-xs">Femenino</span>
                <span className="text-[10px] text-stone-400">Diosas, Filósofas, Pintoras y Arquitectas</span>
              </button>

              <button
                type="button"
                className={`Eco-Genero-Card ${generoSeleccionado === 'masculino' ? 'Seleccionado' : ''}`}
                onClick={() => setGeneroSeleccionado('masculino')}
              >
                <span className="text-2xl">⚡</span>
                <span className="font-bold text-xs">Masculino</span>
                <span className="text-[10px] text-stone-400">Dioses, Filósofos, Pintores y Arquitectos</span>
              </button>

              <button
                type="button"
                className={`Eco-Genero-Card ${generoSeleccionado === 'neutro' ? 'Seleccionado' : ''}`}
                onClick={() => setGeneroSeleccionado('neutro')}
              >
                <span className="text-2xl">✨</span>
                <span className="font-bold text-xs">Universal</span>
                <span className="text-[10px] text-stone-400">Mitos, Cosmos y Esencias del Ágora</span>
              </button>
            </div>

            <div className="flex gap-2 justify-center">
              {miIdentidad && (
                <button
                  type="button"
                  className="Eco-Btn-Secundario"
                  onClick={() => setMostrarModalGenero(false)}
                >
                  Conservar actual
                </button>
              )}
              <label className="Eco-Confirmacion-Formal">
                <input type="checkbox" checked={aceptoGenero} onChange={(event) => setAceptoGenero(event.target.checked)} />
                <span>Confirmo que el género indicado es real y acepto convivir con honestidad en Eco.</span>
              </label>
              <button
                type="button"
                className="Eco-Btn-Primario"
                disabled={!aceptoGenero}
                onClick={confirmarGeneroIdentidad}
              >
                {miIdentidad ? 'Regenerar Identidad' : 'Asignar Mi Identidad Incógnita'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!cargandoEco && ecoProfile && !mostrarModalGenero && !interesesEcoValidos(interesesSeleccionados) && (
        <div className="Eco-Modal-Backdrop">
          <section className="Eco-Modal-Card" role="dialog" aria-modal="true" aria-labelledby="eco-intereses-title">
            <h3 id="eco-intereses-title">Encuentra tu resonancia</h3>
            <p>Selecciona al menos seis intereses para mejorar la afinidad de tus conversaciones. {interesesSeleccionados.length} de {MIN_INTERESES_ECO} seleccionados.</p>
            <div className="Eco-Intereses-Grid">
              {TOPICOS_INTERESES.map((interes) => (
                <button key={interes.id} type="button" className={`Eco-Interes-Chip ${interesesSeleccionados.includes(interes.id) ? 'Seleccionado' : ''}`} onClick={() => alternarInteres(interes.id)}>
                  <span>{interes.icono}</span><span>{interes.label}</span>
                </button>
              ))}
            </div>
            <button type="button" className="Eco-Btn-Primario" disabled={!interesesEcoValidos(interesesSeleccionados)} onClick={() => setMostrarTour(true)}>Continuar</button>
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
              <button type="button" className="Eco-Btn-Primario" onClick={async () => { if (pasoOnboarding === TOUR_ECO.length - 1) { await clienteAxios.post('/eco/profile/tour'); setEcoProfile((profile) => ({ ...profile, tourCompleted: true })); setMostrarTour(false); } else setPasoOnboarding((paso) => paso + 1); }}>
                {pasoOnboarding === TOUR_ECO.length - 1 ? 'Entrar a Eco' : 'Siguiente'}
              </button>
            </div>
          </section>
        </div>
      )}

      <div className="Eco-Banner-Verificacion">
        <div className="Eco-Banner-Verificacion__info"><span>Verificación de edad pendiente: tienes 24 horas para adjuntar tu documento de identidad.</span><strong className="Eco-Banner-Verificacion__timer">{String(Math.floor(tiempoEdad / 3600000)).padStart(2, '0')}:{String(Math.floor((tiempoEdad % 3600000) / 60000)).padStart(2, '0')}:{String(Math.floor((tiempoEdad % 60000) / 1000)).padStart(2, '0')}</strong></div>
        <button type="button" className="Eco-Btn-VerificarAhora" onClick={() => setMostrarDocumento(true)}>Verificar ahora</button>
      </div>

      {ecoError && <div className="Eco-Toast-Error" role="status">{ecoError}</div>}
      {mostrarDocumento && <div className="Eco-Modal-Backdrop"><section className="Eco-Modal-Card" role="dialog" aria-modal="true"><h3>Documento de identidad</h3><p>La imagen se prepara para el endpoint seguro de moderación. No compartas documentos por el chat.</p><label className="Eco-Dropzone-Doc"><input type="file" accept="image/*" hidden onChange={manejarDocumento} />{documentoEdad ? <img src={documentoEdad.preview} alt="Vista previa del documento" /> : <><span className="text-2xl">▣</span><span>Seleccionar fotografía</span></>}</label><div className="flex justify-center gap-2"><button type="button" className="Eco-Btn-Secundario" onClick={() => setMostrarDocumento(false)}>Cerrar</button><button type="button" className="Eco-Btn-Primario" disabled={!documentoEdad} onClick={enviarDocumentoEdad}>Enviar a moderación</button></div></section></div>}

      {mostrarReporte && <div className="Eco-Modal-Backdrop"><section className="Eco-Modal-Card" role="dialog" aria-modal="true"><h3>Reportar conducta</h3><form className="Eco-Reporte-Form" onSubmit={enviarReporte}><label>Motivo<select value={reporteCategoria} onChange={(event) => setReporteCategoria(event.target.value)}>{REPORTES_ECO.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Detalles<textarea value={reporteDetalles} onChange={(event) => setReporteDetalles(event.target.value)} maxLength={1000} placeholder="Describe brevemente lo ocurrido" /></label>{reporteEstado && <p>{reporteEstado}</p>}<div className="flex justify-end gap-2"><button type="button" className="Eco-Btn-Secundario" onClick={() => setMostrarReporte(false)}>Cerrar</button><button type="submit" className="Eco-Btn-Primario">Enviar reporte</button></div></form></section></div>}

      {/* MODAL DE TEOFANÍA (100% REVELADO) */}
      {mostrarTeofania && chatActivo && (
        <div className="Eco-Modal-Teofania" onClick={() => setMostrarTeofania(false)}>
          <div className="Eco-Modal-Teofania__box" onClick={(e) => e.stopPropagation()}>
            <div className="text-3xl mb-2">🌟</div>
            <h3 className="font-serif text-xl font-bold text-amber-300 mb-2">
              ¡Teofanía Alcanzada!
            </h3>
            <p className="text-xs text-stone-200 mb-4 leading-relaxed">
              Han alcanzado la resonancia máxima con {chatActivo.alias}. El velo del anonimato se ha desvanecido.
            </p>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3 text-left mb-4">
              <img
                src={chatActivo.avatarReal}
                alt="Avatar revelado"
                className="w-12 h-12 rounded-full object-cover border border-emerald-400"
              />
              <div>
                <h4 className="font-bold text-stone-100 text-sm">@{chatActivo.usernameReal}</h4>
                <p className="text-[11px] text-emerald-400 font-medium">{chatActivo.reputacion}</p>
                <p className="text-[11px] text-stone-400">{chatActivo.antiguedad}</p>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <button
                type="button"
                className="Eco-Btn-Secundario"
                onClick={() => setMostrarTeofania(false)}
              >
                Seguir Charlar
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-amber-500 text-stone-950"
                onClick={() => {
                  setMostrarTeofania(false);
                  if (window.opener) {
                    window.opener.location.href = `/perfil/${chatActivo.usernameReal}`;
                  } else {
                    window.open(`/perfil/${chatActivo.usernameReal}`, '_blank');
                  }
                }}
              >
                Ver Perfil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
