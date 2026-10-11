# Verificación básica de identidad

## Resumen

Se añadió una opción de verificación de identidad dentro de **Editar perfil**. La persona usuaria puede enviar:

1. Una fotografía de su documento de identidad.
2. Una fotografía tipo selfie, usando la cámara del dispositivo cuando el navegador lo permite.
3. Su consentimiento explícito para el procesamiento temporal de las imágenes.

El backend envía ambas imágenes a un modelo Gemini configurable y solicita únicamente una comprobación básica:

- Si el documento parece válido y legible.
- Si la segunda imagen contiene una selfie.
- Si la persona de la selfie parece corresponder con la fotografía del documento.

La implementación no pretende sustituir un proceso legal de KYC, una revisión humana ni un proveedor especializado de validación de identidad.

## Flujo de usuario

1. La persona abre su perfil.
2. Pulsa **Editar perfil**.
3. En la sección **Verificar identidad**, selecciona el documento.
4. Toma o selecciona una selfie.
5. Marca el consentimiento.
6. Pulsa **Verificar ahora**.
7. El sistema muestra el resultado y actualiza la insignia de cuenta verificada si la comprobación es positiva.

Las imágenes se mantienen en memoria durante la solicitud y no se guardan en el almacenamiento de Sófocles.

## Archivos modificados

### Frontend

- `frontend/src/components/ProfilePage.jsx`
  - Añade los selectores para documento y selfie.
  - Añade el checkbox de consentimiento.
  - Añade el botón de verificación.
  - Envía las imágenes como data URLs al backend.
  - Muestra el estado y el resultado del proceso.
- `frontend/src/components/ProfilePage.css`
  - Añade los estilos de la sección de verificación.

### Backend

- `backend/src/routes/user.routes.js`
  - Registra `POST /api/users/identity-verification`.
  - Protege la ruta con autenticación.
  - Valida los campos recibidos.
  - Limita la ruta a 3 intentos por hora.
- `backend/src/controllers/identity-verification.controller.js`
  - Conecta la ruta con el servicio de verificación.
- `backend/src/services/identity-verification.service.js`
  - Valida el formato y tamaño de las imágenes.
  - Envía las imágenes a Gemini.
  - Interpreta la respuesta JSON del modelo.
  - Persiste únicamente el resultado de la verificación.
- `backend/src/config/env.js`
  - Añade la configuración del proveedor de IA.
- `backend/src/app.js`
  - Aumenta el límite de cuerpo JSON para permitir las dos imágenes.

### Base de datos

- `backend/prisma/schema.prisma`
  - Añade el modelo `IdentityVerification`.
- `backend/prisma/migrations/202610100001_add_identity_verification/migration.sql`
  - Crea la tabla `identity_verifications`.

### Configuración

- `backend/.env.example`
- `backend/.env.docker-oauth.example`
- `docker-compose.yml`

Estos archivos documentan y pasan la clave de Gemini al backend sin exponerla al frontend.

## Configuración de Gemini

La clave debe configurarse únicamente en el backend o en el entorno de Docker:

```env
GEMINI_API_KEY=tu_clave_de_gemini
GEMINI_MODEL=gemini-2.0-flash
```

La variable `GEMINI_MODEL` es opcional. Si no se define, se utiliza:

```text
gemini-2.0-flash
```

Nunca se debe colocar `GEMINI_API_KEY` en variables `VITE_*` ni en archivos JavaScript del frontend.

Después de configurar el entorno, hay que aplicar la migración:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

En Docker, el servicio backend ejecuta automáticamente `prisma migrate deploy` al iniciar.

## Datos almacenados

La tabla `identity_verifications` guarda:

- `user_id`
- `status`: `VERIFIED` o `REJECTED`
- `provider`: actualmente `gemini`
- `verified_at`
- `created_at`
- `updated_at`

No se guardan:

- La imagen del documento.
- La imagen de la selfie.
- El texto extraído del documento.
- El número del documento.
- El nombre, dirección o fecha de nacimiento.
- Plantillas o vectores biométricos.

El campo `User.isVerified` se actualiza según el resultado actual de la comprobación.

## Seguridad y límites actuales

- La ruta requiere autenticación.
- El consentimiento debe llegar explícitamente como `true`.
- Solo se aceptan imágenes JPEG, PNG o WebP.
- Cada imagen tiene un límite de 10 MB.
- La ruta permite como máximo 3 intentos por hora.
- La clave de Gemini nunca se envía al navegador.
- Las imágenes no se pasan por el servicio de almacenamiento de imágenes.
- El backend aplica un timeout de 30 segundos a la solicitud hacia Gemini.
- El frontend utiliza un timeout de 45 segundos para la solicitud completa.
- La respuesta del modelo se limita a un JSON con indicadores booleanos y un motivo breve.

## Consideraciones legales y de producto

Esta implementación es una comprobación visual básica asistida por IA. No debe utilizarse como:

- Prueba legal de identidad.
- Sistema biométrico certificado.
- Decisión automática para contratación, crédito, acceso a servicios regulados u otros usos de alto impacto.

Antes de utilizarla en producción se recomienda revisar:

1. La base legal y el consentimiento para tratar documentos de identidad.
2. La política de privacidad y los avisos de tratamiento de datos.
3. La normativa aplicable en los países donde opere Sófocles.
4. La posibilidad de ofrecer revisión manual o apelación.
5. La retención y los registros técnicos del proveedor de IA.
6. Los límites de edad y los casos de documentos no compatibles.
7. La protección contra fotos de pantalla, documentos falsificados, deepfakes y ataques de presentación.

## Validaciones realizadas

- Build del frontend: correcto.
- Lint del frontend: correcto; quedaron únicamente advertencias preexistentes en otros archivos.
- Sintaxis de los archivos JavaScript del backend: correcta.
- Validación del esquema Prisma: correcta.
- Generación del cliente Prisma: correcta.
- `git diff --check`: correcto.

Las pruebas completas del backend no pudieron finalizar en el entorno local debido a credenciales inválidas de PostgreSQL. Ese problema corresponde a la configuración local de la base de datos y no a la implementación de verificación.

