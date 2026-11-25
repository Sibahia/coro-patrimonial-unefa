# Despliegue del backend en Render

**Plataforma elegida:** Render · **Blueprint:** [`render.yaml`](../render.yaml) · **Fecha:** 2026-11-25

## 1. Estado actual

**Backend desplegado y verificado:** <https://coro-patrimonial-unefa-api.onrender.com>

| Dato | Valor |
|---|---|
| Servicio Render | `srv-dc3hiuk0916s738qi1tg` |
| Dashboard | <https://dashboard.render.com/web/srv-dc3hiuk0916s738qi1tg> |
| Rama desplegada | `feat/backend-test-evidence` (PR #4 abierto; tras el merge se pasa a `main`) |
| Deploy verificado | `dep-dc3hnqlg1s2s73eo3rug` · commit `cbe2b4c` · estado `live` |
| Base de datos | MongoDB Atlas M0, cluster `coro-patrimonial-unefa` (AWS Oregon) |
| Healthcheck | `GET /api/health` → `200`, `{ "ok": true }` |
| Evidencia | `docs/evidencias/postman-deployed-run.txt` (26 requests, 27 assertions, 0 fallos) |

El servicio se creó con la API pública de Render (`POST /v1/services`) porque la API no expone creación de Blueprints. `render.yaml` se mantiene versionado como referencia para recrear el servicio desde el dashboard.

## 2. Requisitos

| Requisito | Dónde obtenerlo |
|---|---|
| Cuenta de Render | <https://dashboard.render.com> → Sign up (GitHub funciona) |
| MongoDB Atlas | <https://www.mongodb.com/atlas> → cluster gratuito M0 → *Connect → Drivers* → URI |
| Repositorio accesible | <https://github.com/Sibahia/coro-patrimonial-unefa> |
| Node 26 | Lo fija el Blueprint con `NODE_VERSION=26` (el default de Render es 24) |

> Render no ofrece MongoDB administrado, por eso `MONGO_URI` se solicita al crear el Blueprint y apunta a MongoDB Atlas. Añade la IP saliente de Render o permite acceso desde cualquier IP (`0.0.0.0/0`) en Atlas si el cluster gratuito lo requiere.

## 3. Creación del servicio

### Vía utilisada: API pública de Render

```http
POST https://api.render.com/v1/services
Authorization: Bearer <RENDER_API_KEY>
```

Cuerpo relevante: `type=web_service`, `ownerId=<workspace>`, `repo=https://github.com/Sibahia/coro-patrimonial-unefa`, `branch=feat/backend-test-evidence`, `rootDir=projects/backend`, `runtime=node`, `plan=free`, `region=oregon`, `healthCheckPath=/api/health`, `buildCommand=npm ci`, `startCommand=npm start`.

Variables inyectadas como `envVars` (los secretos JWT con `generateValue: true`):

| Variable | Valor |
|---|---|
| `NODE_VERSION` | `26` |
| `NODE_ENV` | `production` |
| `MONGO_URI` | URI `mongodb+srv://…` de Atlas con base `coro_patrimonial_unefa` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Generados por Render |
| `CORS_ORIGINS` | `http://localhost:4200,https://coro-patrimonial-unefa-api.onrender.com` |
| `SEED_PASSWORD` | Contraseña fuerte del usuario semilla |
| `COOKIE_SECURE` | `true` |
| `UPLOAD_MAX_SIZE_MB` | `10` |

> La API pública no ofrece creación de Blueprints, pero `render.yaml` sigue siendo la referencia versionada para recrear el servicio desde **New → Blueprint** en el dashboard.

### Alternativa desde el Blueprint

1. En Render: **New → Blueprint** → conectar GitHub → seleccionar `Sibahia/coro-patrimonial-unefa`.
2. Elegir la rama que contiene `render.yaml` (`feat/backend-test-evidence` mientras el PR esté abierto; después, `main`).
3. Completar los valores `sync: false` (`MONGO_URI`, `CORS_ORIGINS`, `SEED_PASSWORD`) y aplicar.

### Configuración efectiva

| Campo | Valor | Motivo |
|---|---|---|
| `rootDir` | `projects/backend` | El backend es un monorepo; el `package.json` está en ese subdirectorio. |
| `buildCommand` | `npm ci` | Instalación reproducible desde `package-lock.json`. |
| `startCommand` | `npm start` | `node index.js`; respeta el `PORT` que inyecta Render. |
| `healthCheckPath` | `/api/health` | Render marca el despliegue como live solo si responde 200. |
| `plan` | `free` | Sin costo. Se suspende tras inactividad; el primer smoke test puede tardar ~30-60 s. |

### Seed de usuarios

`initialDeployHook` existe en el Blueprint, pero **no está disponible en `servicePOST` de la API**; los *one-off jobs* (`POST /services/{id}/jobs`) requieren plan de pago. Por eso el seed se ejecutó con Node 26 contra la misma URI de Atlas:

```bash
MONGO_URI='mongodb+srv://…' SEED_PASSWORD='…' npm --prefix projects/backend run seed
```

El script es idempotente y crea `admin@coro.local`, `editor@coro.local` y `viewer@coro.local`.

## 4. Verificación

```bash
curl https://coro-patrimonial-unefa-api.onrender.com/api/health
```

Respuesta obtenida:

```json
{ "ok": true, "data": { "status": "ok", "uptime": 241.8, "timestamp": "2026-11-25T17:27:37.321Z" } }
```

Si el primer request da `503`, esperar a que Render despierte el servicio y repetir.

## 5. Postman contra el despliegue

Los entornos `Deployed` ya están configurados con la URL pública y la contraseña del usuario semilla:

- `docs/postman/Deployed.postman_environment.json`
- `projects/backend/bruno/environments/Deployed.bru`

Ejecución desde la raíz del repositorio:

```bash
newman run docs/postman/coro-patrimonial-unefa.postman_collection.json \
  -e docs/postman/Deployed.postman_environment.json -r cli
```

Resultado guardado en `docs/evidencias/postman-deployed-run.txt`: **26 requests · 27 assertions · 0 fallos**.

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

- [x] Servicio Render creado y en estado `live`.
- [x] Health público verificado.
- [x] Seed ejecutado contra Atlas.
- [x] Entornos `Deployed` de Postman y Bruno actualizados.
- [x] Newman ejecutado contra la URL pública y evidencia guardada.
- [x] Fila 7 de [`docs/evidencias/matriz_entregables.md`](evidencias/matriz_entregables.md) marcada ✅ (10/10).
