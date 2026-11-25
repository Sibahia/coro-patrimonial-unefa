# Manual de instalación y ejecución

Versión: 1.0 · Fecha: 2026-11-25

## 1. Requisitos previos

| Herramienta | Versión | Verificación |
|---|---|---|
| Node.js | 26.x (fijado en `.nvmrc`) | `node -v` → `v26.x.x` |
| npm | 11.x | `npm -v` |
| fnm | 1.39+ (recomendado) | `fnm --version` |
| MongoDB | Local o Atlas | `mongosh --version` o URI válida |
| Git y GitHub CLI | Para PRs | `git --version`, `gh auth status` |

## 2. Seleccionar Node 26 con fnm

```powershell
fnm install 26
fnm use 26
node -v
```

Si la shell no tiene cargado `fnm env`, se puede usar la ruta explícita:

```powershell
$node26 = fnm exec --using=26 -- node -p "process.execPath"
$env:PATH = (Split-Path $node26) + ";" + $env:PATH
node -v
```

> En el entorno de desarrollo de este proyecto el perfil de PowerShell carga `fnm env --use-on-cd`, por lo que `fnm use` no es necesario al entrar a la carpeta.

## 3. Instalación local

```bash
git clone git@github.com:Sibahia/coro-patrimonial-unefa.git
cd coro-patrimonial-unefa/projects/backend
cp .env.example .env
npm ci
```

Editar `.env` con valores reales:

```dotenv
NODE_ENV=development
PORT=3500
MONGO_URI=mongodb://127.0.0.1:27017/coro_patrimonial_unefa
JWT_ACCESS_SECRET=<secreto-largo-y-aleatorio>
JWT_REFRESH_SECRET=<secreto-largo-y-aleatorio-distinto>
CORS_ORIGINS=http://localhost:4200,http://localhost:5173
UPLOAD_MAX_SIZE_MB=10
```

En producción, el arranque falla si faltan los secretos JWT. Nunca versionar `.env`.

## 4. Datos iniciales

```bash
npm run seed
```

Usuarios creados (contraseña por defecto `CoroUnefa2026!`, configurable con `SEED_PASSWORD`):

| Email | Rol |
|---|---|
| `admin@coro.local` | admin |
| `editor@coro.local` | editor |
| `viewer@coro.local` | viewer |

El seeder es idempotente: no duplica usuarios ni contenido si ya existe.

## 5. Ejecutar

```bash
npm run dev     # recarga con node --watch
npm start       # producción
```

Verificación rápida:

```bash
curl http://localhost:3500/api/health
```

Respuesta esperada: `{ "ok": true, "data": { "status": "ok", ... } }`.

## 6. Pruebas automatizadas

```bash
npm test                # 27 pruebas, MongoDB en memoria
npm run test:tap        # salida TAP para evidencia
npm run test:coverage   # cobertura de líneas, ramas y funciones
```

Las pruebas levantan su propio `MongoMemoryServer` y servidor en puerto efímero; no necesitan MongoDB local ni borrar datos reales. Los reportes generados están en `docs/evidencias/`.

## 7. Documentación de API (referencia principal)

1. Abrir Postman e importar `docs/postman/coro-patrimonial-unefa.postman_collection.json`.
2. Importar `docs/postman/Local.postman_environment.json`.
3. Seleccionar el entorno `Local` y ejecutar, en orden: `Health → Auth/Login → resto de carpetas`.
4. La petición `Auth/Login` guarda automáticamente `accessToken` en variables de entorno.

Ejecución por CLI (opcional):

Ejecutar desde la raíz del repositorio (el archivo `fixtures/sample.png` se resuelve desde ahí):

```bash
npm install -g newman
newman run docs/postman/coro-patrimonial-unefa.postman_collection.json \
  -e docs/postman/Local.postman_environment.json \
  -r cli
```

La evidencia de la ejecución local está en `docs/evidencias/postman-run.txt`.

## 8. Bruno (apoyo solo local)

Bruno se usa únicamente para iterar rápido en este entorno; **no sustituye a Postman** como documentación entregable.

```bash
npm install -g @usebruno/cli
cd projects/backend
bru run bruno --env Local -r --reporter-json ../docs/evidencias/bruno-local-results.json
```

La colección está en `projects/backend/bruno/` y replica los mismos casos que Postman.

## 9. Despliegue con PM2

```bash
cp .env.example .env      # valores de producción
pm2 start ecosystem.config.cjs --env production
pm2 save
```

Antes de actualizar un servidor remoto, ejecutar el respaldo descrito en `AGENTS.md` (copia de la fuente y `mongodump`). Después de sincronizar, recargar con:

```bash
pm2 reload ecosystem.config.cjs --env production
```

## 10. Solución de problemas

| Síntoma | Causa probable | Acción |
|---|---|---|
| `Requested version v26.x.x is not currently installed` | fnm sin Node 26 | `fnm install 26` |
| `npm` no corresponde a Node 26 | PATH apunta al Node del sistema | Usar el snippet del apartado 2 |
| Error de descarga de `mongodb-memory-server` | Sin red o caché vacía | Reintentar o permitir el script de postinstalación |
| `401 UNAUTHORIZED` en el panel | Token expirado o usuario inactivo | `POST /api/auth/refresh` o nuevo login |
| `403 FORBIDDEN` al crear contenido | Rol `viewer` | Usar usuario `admin` o `editor` |
| `400 VALIDATION_ERROR` | Campos obligatorios ausentes o MIME inválido | Revisar `context/api_contracts.md` y `middlewares/validators.js` |
| `429 RATE_LIMITED` | Demasiadas peticiones | Esperar 15 minutos o revisar `middlewares/rateLimit.js` |
