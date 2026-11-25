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

## AD-007 — Middleware de autenticación y endurecimiento JWT (2026-11-24)

**Decisión:** El middleware se llama `projects/backend/middlewares/auth.middleware.js` (se renombró desde `auth.js` y se actualizaron los 8 imports). Exporta `requireAuth`, `optionalAuth` y `requireRole`. El parseo de `Authorization` acepta solo `Bearer <token>` (insensible a mayúsculas, sin tokens vacíos), distingue 401 por JWT de 500 por error de base de datos y rechaza tokens con `type: 'refresh'` usados como access. `POST /api/auth/logout` exige `requireAuth` según `api_contracts.md`.

**Decisión complementaria:** los access tokens incluyen `type: 'access'`; los refresh tokens incluyen `jti` aleatorio, se validan contra el hash persistido y rotan de forma atómica. Si se reutiliza un refresh ya revocado se revocan todas las sesiones activas del usuario. En producción, el arranque falla si faltan `JWT_ACCESS_SECRET` o `JWT_REFRESH_SECRET`; en desarrollo se conservan los valores de fallback.

**Motivo:** Cumplir la petición de nombre de archivo, evitar confusión entre tipos de token, soportar rotación segura y detectar robo de sesión sin exponer errores internos como mensajes de autenticación.

## AD-008 — Filtros públicos obligatorios (2026-11-25)

**Decisión:** En `helpers/crud.js`, los filtros `publicFilter` y `publishedField` se aplican **al final** del armado del filtro, tanto en `list` como en `getById`. Ningún parámetro de query puede sobrescribir la visibilidad pública.

**Motivo:** Cumplir F6 de `business_rules.md` y evitar que `?isActive=false` o un ID de borrador exponga contenido no publicado.

**Consecuencia:** Los administradores siguen viendo borradores porque `optionalAuth` adjunta `req.user` cuando el token es válido.

## AD-009 — Postman como referencia principal y Bruno como apoyo local (2026-11-25)

**Decisión:** La documentación de API entregable es `context/api_contracts.md` más una colección Postman v2.1 en `docs/postman/`. Bruno se mantiene en `projects/backend/bruno/` únicamente para ejecución rápida en el entorno local y no se presenta como sustituto del entregable.

**Motivo:** La rúbrica pide explícitamente "Documentación de API / Postman", mientras que Bruno aporta colecciones versionables y comodidad local sin comprometer la evidencia.

## AD-010 — CI con Node 26 y cobertura como evidencia (2026-11-25)

**Decisión:** `.github/workflows/backend-tests.yml` ejecuta `npm ci`, `npm test` y `npm run test:coverage` con `actions/setup-node` fijado en Node 26. Los reportes TAP y de cobertura se versionan en `docs/evidencias/`.

**Motivo:** Hacer reproducible y pública la verificación del backend, y cerrar la brecha entre código probado y evidencia entregada.

## AD-011 — Render como plataforma de despliegue (2026-11-25)

**Decisión:** El backend se despliega en Render mediante el Blueprint `render.yaml` (web service Node 26, `rootDir: projects/backend`, `buildCommand: npm ci`, `startCommand: npm start`, `healthCheckPath: /api/health` y `initialDeployHook: npm run seed`). MongoDB se apunta a Atlas con `MONGO_URI` y los secretos JWT se generan en Render. El plan inicial es gratuito, con el directorio `/uploads` efímero; la persistencia con disco de pago queda documentada como mejora posterior.

**Motivo:** El usuario eligió Render entre las alternativas planteadas; el Blueprint deja el despliegue reproducible y auditable desde el repositorio.

**Consecuencia:** No se ejecutó el despliegue porque el entorno no tiene `RENDER_API_KEY` ni URI de Atlas. `docs/despliegue_render.md` detalla los pasos para crearlo y cerrar el entregable 7.
