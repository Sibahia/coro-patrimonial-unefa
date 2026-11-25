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

## ES-010 — Seed rechazado por `language_override: 'la'` en Atlas (2026-11-25)

**Síntoma:** `npm run seed` contra Atlas fallaba con `language override unsupported: la` al crear las obras de ejemplo.

**Causa:** El esquema `Work` tiene un campo `language` con códigos como `la` (latín). Mongoose detecta automáticamente ese campo como `language_override` del índice de texto y MongoDB no admite `la` como idioma de texto. El índice ya creado tenía `language_override: 'language'`.

**Solución:** Declarar el índice con `language_override: 'textLanguage'` (campo inexistente, por lo que se usa el idioma por defecto), eliminar el índice anterior en Atlas y reejecutar el seed.

**Verificación:** El índice quedó con `language_override: 'textLanguage'`; el seed termina con `[seed] contenido de ejemplo listo` y Newman pasa el listado/creación de Works contra el despliegue.

## ES-011 — Upload con 500 en Render por EXDEV (2026-11-25)

**Síntoma:** `POST /api/uploads` respondía `500 SERVER_ERROR` en Render, aunque pasaba en local.

**Causa:** Los logs de Render mostraban `EXDEV: cross-device link not permitted`: `express-fileupload` escribe el temporal en `/tmp` y el código hacía `fs.rename()` hacia `/opt/render/project/src/...`, que están en dispositivos distintos.

**Solución:** Reemplazar `rename` por `fs.copyFile()` + `fs.unlink()` del temporal en `api/uploads/controller.js` (el controlador de monumentos ya tenía fallback para EXDEV).

**Verificación:** Tras el redeploy del commit `cbe2b4c`, Newman contra `Deployed` devuelve `201 Created` en la subida de imagen: 26 requests y 27 assertions sin fallos.

## ES-012 — One-off jobs de Render exigen plan de pago (2026-11-25)

**Síntoma:** `POST /v1/services/{id}/jobs` respondía `400 {"message":"new paid services not allowed: srv-..."}`.

**Causa:** Los trabajos de un solo uso de Render no están disponibles en el plan free.

**Solución:** Ejecutar el seed localmente con Node 26 apuntando a la misma URI de Atlas en lugar de usar un job de Render.

**Verificación:** Usuarios semilla creados y login administrativo correcto contra `https://coro-patrimonial-unefa-api.onrender.com/api/auth/login`.

## ES-013 — Contraseña semilla versionada en los entornos `Deployed` (2026-11-25)

**Síntoma:** La contraseña del usuario semilla quedó guardada en `docs/postman/Deployed.postman_environment.json` y `projects/backend/bruno/environments/Deployed.bru`, incumpliendo la regla de no commitear secretos.

**Causa:** Los entornos se rellenaron con el valor real para poder ejecutar Newman contra el despliegue.

**Solución:** Rotar la contraseña (nuevo hash en los tres usuarios y variable `SEED_PASSWORD` actualizada en Render), dejar `adminPassword` vacío en los archivos versionados y pasar el valor con `--env-var` en la ejecución de Newman.

**Verificación:** Newman vuelve a pasar 26 requests y 27 assertions sin fallos usando la credencial rotada; ningún secreto queda en los entornos versionados.
