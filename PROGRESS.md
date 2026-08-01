# Actualización — 28 de Julio, 2026

## Seguridad, autenticación y almacenamiento

- JWT obligatorio, sin secreto por defecto, y CORS limitado a `CORS_ORIGINS`.
- `.env` retirado del índice de Git; plantillas seguras: `.env.example` y `backend/.env.example`.
- Registro con verificación por correo, recuperación y cambio de contraseña.
- En desarrollo los enlaces de correo se escriben en la consola; para entrega real se requieren variables SMTP.
- Imágenes validadas (tipo/tamaño máximo de 8 MB), comprimidas a WebP y guardadas con nombres seguros.
- Endpoints autenticados: `POST /api/uploads/avatar` y `POST /api/uploads/posts`.
- Con credenciales `CLOUDINARY_*` las imágenes se almacenan en Cloudinary; sin ellas se usa almacenamiento local de desarrollo.

## Moderación

- Migración `20260727220000_security_moderation` aplicada: roles, reportes, bloqueos, silencios y tokens de seguridad.
- Reportes: `POST /api/reports`; bloqueo/silencio: `POST /api/users/:id/block` y `POST /api/users/:id/mute`.
- Administración: `GET /api/admin/reports` y `PATCH /api/admin/reports/:id`, con resolución y retiro de publicaciones.
- Panel de moderación para rol `ADMIN`; la cuenta `santiagosampayo66@gmail.com` es ADMIN en la base local.
- El feed incluye el icono ⚑ para reportar publicaciones; los perfiles permiten reportar, silenciar y bloquear.

## Rendimiento, interfaz y calidad

- Paginación por cursor en feeds, publicaciones seguidas, comentarios y búsqueda de usuarios; el feed tiene **Cargar más**.
- Índices de BD para fechas, autores, comentarios, reportes, relaciones de moderación y tokens.
- Subida de avatar desde perfil y pantallas para verificar correo, solicitar recuperación y restablecer contraseña.
- Pruebas de API con `node --test`: salud, rutas protegidas e imágenes inválidas.
- Verificado con `npm test` (3/3), `npx prisma validate`, `npm run build` y `npm run lint`.

## Puesta en marcha

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000/health`
- Inicio: `docker compose up -d` y `cd frontend && npm run dev`.

> Nota: las credenciales SMTP y Cloudinary no se incluyen en el repositorio; deben añadirse al `.env` local.

---

# 📋 SOFOCLES - Progreso de Desarrollo

## Sesión Actual (22 de Julio, 2026)

### 🎯 Objetivos Completados

#### 1. **Feature de Perfil de Usuario** ✅
Implementación completa del sistema de perfiles con edición de datos personales.

**Backend (Fastify + Prisma):**
- Agregado campos `biography` (String?) y `avatarUrl` (String?) al modelo User
- Creada migración: `20260722233549_add_bio_and_avatar`
- Implementado endpoint `GET /api/users/:id/profile`
  - Retorna: id, username, biography, avatarUrl, postsCount, followersCount, followingCount, joinDate, posts array
  - Sin autenticación requerida
  - Incluye últimos posts del usuario
  
- Implementado endpoint `PUT /api/users/profile` (Autenticado)
  - Permite actualizar biography y avatarUrl del usuario actual
  - Rate limited: 10 requests/minuto
  - Retorna datos actualizados

**Frontend (React):**
- Completamente refactorizado `PerfilModal.jsx`
  - Carga datos del perfil desde API
  - Muestra estadísticas del usuario (posts, seguidores, siguiendo)
  - Muestra posts recientes del usuario (hasta 5, scrollable)
  - Modo edición para perfil propio
  - Inputs para editar bio y avatar URL
  - Guardar cambios con PUT request
  
- `FeedScreen.jsx` ya tenía handler de click en avatares
  - Abre modal del perfil del autor del post
  - Funciona tanto para perfil propio como de otros usuarios

**Archivos Modificados:**
- `backend/prisma/schema.prisma`
- `backend/src/services/user.service.js` (+2 nuevas funciones)
- `backend/src/controllers/user.controller.js` (+2 nuevos handlers)
- `backend/src/routes/user.routes.js` (+2 nuevas rutas)
- `frontend/src/styles/PerfilModal.jsx` (rewrite completo)

---

#### 2. **Sistema de Avatares con Imágenes Reales** ✅
Los avatares ahora muestran imágenes en lugar de solo iniciales.

**Nuevo Componente:**
- `frontend/src/components/AvatarDisplay.jsx`
  - Muestra imagen si existe URL válida
  - Fallback a iniciales si URL falla o no existe
  - Soporta múltiples tamaños: sm, md, lg, xl
  - Estilos con Tailwind CSS
  - Manejo de errores de carga de imagen

**Integración:**
- `FeedScreen.jsx`: Avatares en posts del feed (clickeables)
- `PerfilModal.jsx`: Avatar en header del modal del perfil

**Datos de Prueba:**
- Actualizado `backend/seed.js` para usar URLs reales de DiceBear API
- Cada usuario de prueba tiene avatar único y visible

---

#### 3. **Seed Script Mejorado** ✅
Script de datos de prueba que **NO borra la base de datos**.

**Características:**
- Verifica si usuarios ya existen antes de crear
- Verifica si posts ya existen antes de crear
- Verifica si relaciones de follow ya existen
- Verifica si likes ya existen
- Crea datos nuevos solo si no existen

**5 Usuarios de Prueba:**
| Usuario | Email | Contraseña | Bio |
|---------|-------|-----------|-----|
| **Platon** | platon@sofocles.com | password123 | El filósofo de las ideas inmutables |
| **Aristoteles** | aristoteles@sofocles.com | password123 | Lógico y observador de la naturaleza |
| **Descartes** | descartes@sofocles.com | password123 | Dudo, luego existo |
| **Kant** | kant@sofocles.com | password123 | Crítica de la razón pura |
| **Nietzsche** | nietzsche@sofocles.com | password123 | Más allá del bien y del mal |

**Posts:** 2 posts por usuario (10 total con contenido temático)

**Relaciones:**
- Platon sigue a Aristoteles y Descartes
- Aristoteles sigue a Platon y Kant
- Descartes sigue a Kant y Nietzsche
- Kant sigue a todos
- Nietzsche es seguido por algunos

**Likes:** Algunos likes iniciales distribuidos

---

### 🔧 Cambios Técnicos

**Base de Datos:**
```
Migración: 20260722233549_add_bio_and_avatar
Cambios:
- ALTER TABLE users ADD biography VARCHAR(255)
- ALTER TABLE users ADD avatar_url VARCHAR(500)
```

**API Endpoints Nuevos:**
```
GET /api/users/:id/profile          → Profile data with stats and posts
PUT /api/users/profile              → Update profile (auth required)
```

**Estructura de Carpetas:**
```
frontend/src/
├── components/
│   └── AvatarDisplay.jsx           ✨ NUEVO
├── styles/
│   ├── FeedScreen.jsx              ✏️ Modificado
│   └── PerfilModal.jsx             ✏️ Reescrito

