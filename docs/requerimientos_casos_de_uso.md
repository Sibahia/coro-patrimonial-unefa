# Requerimientos y casos de uso

Versión: 1.0 · Fecha: 2026-11-25 · Proyecto: Coro Patrimonial UNEFA

## 1. Propósito

Este documento formaliza los requerimientos funcionales y no funcionales del sistema y los casos de uso que se derivan de `context/business_rules.md` y `context/api_contracts.md`. Es la referencia para trazar cada funcionalidad hacia su implementación y hacia sus pruebas.

## 2. Actores

| Actor | Descripción | Permisos |
|---|---|---|
| Administrador (`admin`) | Directiva del coro | Acceso total: usuarios, contenidos y publicación |
| Editor (`editor`) | Responsables de contenido | CRUD de `Member`, `Work`, `Event`, `HeritageItem` y `Monument`; no gestiona usuarios |
| Corista (`viewer`) | Integrantes del coro | Solo lectura de contenido publicado |
| Visitante público | Público general | Solo lectura de contenido publicado/activo |

## 3. Requerimientos funcionales

| ID | Requerimiento | Prioridad | Endpoint / módulo |
|---|---|---|---|
| RF-01 | Registrar usuarios con roles `admin`, `editor` o `viewer` | Alta | `POST /api/auth/register`, `/api/users` |
| RF-02 | Iniciar sesión y obtener access token JWT + cookie httpOnly de refresh | Alta | `POST /api/auth/login` |
| RF-03 | Renovar y revocar sesiones de forma segura (rotación y detección de reutilización) | Alta | `POST /api/auth/refresh`, `/api/auth/logout` |
| RF-04 | Consultar el usuario autenticado | Media | `GET /api/auth/me` |
| RF-05 | Gestionar usuarios (listar, crear, editar, desactivar) | Alta | `/api/users` |
| RF-06 | Gestionar integrantes con alta/baja lógica y voices tipadas | Alta | `/api/members` |
| RF-07 | Gestionar el repertorio de obras con partituras y audios | Alta | `/api/works` |
| RF-08 | Gestionar eventos (concierto, ensayo, grabación, actividad) y su ciclo de estados | Alta | `/api/events` |
| RF-09 | Gestionar el archivo patrimonial con metadatos y destacados | Alta | `/api/heritage` |
| RF-10 | Gestionar monumentos históricos con imágenes múltiples | Media | `/api/monuments` |
| RF-11 | Subir archivos por carpeta validando MIME y tamaño | Alta | `POST /api/uploads`, `/uploads/:folder/:file` |
| RF-12 | Exponer solo contenido publicado/activo a visitantes | Crítica | Filtros en `helpers/crud.js` |
| RF-13 | Emitir `content:published` por Socket.IO al publicar contenido | Media | `helpers/crud.js` |
| RF-14 | Verificar el estado del servicio | Alta | `GET /api/health` |

## 4. Requerimientos no funcionales

| ID | Requerimiento | Criterio de aceptación |
|---|---|---|
| RNF-01 | Seguridad de autenticación | Contraseñas con `bcrypt`; JWTAccess firmado; refresh con `jti` y hash persistido; cookie httpOnly |
| RNF-02 | Control de acceso | Roles verificados en middleware; respuestas `401`/`403` con códigos del contrato |
| RNF-03 | Validación de entrada | `express-validator` y esquemas Mongoose; errores `400 VALIDATION_ERROR` con `details` |
| RNF-04 | Envelope de respuesta | Éxito `{ ok: true, data }`; error `{ ok: false, error: { code, message, details? } }` |
| RNF-05 | Paginación y búsqueda | `?page&limit`, `?search`, filtros por entidad; máximo 100 elementos por página |
| RNF-06 | Protección de cabeceras y orígenes | `helmet` y CORS con lista blanca configurable por `CORS_ORIGINS` |
| RNF-07 | Límite de tasa | 300 peticiones/15 min en `/api`; 20 intentos/15 min en login y refresh |
| RNF-08 | Trazabilidad | `createdBy`, `deletedAt` y `AuditLog` previsto en el modelo de datos |
| RNF-09 | Pruebas automatizadas | Suite `node --test` con cobertura superior al 90 % de líneas |
| RNF-10 | Entorno reproducible | Node 26 fijado en `.nvmrc`, `engines` y CI; dependencias bloqueadas con `package-lock.json` |

## 5. Casos de uso

### UC-01 — Iniciar sesión

