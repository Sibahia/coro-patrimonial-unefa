# business_rules.md

Reglas de negocio y flujos funcionales del Coro Patrimonial UNEFA.

## Entidades

| Entidad | Descripción | Campos clave |
|---|---|---|
| `User` | Cuenta de acceso | `name`, `email`, `passwordHash`, `role` (`admin`\|`editor`\|`viewer`), `isActive` |
| `RefreshToken` | Sesión renovable y revocable | `tokenHash`, `userId`, `expiresAt`, `revokedAt` |
| `Member` | Integrante del coro | `firstName`, `lastName`, `voiceType` (`soprano`\|`contralto`\|`tenor`\|`bass`), `role`, `bio`, `photoUrl`, `joinedAt`, `leftAt`, `isActive` |
| `Work` | Obra del repertorio | `title`, `composer`, `arranger`, `category` (`sacred`\|`secular`\|`popular`\|`patriotic`), `era`, `language`, `lyrics`, `scoreUrl`, `audioUrl`, `durationSeconds`, `tags[]`, `isPublished` |
| `Event` | Concierto, ensayo, grabación o actividad | `title`, `description`, `startAt`, `endAt`, `venue`, `type` (`concert`\|`rehearsal`\|`recording`\|`activity`), `coverUrl`, `gallery[]`, `workIds[]`, `memberIds[]`, `status` (`draft`\|`published`\|`finished`) |
| `HeritageItem` | Pieza del archivo patrimonial | `title`, `type` (`photo`\|`document`\|`audio`\|`video`\|`object`), `description`, `year`, `fileUrl`, `thumbnailUrl`, `tags[]`, `credit`, `isPublished`, `isFeatured` |
| `Asset` | Archivo subido | `originalName`, `url`, `mimeType`, `size`, `ownerId` |
| `AuditLog` | Trazabilidad de cambios | `actorId`, `action`, `entity`, `entityId`, `changes`, `ip` |

## Roles

- `admin`: acceso total, incluye usuarios y publicación.
- `editor`: CRUD de `Member`, `Work`, `Event` y `HeritageItem`; no gestiona usuarios.
- `viewer`: solo lectura de contenido publicado.

## Flujos funcionales

### F1 — Autenticación y roles
1. El admin crea usuarios (`POST /api/auth/register`) o se ejecuta el seeder inicial.
2. `POST /api/auth/login` devuelve un access token (JWT corto) y guarda el refresh token en cookie httpOnly.
3. `POST /api/auth/refresh` rota el refresh token y emite un nuevo access token.
4. `POST /api/auth/logout` revoca el refresh token y limpia la cookie.
5. `GET /api/auth/me` devuelve el usuario autenticado.

### F2 — Alta de integrante
1. Admin/editor crea un `Member` con `voiceType`, `role`, foto y datos de contacto.
2. La baja es lógica: `isActive=false` y `leftAt` (no se elimina el registro).
3. Integrantes inactivos no aparecen en el sitio público.

### F3 — Gestión de repertorio
1. Editor crea un `Work`, sube partitura (`scoreUrl`) y audio (`audioUrl`).
2. Admin publica la obra (`isPublished=true`).
3. Las obras se pueden asociar a eventos mediante `workIds`.

### F4 — Creación de eventos
1. Editor crea un `Event` en `status=draft`.
2. Asocia `workIds` y `memberIds`, portada y galería.
3. Admin/editor publica (`status=published`). **Regla:** no se puede publicar sin `startAt` y `venue.name`.
4. Tras la presentación se marca `status=finished`.

### F5 — Archivo patrimonial
1. Editor carga un `HeritageItem` con metadatos (`year`, `credit`, `tags[]`).
2. Admin lo publica y puede marcarlo `isFeatured=true`.
3. Se expone con filtros `type`, `tag`, `year` y `featured`.

### F6 — Consumo público
1. Las rutas GET públicas solo devuelven contenido publicado/activo.
2. El panel admin usa los mismos CRUD con JWT y ve también los borradores.

### F7 — Notificaciones (Socket.IO)
1. Al publicar un `Work`, `Event` o `HeritageItem` se emite `content:published`.
2. Los clientes móviles/web suscritos actualizan su lista.

## Reglas de validación

- `email` único e irrepetible en `User` y `Member`.
- `Work` publicado exige `title` y `composer`.
- `Event` publicado exige `startAt` y `venue.name`.
- Borrado lógico por `deletedAt` en contenido; `User` usa `isActive=false`.
- Tipos MIME y tamaño máximo validados por carpeta de `uploads` (imágenes, documentos, audios, APKs).
- Un `RefreshToken` expirado o revocado nunca renueva sesión.
