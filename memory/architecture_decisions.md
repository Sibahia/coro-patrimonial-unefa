# architecture_decisions.md

Historial de decisiones de diseño del proyecto Coro Patrimonial UNEFA.

## AD-001 — Stack y versión de Node (2026-11-23)

**Decisión:** Backend en Node.js 26 ESM (`"type": "module"`), Express 5, Mongoose, Socket.IO, JWT + bcrypt, CORS con lista blanca y `express-rate-limit`. Se fija la versión con `.nvmrc` (`26`) y `engines.node >= 26`, gestionada con fnm.

**Motivo:** Cumplir `AGENTS.md` y evitar el desfase detectado (el entorno tenía Node v24.12). fnm permite usar v26 sin reemplazar el Node del sistema.

**Consecuencia:** El perfil de PowerShell del usuario carga `fnm env --use-on-cd` para seleccionar automáticamente la versión al entrar al proyecto.

## AD-002 — Entidades en inglés (2026-11-23)

**Decisión:** Entidades, campos, colecciones, rutas y eventos en inglés (`User`, `RefreshToken`, `Member`, `Work`, `Event`, `HeritageItem`, `Asset`, `AuditLog`). La documentación narrativa permanece en español.

**Motivo:** Homogeneizar identificadores con el estándar técnico y facilitar la interoperabilidad entre backend, frontend y móvil.

## AD-003 — Repositorio público con flujo solo-PR (2026-11-23)

**Decisión:** `Sibahia/coro-patrimonial-unefa` público; `main` protegida con PR obligatoria, 1 aprobación, squash merge como único método, borrado automático de la rama del PR, sin force push ni borrado de rama, `enforce_admins=true`.

**Motivo:** Evitar cambios directos sobre `main` y mantener un historial lineal legible.

## AD-004 — Persistencia y borrado lógico (2026-11-23)

**Decisión:** MongoDB con `deletedAt` para borrado lógico en contenido (`Work`, `Event`, `HeritageItem`, `Member`); `User` usa `isActive=false`; `RefreshToken` usa `revokedAt`. Solamente el contenido con `isPublished=true` (o `status=published`) es visible públicamente.

**Motivo:** Conservar el patrimonio documental y permitir recuperación ante errores.

## AD-005 — Exclusiones del repositorio (2026-11-23)

**Decisión:** No versionar `.env`, `node_modules`, logs ni `projects/backend/backup.doc` (binario sin identificar). En `uploads/` solo se versiona `apks/version.json`.

**Motivo:** El repo es público; evitar exposición de secretos y contenido desconocido.

## AD-006 — Imágenes de monumentos (2026-11-24)

**Decisión:** Los endpoints `POST /api/monuments` y `PUT /api/monuments/:id` aceptan imágenes en el campo multipart `images` (jpg, jpeg, png, webp), las guardan en `/uploads/images/` con nombre `<timestamp>-<random>.<ext>` y añaden las URLs al array `images`. En `PUT` se usa `$push` para conservar las imágenes previas; si falla la operación, se eliminan los archivos recién guardados.

**Motivo:** Mantener el historial fotográfico del monumento y evitar colisiones de nombres y archivos huérfanos.

**Consecuencia:** El campo `images` de `req.body` queda reservado para URLs existentes en `POST`; en `PUT` se ignora cuando hay archivos subidos.