- **Actor:** cualquier usuario registrado.
- **Precondición:** usuario activo y contraseña válida.
- **Flujo:** enviar `email` y `password` a `POST /api/auth/login` → el sistema valida, compara el hash y emite access token + cookie de refresh.
- **Postcondición:** cliente autenticado.
- **Excepción:** credenciales inválidas o usuario inactivo → `401 UNAUTHORIZED`.

### UC-02 — Renovar sesión

- **Actor:** cliente con cookie de refresh vigente.
- **Precondición:** refresh token no expirado ni revocado.
- **Flujo:** `POST /api/auth/refresh` → se valida el hash, se rota el `jti` y se emite un nuevo par de tokens.
- **Excepción:** reutilización de un token rotado → `401` y revocación de todas las sesiones del usuario.

### UC-03 — Crear y publicar una obra

- **Actor:** editor / administrador.
- **Precondición:** rol `editor` o `admin`; `title` y `composer` presentes.
- **Flujo:** `POST /api/works` con `isPublished=true` → se persiste y se emite `content:published`.
- **Postcondición:** la obra aparece en el sitio público.
- **Excepción:** rol insuficiente → `403`; campos faltantes → `400`.

### UC-04 — Dar de baja a un integrante

- **Actor:** editor / administrador.
- **Flujo:** `PUT /api/members/:id` con `isActive=false` y `leftAt`.
- **Postcondición:** el integrante desaparece de consultas públicas, incluso si se intenta `?isActive=false`.

### UC-05 — Publicar un evento

- **Actor:** editor / administrador.
- **Precondición:** `startAt` y `venue.name` válidos.
- **Flujo:** crear en `status=draft`, asociar `workIds`/`memberIds`, luego `PUT` a `status=published`.
- **Postcondición:** evento visible públicamente y notificación Socket.IO.
- **Excepción:** sin fecha → `400 VALIDATION_ERROR`.

### UC-06 — Alimentar el archivo patrimonial

- **Actor:** editor / administrador.
- **Flujo:** crear `HeritageItem` con `type`, `year`, `tags` y `credit` → publicar y marcar `isFeatured`.
- **Postcondición:** filtros públicos por `type`, `tag`, `year` y `featured`.

### UC-07 — Registrar un monumento con imágenes

- **Actor:** editor / administrador.
- **Flujo:** `POST /api/monuments` multipart con campos obligatorios y archivos `images` (jpg/jpeg/png/webp).
- **Postcondición:** imágenes guardadas en `/uploads/images` con nombre único y URLs en el campo `images`.
- **Excepción:** extensión no permitida → `400 VALIDATION_ERROR`; fallo de persistencia → se borran los archivos recién guardados.

### UC-08 — Subir un recurso

- **Actor:** editor / administrador.
- **Flujo:** `POST /api/uploads` con `folder` y `file` → se valida carpeta y MIME, se guarda el archivo y se crea un `Asset`.
- **Excepción:** carpeta/tipo inválido, archivo ausente o rol insuficiente → `400`/`403`.

### UC-09 — Consultar contenido público

- **Actor:** visitante.
- **Flujo:** `GET /api/works`, `/api/events`, `/api/heritage`, `/api/members` sin token.
- **Postcondición:** solo elementos publicados/activos; un token inválido se trata como anónimo.

### UC-10 — Verificar el servicio

- **Actor:** cualquier cliente o sistema de monitoreo.
- **Flujo:** `GET /api/health` → `{ ok: true, data: { status: 'ok', uptime, timestamp } }`.

### UC-11 — Recibir notificaciones de publicación

- **Actor:** clientes web y móvil suscritos a Socket.IO.
- **Precondición:** conexión activa al namespace por defecto.
- **Flujo:** al publicar un `Work`, `Event` o `HeritageItem`, el servidor emite `content:published` con `{ entity, id, title }`.
- **Postcondición:** los clientes actualizan sus listados.

## 6. Trazabilidad

| Caso de uso | Prueba automatizada |
|---|---|
| UC-01, UC-02 | `tests/auth.test.js` — login, refresh, logout, `me` |
| UC-03, UC-09 | `tests/api.test.js` — works, roles, filtros públicos |
| UC-04 | `tests/api.test.js` — members (baja lógica y filtro no eludible) |
| UC-05 | `tests/api.test.js` — events (ciclo de estados) |
| UC-06 | `tests/api.test.js` — heritage (filtros y validación) |
| UC-07 | `tests/smoke.test.js`, `tests/api.test.js` — monumentos |
| UC-08 | `tests/api.test.js` — uploads |
| UC-10 | `tests/smoke.test.js`, `tests/api.test.js` — health |
| UC-11 | `tests/api.test.js` — emisión `content:published` |
