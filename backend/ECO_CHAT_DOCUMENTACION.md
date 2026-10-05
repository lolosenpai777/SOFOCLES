# Documentación Técnica: Sistema Eco Chat (Incógnito Dialéctico)

## Estado de la implementación

Eco se gestiona como un perfil secundario 1:1 vinculado a la cuenta autenticada de Sófocles. No es una cuenta anónima separada: el usuario inicia sesión con su cuenta principal y el backend crea un único `EcoProfile` asociado a `User`.

Actualmente están implementados el perfil Eco, la declaración formal de género, el plazo server-side de 24 horas, la recepción privada del documento, intereses con mínimo de seis, finalización del tour, conversaciones, mensajes, citas, adjuntos y reacciones. El frontend usa el backend como fuente de verdad; `localStorage` solo conserva preferencias visuales y no concede acceso.

El documento queda en `backend/private-uploads` con permisos de archivo restringidos y nunca se sirve desde `/uploads`. La revisión del documento y la transición de `SUBMITTED` a `VERIFIED` deben ejecutarse mediante un panel de moderación seguro antes de considerarlo aprobado. Mientras el estado sea `PENDING` o `SUBMITTED`, el usuario puede utilizar Eco dentro del plazo; al expirar pasa a `EXPIRED` y el servidor bloquea el chat.

## 1. Visión General

**Eco** es un subsistema de chat en incógnito dialéctico dentro del ecosistema de **Sófocles**. Su objetivo es permitir intercambios filosóficos, artísticos y humanos libres de sesgos o prejuicios de apariencia, garantizando al mismo tiempo un entorno seguro, verificado y respetuoso.

El sistema opera bajo los siguientes principios fundamentales:
1. **Identidad en las Sombras**: Los usuarios conversan bajo alias alegóricos generados a partir de su género verificado (dioses/diosas de la mitología griega, filósofos/filósofas, pintores/pintoras clásicos —excluyendo a Frida Kahlo— y arquitectos legendarios).
2. **Prevención de Engaños y Autenticidad de Género**: Para evitar la suplantación y la manipulación entre usuarios, el acceso a Eco requiere un registro formal con confirmación estricta de género.
3. **Verificación de Edad en 24 Horas**: Todo participante debe remitir una fotografía legible de su documento oficial de identidad (DNI, cédula o pasaporte). Se otorga un margen de cortesía de **24 horas** con notificación activa; tras dicho lapso, la cuenta queda en pausa hasta completar la verificación.
4. **Algoritmo de Compatibilidad por Intereses**: Selección obligatoria de al menos **6 intereses temáticos** para calcular el índice de afinidad dialéctica antes de iniciar conversaciones.
5. **Revelación Progresiva (Resonancia)**: La identidad real y los rasgos del perfil solo se revelan gradualmente a medida que se intercambian reflexiones de valor (25%, 50%, 75%, 100% / Teofanía).
6. **Chat Monocromático Libre de Distracciones**: Interfaz limpia, sobria, sin animaciones ni saturación de color para proteger la concentración y el descanso visual.

---

## 2. Modelo de Datos y Entidades

### 2.1 Perfil de Eco (`EcoProfile`)
```prisma
model EcoProfile {
  id                Int             @id @default(autoincrement())
  userId            Int             @unique @map("user_id")
  alias             String          // Ej: "Atenea del Ágora", "Leonardo da Vinci en Claroscuro"
  mascara           String          // Emoji glifo: 🎭, 🏛️, 🎨, 📐
  generoLegal       String          @map("genero_legal") // "FEMENINO" | "MASCULINO" | "NEUTRO"
  generoConfirmado  Boolean         @default(false) @map("genero_confirmado")
  edadVerificada    Boolean         @default(false) @map("edad_verificada")
  documentoUrl      String?         @map("documento_url")
  limiteVerificacion DateTime       @map("limite_verificacion") // now() + 24 horas
  intereses         String[]        // Mínimo 6 tópicos obligatorios
  tourCompletado    Boolean         @default(false) @map("tour_completado")
  reputacionDialectica Int          @default(100) @map("reputacion_dialectica")
  createdAt         DateTime        @default(now()) @map("created_at")
  updatedAt         DateTime        @updatedAt @map("updated_at")

  user              User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  mensajesEnviados  EcoMensaje[]    @relation("MensajesEnviados")
  conversaciones    EcoParticipante[]
  reportesHechos    EcoReporte[]    @relation("ReportesHechos")
  reportesRecibidos EcoReporte[]    @relation("ReportesRecibidos")

  @@map("eco_profiles")
}
```

### 2.2 Conversación de Eco (`EcoConversacion`)
```prisma
model EcoConversacion {
  id              String            @id @default(uuid())
  resonancia      Int               @default(0) // 0% a 100%
  estado          EcoEstadoChat     @default(ACTIVO) // ACTIVO | REVELADO | BLOQUEADO
  compatibilidad  Int               @default(50) // Porcentaje basado en intereses comunes
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  participantes   EcoParticipante[]
  mensajes        EcoMensaje[]

  @@map("eco_conversaciones")
}

enum EcoEstadoChat {
  ACTIVO
  REVELADO
  BLOQUEADO
}
```

