# api_contracts.md

Contrato de la API REST y eventos Socket.IO. Base URL: `/api`. Todas las respuestas usan el envelope `{ ok, data }` o `{ ok: false, error: { code, message, details? } }`.

## Convenciones

- Autenticación: `Authorization: Bearer <accessToken>` + cookie httpOnly `refreshToken`.
- Paginación: `?page=1&limit=20` → `{ items, total, page, limit, pages }`.
- Búsqueda y filtros: `?search=&tag=&type=&year=&featured=true`.
- Roles requeridos se indican entre paréntesis; `public` no requiere token.

## Resumen de endpoints

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/api/health` | Estado del servicio | public |
| POST | `/api/auth/register` | Crear usuario | admin |
| POST | `/api/auth/login` | Iniciar sesión | public |
| POST | `/api/auth/refresh` | Rotar refresh token | cookie |
| POST | `/api/auth/logout` | Cerrar sesión | viewer+ |
| GET | `/api/auth/me` | Usuario actual | viewer+ |
| GET/POST | `/api/users` | Listar / crear usuarios | admin |
| GET/PUT/DELETE | `/api/users/:id` | Detalle / editar / desactivar | admin |
| GET/POST | `/api/members` | Listar / crear integrantes | public GET, editor+ POST |
| GET/PUT/DELETE | `/api/members/:id` | Detalle / editar / dar de baja | public GET, editor+ |
| GET/POST | `/api/works` | Listar / crear obras | public GET, editor+ POST |
| GET/PUT/DELETE | `/api/works/:id` | Detalle / editar / retirar | public GET, editor+ |
| GET/POST | `/api/events` | Listar / crear eventos | public GET, editor+ POST |
| GET/PUT/DELETE | `/api/events/:id` | Detalle / editar / retirar | public GET, editor+ |
| GET/POST | `/api/heritage` | Listar / crear piezas | public GET, editor+ POST |
| GET/PUT/DELETE | `/api/heritage/:id` | Detalle / editar / retirar | public GET, editor+ |
| POST | `/api/uploads` | Subir archivo (`multipart/form-data`, campo `file`, `folder`) | editor+ |
| GET | `/uploads/:folder/:file` | Entregar archivo estático | public |

## Eventos Socket.IO

| Evento | Payload | Descripción |
|---|---|---|
| `content:published` | `{ entity: 'Work'\|'Event'\|'HeritageItem', id, title }` | Se emite al publicar contenido |

## Códigos de error

| Código | HTTP | Significado |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Datos inválidos |
| `UNAUTHORIZED` | 401 | Token ausente/inválido/expirado |
| `FORBIDDEN` | 403 | Rol insuficiente |
| `NOT_FOUND` | 404 | Recurso o endpoint inexistente |
| `CONFLICT` | 409 | Valor duplicado (email) |
| `RATE_LIMITED` | 429 | Demasiadas peticiones |
| `SERVER_ERROR` | 500 | Error interno (mensaje legible) |
