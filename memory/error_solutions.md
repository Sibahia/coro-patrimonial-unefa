# error_solutions.md

Registro de errores, soluciones y parches aplicados.

## ES-001 — `PORT=0` se resolvía al puerto 3500 (2026-11-23)

**Síntoma:** al ejecutar las pruebas con `PORT=0`, el servidor informaba el puerto 3500 en lugar de asignar uno libre.

**Causa:** `Number(process.env.PORT) || 3500` trata `0` como valor falsy.

**Solución:** usar `process.env.PORT === undefined ? 3500 : Number(process.env.PORT)` y devolver el puerto real desde `this.server.address().port`.

**Verificación:** `npm test` arranca el servidor en un puerto efímero y las 5 pruebas pasan.

## ES-002 — Los GET públicos no reconocían al administrador (2026-11-23)

**Síntoma:** la prueba "admin crea Works y el público solo ve publicados" fallaba: el listado con token de admin devolvía únicamente las obras publicadas.

**Causa:** las rutas GET de contenido no tenían middleware de autenticación; por tanto `req.user` era `undefined` y `createCrudController` aplicaba el filtro público.

**Solución:** añadir el middleware `optionalAuth` a los GET de `members`, `works`, `events` y `heritage`. Adjunta `req.user` si el token es válido y deja pasar al visitante anónimo si no lo es.

**Verificación:** las obras publicadas son visibles para todos y los borradores solo para usuarios autenticados.

## ES-003 — Protección de rama rechazada por GitHub (HTTP 422) (2026-11-23)

**Síntoma:** `gh api -X PUT .../branches/main/protection` respondía `No subschema in "anyOf" matched` para los objetos JSON.

**Causa:** PowerShell eliminaba las comillas de los objetos pasados con `-f`/`-F`, por lo que GitHub recibía cadenas como `{strict:true,contexts:[]}`.

**Solución:** construir el cuerpo con `ConvertTo-Json -Depth 6 -Compress` y enviarlo por stdin con `gh api --input -`.

**Verificación:** la protección quedó activa con 1 aprobación, `enforce_admins`, sin force push ni borrado, historial lineal y resolución de conversaciones.

## ES-004 — Refresh tokens duplicados al rotar dentro del mismo segundo (2026-11-24)

**Síntoma:** la prueba de rotación devolvía HTTP 409 y `errorHandler` registraba `E11000 duplicate key error ... index: tokenHash_1`.

**Causa:** `jsonwebtoken` calcula `iat` en segundos; dos refresh tokens firmados para el mismo usuario en el mismo segundo eran byte-idénticos y chocaban con el índice único de `RefreshToken.tokenHash`.

**Solución:** incluir `jti: crypto.randomUUID()` en el payload del refresh token para garantizar unicidad aunque `iat` no cambie.

**Verificación:** `npm test` pasa las 14 pruebas, incluida la rotación y la detección de reutilización del refresh token.

## ES-005 — JSON malformado devolvía 500 (2026-11-25)

**Síntoma:** una petición con cuerpo JSON inválido respondía `500 SERVER_ERROR` y registraba un stack de `SyntaxError`.

**Causa:** `body-parser` marca el error con `type: 'entity.parse.failed'` y `status: 400`, pero `errorHandler` no lo reconocía y caía en la rama genérica.

**Solución:** traducir `entity.parse.failed` y `entity.too.large` a `400 VALIDATION_ERROR`, y dejar `console.error` solo para errores inesperados.

**Verificación:** nueva prueba `JSON malformado devuelve 400 y no un error interno`; suite completa en verde.

## ES-006 — Filtro público eludible en `/api/members` (2026-11-25)

**Síntoma:** un visitante podía consultar `GET /api/members?isActive=false` y ver integrantes dados de baja.

**Causa:** `createCrudController` aplicaba `publicFilter` antes de copiar los filtros de `req.query`, por lo que `isActive` de la query sobrescribía el filtro público.

**Solución:** aplicar `publicFilter` y `publishedField` después de procesar `search`, `allowedFilters`, `tag`, `year` y `featured`.

**Verificación:** prueba `members: validación, baja lógica y filtro público no eludible`, que consulta con `?isActive=false` y confirma que el integrante dado de baja no aparece.

## ES-007 — Detalle público exponía borradores (2026-11-25)

**Síntoma:** `GET /api/works/:id`, `/api/events/:id` y `/api/heritage/:id` devolvían documentos no publicados a visitantes anónimos, aunque el listado sí los ocultaba.

**Causa:** `getById` solo filtraba por `_id` y `deletedAt`; no aplicaba los filtros de visibilidad usados en `list`.

**Solución:** construir el filtro de `getById` con `publicFilter` y `publishedField` cuando `req.user` no existe.

**Verificación:** pruebas de eventos: el detalle de un borrador devuelve 404 para el público, 200 para administrador, 200 tras publicar y 404 después de marcarlo `finished`.

## ES-008 — Entorno con Node 24 frente a Node 26 exigido (2026-11-25)

**Síntoma:** `node -v` devolvía `v24.12.0` mientras `.nvmrc` y `engines.node` exigen 26; `fnm exec --using=26` fallaba porque la versión no estaba instalada.

**Causa:** fnm solo tenía la versión `system`. Además, `fnm use 26` no funciona en shells sin `fnm env`.

**Solución:** `fnm install 26` (instaló v26.13.1) y anteponer al PATH la carpeta `node.exe` de esa versión; CI usa `actions/setup-node` con `node-version: '26'`.

**Verificación:** `node -v` → `v26.13.1`; `npm test` → 27/27 y cobertura 91,17 % de líneas.

## ES-009 — Sintaxis de autenticación en Bruno 4.4.0 (2026-11-25)

**Síntoma:** `bru run` abortaba con `Expected end of input ... "auth:bearer"` en las peticiones con `auth { mode: bearer; bearer: ... }`.

**Causa:** Bruno 4.x dejó de aceptar el bloque genérico `auth {}` en archivos `.bru`; exige bloques específicos por mecanismo.

**Solución:** migrar siete peticiones a `auth:bearer { token: {{accessToken}} }`. Además, dentro de los scripts `tests {}` las variables `{{...}}` no se interpolan: se usa `bru.getEnvVar("adminEmail")` en lugar de `"{{adminEmail}}"`. Bruno CLI debe ejecutarse desde la raíz de la colección (`projects/backend/bruno`).

**Verificación:** `bru run --env Local -r` → 10/10 requests y 10/10 pruebas; salida en `docs/evidencias/bruno-local-run.txt`.