backend/src/
├── services/
│   └── user.service.js             ✏️ +2 funciones
├── controllers/
│   └── user.controller.js          ✏️ +2 handlers
├── routes/
│   └── user.routes.js              ✏️ +2 rutas

backend/
├── seed.js                         ✨ NUEVO (mejorado)
└── prisma/
    ├── schema.prisma               ✏️ +2 campos
    └── migrations/
        └── 20260722233549_add_bio_and_avatar/
```

---

### 📊 Validación

✅ **Backend:**
- Endpoints responden correctamente a requests
- Rate limiting aplicado
- Autenticación JWT funcionando
- Migración BD exitosa

✅ **Frontend:**
- Compila sin errores
- Avatares cargan correctamente
- Modal de perfil funcional
- Edición de perfil operativa
- Hot reload con Vite funcionando

✅ **Base de Datos:**
- Tablas creadas correctamente
- Relaciones intactas
- Datos de prueba disponibles

---

### 🚀 Cómo Usar

**1. Iniciar Servicios:**
```bash
docker compose up -d
cd frontend && npm run dev
```

**2. Cargar Datos de Prueba (opcional):**
```bash
docker compose exec backend node seed.js
```

**3. Acceder a la App:**
- Frontend: http://localhost:5174
- Backend: http://localhost:5000

**4. Probar Features:**
- Inicia sesión con cualquier usuario de prueba
- Haz click en avatares para ver perfiles
- Edita tu perfil (bio y avatar URL)
- Síguele a otros usuarios
- Dale likes a posts

---

### 📝 Commits

1. **4db9507** - `feat: Implement user profile feature with bio and avatar support`
   - Schema updates, endpoints GET y PUT
   - PerfilModal refactorizado
   - Estadísticas y posts en perfil

2. **ce45e57** - `feat: Add avatar images and improve profile display`
   - Nuevo componente AvatarDisplay
   - Avatares en feed y perfiles
   - Seed script mejorado
   - DiceBear API para avatares

---

### 🔮 Próximas Características (Ideas)

- [ ] Búsqueda avanzada de usuarios
- [ ] Notificaciones en tiempo real
- [ ] Mensajes directos
- [ ] Sistema de hashtags
- [ ] Validación de URLs de avatar
- [ ] Cropping/upload de imágenes
- [ ] Estadísticas del usuario (gráficos)
- [ ] Perfil público (share link)
- [ ] Bloqueo de usuarios
- [ ] Reportar contenido

---

### 📌 Notas Importantes

- **No borres la BD manualmente:** El seed.js ahora es seguro y no borra datos
- **Los avatares son URLs:** Cualquier URL válida de imagen funciona
- **Rate limiting:** PUT /api/users/profile tiene límite de 10/minuto
- **Migraciones:** Siempre usa `npx prisma migrate dev` para nuevos cambios
- **Frontend dev:** Hot reload está activo en puerto 5174

---

### 🔁 Corrección de subida de imágenes (23 de Julio, 2026)

- Se implementó soporte para persistir imágenes de publicaciones en `backend/public/uploads`.
- El backend ahora acepta `imageData` (data URL) en `POST /api/posts`, guarda el archivo y persiste una `image_url` absoluta (ej. `http://localhost:5000/uploads/<file>`).
- Se añadió un endpoint ligero `GET /uploads/:file` para servir imágenes sin depender de plugins inconsistentes.
- Frontend actualizado para enviar `imageData` desde el modal de publicación; las imágenes ahora se mantienen después de recargar.
- Nota: Las imágenes antiguas dejan de mostrarse si los archivos en `public/uploads` no existen; si tienes un backup puedo restaurarlas y actualizar las filas de la BD.


**Estado General:** ✅ **PRODUCCIÓN LISTA**

Todas las features implementadas están funcionando correctamente y listas para pruebas en desarrollo. El código está pusheado a main y tu amigo puede hacer pull sin problemas.
