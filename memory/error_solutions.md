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