### 2.3 Mensaje de Eco (`EcoMensaje`)
```prisma
model EcoMensaje {
  id              String            @id @default(uuid())
  conversacionId  String            @map("conversacion_id")
  autorId         Int               @map("autor_id")
  contenido       String            @db.Text
  adjuntoUrl      String?           @map("adjunto_url")
  mensajeCitadoId String?           @map("mensaje_citado_id")
  createdAt       DateTime          @default(now()) @map("created_at")

  conversacion    EcoConversacion   @relation(fields: [conversacionId], references: [id], onDelete: Cascade)
  autor           EcoProfile        @relation("MensajesEnviados", fields: [autorId], references: [id])
  mensajeCitado   EcoMensaje?       @relation("Citas", fields: [mensajeCitadoId], references: [id])
  citasHijas      EcoMensaje[]      @relation("Citas")
  reacciones      EcoReaccion[]

  @@index([conversacionId, createdAt])
  @@map("eco_mensajes")
}
```

### 2.4 Reacción de Mensaje (`EcoReaccion`)
```prisma
model EcoReaccion {
  id        Int       @id @default(autoincrement())
  mensajeId String    @map("mensaje_id")
  autorId   Int       @map("autor_id")
  emoji     String    // "👍", "❤️", "💡", "🏛️", "🎭", "👏"
  createdAt DateTime  @default(now()) @map("created_at")

  mensaje   EcoMensaje @relation(fields: [mensajeId], references: [id], onDelete: Cascade)

  @@unique([mensajeId, autorId, emoji])
  @@map("eco_reacciones")
}
```

### 2.5 Reporte de Conducta en Eco (`EcoReporte`)
```prisma
model EcoReporte {
  id          Int             @id @default(autoincrement())
  denuncianteId Int           @map("denunciante_id")
  denunciadoId  Int           @map("denunciado_id")
  motivo      EcoMotivoReporte
  descripcion String?         @db.Text
  mensajeId   String?         @map("mensaje_id")
  estado      String          @default("PENDIENTE") // PENDIENTE | REVISADO | SANCIONADO | DESCARTADO
  createdAt   DateTime        @default(now()) @map("created_at")

  denunciante EcoProfile      @relation("ReportesHechos", fields: [denuncianteId], references: [id])
  denunciado  EcoProfile      @relation("ReportesRecibidos", fields: [denunciadoId], references: [id])

  @@map("eco_reportes")
}

enum EcoMotivoReporte {
  ACOSO
  SUPLANTACION_GENERO
  CONTENIDO_EXPLICITO
  DISCURSO_ODIO
  SPAM
}
```

---

## 3. Endpoints del API de Eco

### 3.1 Autenticación y Verificación
- `GET /api/eco/profile`: Devuelve el perfil Eco de la cuenta autenticada.
- `POST /api/eco/profile`: Crea el perfil vinculado y exige `genderConfirmed: true`.
- `POST /api/eco/verification/document`: Recibe la imagen como data URL validada y la almacena de forma privada.
- `GET /api/eco/verification/status`: Estado del plazo de 24 horas y aprobación del documento.
- `PATCH /api/eco/admin/profiles/:userId/age-status`: Acción de moderador junior para marcar `VERIFIED` o `REJECTED`.

### 3.2 Intereses y Onboarding
- `PUT /api/eco/profile/interests`: Guarda los intereses seleccionados (validación de mínimo 6 ítems).
- `POST /api/eco/profile/tour`: Registra la culminación del tour guiado de bienvenida.

### 3.3 Mensajería y Matching
- `GET /api/eco/chats`: Listado de conversaciones activas con sus resonancias e interlocutores.
- `POST /api/eco/chats/match`: Algoritmo de emparejamiento basado en intersección de intereses (`intereses_usuario_A ∩ intereses_usuario_B`).
- `POST /api/eco/chats/:id/messages`: Envío autenticado con soporte para texto, `attachmentUrl` y `quotedMessageId`.
- `POST /api/eco/messages/:id/reactions`: Añadir o retirar una reacción con emoji.

### 3.4 Moderación y Reportes
- `POST /api/eco/reports`: Creación de reporte formal hacia el panel de moderación de Sófocles, con escalamiento automático si se detecta suplantación de género o acoso reincidente.

---

## 4. Política de Moderación y Prevención de Fraude de Género
Para preservar la confianza en el sistema:
1. Las identidades son asignadas exclusivamente por el sistema a partir del género legal verificado mediante el documento.
2. Si un usuario es reportado y se constata discordancia premeditada entre su documento y su género declarado con intenciones de engaño o acoso, la cuenta es suspendida permanentemente de Eco y del Olimpo.
