# Despliegue del backend en Render

**Plataforma elegida:** Render · **Blueprint:** [`render.yaml`](../render.yaml) · **Fecha:** 2026-11-25

## 1. Estado actual

El Blueprint está versionado y listo, pero **no se ha ejecutado el despliegue** porque en este entorno no hay credenciales de Render (`RENDER_API_KEY`) ni una URI de MongoDB Atlas. La URL pública del entregable 7 se completa siguiendo los pasos de este documento.

## 2. Requisitos

| Requisito | Dónde obtenerlo |
|---|---|
| Cuenta de Render | <https://dashboard.render.com> → Sign up (GitHub funciona) |
| MongoDB Atlas | <https://www.mongodb.com/atlas> → cluster gratuito M0 → *Connect → Drivers* → URI |
| Repositorio accesible | <https://github.com/Sibahia/coro-patrimonial-unefa> |
| Node 26 | Lo fija el Blueprint con `NODE_VERSION=26` (el default de Render es 24) |

> Render no ofrece MongoDB administrado, por eso `MONGO_URI` se solicita al crear el Blueprint y apunta a MongoDB Atlas. Añade la IP saliente de Render o permite acceso desde cualquier IP (`0.0.0.0/0`) en Atlas si el cluster gratuito lo requiere.

## 3. Crear el servicio desde el Blueprint

1. En Render: **New → Blueprint**.
2. Conectar la cuenta de GitHub y seleccionar `Sibahia/coro-patrimonial-unefa`.
3. Elegir la rama que contiene `render.yaml` (`feat/backend-test-evidence` mientras el PR esté abierto; después, `main`).
4. Render detecta el Blueprint y pide los valores `sync: false`:

| Variable | Valor sugerido |
|---|---|
| `MONGO_URI` | `mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/coro_patrimonial_unefa` |
| `CORS_ORIGINS` | `https://<frontend>.onrender.com,http://localhost:4200` (el dominio real del SPA cuando exista) |
| `SEED_PASSWORD` | Contraseña larga para los usuarios semilla; **no usar la del ejemplo en producción** |

5. Las variables `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` se generan automáticamente (`generateValue: true`); no hay que pegarlas a mano.
6. **Apply**. El build ejecuta `npm ci`, el arranque `npm start` y, tras el primer despliegue correcto, `initialDeployHook` corre `npm run seed`.

### Qué hace el Blueprint

| Campo | Valor | Motivo |
|---|---|---|
| `rootDir` | `projects/backend` | El backend es un monorepo; el `package.json` está en ese subdirectorio. |
| `buildCommand` | `npm ci` | Instalación reproducible desde `package-lock.json`. |
| `startCommand` | `npm start` | `node index.js`; respeta el `PORT` que inyecta Render. |
| `healthCheckPath` | `/api/health` | Render marca el despliegue como live solo si responde 200. |
| `initialDeployHook` | `npm run seed` | Crea `admin@coro.local`, `editor@coro.local` y `viewer@coro.local` para poder ejecutar Postman. |
| `plan` | `free` | Sin costo. Se suspende tras inactividad; el primer smoke test puede tardar ~30-60 s. |

## 4. Verificación

```bash
curl https://<SERVICIO>.onrender.com/api/health
```

Respuesta esperada:

```json
{ "ok": true, "data": { "status": "ok", "uptime": 12.3, "timestamp": "..." } }
```

Si el primer request da `503`, esperar a que Render despierte el servicio y repetir.

## 5. Ejecutar Postman contra el despliegue

1. Abrir `docs/postman/Deployed.postman_environment.json`.
2. Reemplazar `https://REEMPLAZAR-POR-URL-DEL-BACKEND` por `https://<SERVICIO>.onrender.com`.
3. Ajustar `adminPassword` al valor de `SEED_PASSWORD` usado en el paso 3.
4. Ejecutar desde la raíz del repositorio:

```bash
newman run docs/postman/coro-patrimonial-unefa.postman_collection.json \
  -e docs/postman/Deployed.postman_environment.json -r cli
```

5. Guardar la salida en `docs/evidencias/postman-deployed-run.txt`.
6. Repetir el reemplazo en `projects/backend/bruno/environments/Deployed.bru` si se quiere la misma verificación con Bruno.

## 6. Persistencia de archivos (opcional)

El plan gratuito **no tiene disco persistente**: los archivos subidos a `/uploads` se pierden al redesplegar. Para conservarlos:

1. Cambiar `plan: free` por `plan: 0.5c-512mb` (de pago).
2. Añadir al servicio del Blueprint:

```yaml
    disk:
      name: coro-uploads
      mountPath: /opt/coro-uploads
      sizeGB: 1
```

3. Añadir la variable `UPLOADS_DIR=/opt/coro-uploads` y adaptar `uploadsRoot` en `api/uploads/controller.js`, `api/monuments/monument.controller.js` y `bin/server.js` para leerla con un valor por defecto igual al directorio actual.

Esta mejora no es necesaria para la evidencia académica de la API; queda registrada como trabajo posterior.

## 7. Actualizaciones y respaldo

Si el despliegue pasa a una VPS con PM2, aplicar el protocolo de `AGENTS.md`: respaldo de la fuente y `mongodump`, sincronización excluyendo `.env`, `node_modules` y `uploads/`, y `pm2 reload ecosystem.config.cjs --env production`.

En Render, cada push a la rama vinculada dispara un despliegue; para una actualización manual se puede usar `render deploys create <serviceID> --wait` o el botón *Manual Deploy* del dashboard. Antes de tocar datos reales, exportar desde Atlas.

## 8. Cierre del entregable 7

Una vez verificada la URL:

- Reemplazar el placeholder en `docs/postman/Deployed.postman_environment.json` y `projects/backend/bruno/environments/Deployed.bru`.
- Añadir la salida de Newman a `docs/evidencias/`.
- Actualizar la fila 7 de [`docs/evidencias/matriz_entregables.md`](evidencias/matriz_entregables.md) con la URL y marcar ✅.
- El PR #4 se actualizará con un commit adicional; no hace falta abrir otro PR.
