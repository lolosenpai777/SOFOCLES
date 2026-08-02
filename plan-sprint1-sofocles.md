# Plan de Trabajo — Sprint 1: Sófocles Social Platform

> Documento de referencia para agentes de IA que colaboren en el desarrollo de este sprint. Contiene el alcance, la asignación de responsabilidades y los criterios de entrega esperados por módulo.

## Contexto General

Este sprint tiene como objetivo dejar una plataforma social **funcional, segura e interactiva** desde el primer despliegue, sin abordar aún funcionalidades de tiempo real.

**Fuera de alcance para este sprint:**
- WebSockets / actualizaciones en tiempo real.
- Colecciones o estructuras de datos complejas más allá de lo necesario para el MVP.

---

## Organización del Equipo

| Integrante | Rol | Área principal |
| :--- | :--- | :--- |
| **Paul** (Desarrollador 1) | Frontend | UI/UX, Búsquedas, Hashtags, Notificaciones, Calidad de Interfaz |
| **Samuel** (Desarrollador 2) | Backend | Seguridad, Storage, Moderación, Base de Datos |

---

## Tareas — Paul (Frontend, Social & Interfaz)

### 1. Feed & Búsqueda Global
- [ ] Implementar pestaña **"Siguiendo"** en el Feed Central.
- [ ] Diseñar la barra de búsqueda superior para usuarios, publicaciones y hashtags.
- [ ] Crear la lógica navegable e interactiva para **Hashtags** (`#filosofía`) y **Menciones** (`@usuario`).

### 2. Notificaciones UI
- [ ] Diseñar e integrar el panel de notificaciones (Likes, Comentarios, Nuevos Seguidores, Menciones).
- [ ] Implementar el contador de notificaciones no leídas en la barra superior.

### 3. Editor de Publicaciones & Perfil
- [ ] Crear modal/pantalla para la edición de publicaciones existentes.
- [ ] Desarrollar el componente de subida y visualización de Avatar en el perfil.

### 4. Calidad de Interfaz & Accesibilidad
- [ ] Solución global de codificación UTF-8 en todo el frontend (corregir errores como `SÃ³focles` → `Sófocles`).
- [ ] Adaptabilidad Mobile-First y barra de navegación inferior para teléfonos.
- [ ] Implementar estados de carga tipo Skeleton, Toasts de confirmación y accesibilidad básica (foco visible).

---

## Tareas — Samuel (Backend, Seguridad & Moderación)

### 1. Confianza, Seguridad & Auth
- [ ] Flujo de verificación de correo al registrarse y recuperación/cambio de contraseña.
- [ ] Manejo seguro de variables de entorno (asegurar no usar JWT por defecto) y configuración estricta de CORS.
- [ ] Middleware para validación y optimización de imágenes (tipo, tamaño, compresión y nombres seguros).

### 2. Almacenamiento & Multimedia
- [ ] Configuración e integración de almacenamiento en la nube (S3 / Cloudinary / Supabase Storage).
- [ ] Endpoints de la API para la subida de avatar y adjuntos de publicaciones.

### 3. Sistema de Moderación
- [ ] Endpoints para reportar publicaciones/usuarios, bloquear y silenciar cuentas.
- [ ] Crear un panel simple de administración para revisar reportes y retirar contenido.

### 4. Base Técnica & Calidad
- [ ] Implementar paginación **Cursor-Based** en feeds, comentarios, usuarios y búsquedas.
- [ ] Configuración e índices en la BD (`createdAt`, autor, likes, comentarios y relaciones de seguimiento).
- [ ] Pruebas unitarias para servicios e integración para flujos principales de la API.

---

## Matriz Resumen del Sprint 1

| Módulo / Característica | Responsable | Entregable Esperado |
| :--- | :---: | :--- |
| Búsqueda + Hashtags | Paul | UI de buscador superior + enlaces navegables `#` y `@` |
| Feed "Siguiendo" | Paul | Filtro de feed exclusivo por usuarios seguidos |
| Notificaciones | Paul | Panel UI + contador de no leídas |
| Edición de Posts & Avatar | Paul | Modales de edición y componente de subida UI |
| UTF-8 / Mobile First | Paul | Corrección ortográfica global y responsive móvil |
| Auth, CORS & Variables | Samuel | JWT seguro, configuración CORS y mailer de auth |
| Storage de Imágenes | Samuel | Integración backend con cloud storage (S3/Supabase) |
| Moderación & Bloqueos | Samuel | Panel de administración simple + endpoints de reportes |
| Cursor Pagination & Index | Samuel | Consultas de BD optimizadas con índices |
| Tests de API | Samuel | Pruebas automatizadas de autenticación y publicaciones |

---

## Notas para el Agente de IA

- Al trabajar en una tarea, ubicarla primero en la sección del integrante correspondiente y confirmar que no depende de tareas aún no completadas de la otra área (p. ej. la UI de Storage depende de los endpoints de Samuel).
- Priorizar la corrección de codificación UTF-8 (Paul) de forma transversal, ya que afecta la calidad percibida de todo el frontend.
- Mantener el sprint dentro del alcance definido: **no** implementar WebSockets, tiempo real, ni estructuras de datos más allá de lo requerido para estas funcionalidades.
- Marcar cada checkbox (`[ ]` → `[x]`) a medida que se completen las tareas, para reflejar el avance real del sprint.
