# Evidencia de pruebas del backend

**Fecha:** 2026-11-25 · **Rama:** `feat/backend-test-evidence` · **Node:** v26.13.1 · **npm:** 11.20.0

## 1. Entorno

| Elemento | Valor |
|---|---|
| Node.js | `v26.13.1` (instalado con `fnm install 26`) |
| npm | `11.20.0` |
| Sistema | Windows (PowerShell), arquitectura x64 |
| Base de datos de pruebas | `mongodb-memory-server@11.4.0` (efímera, sin MongoDB local) |
| Servidor HTTP | `bin/server.js`, puerto efímero asignado por el SO |
| Dependencias | `npm ci` con `package-lock.json` (171 paquetes, 0 vulnerabilidades) |

 Activación de Node 26 en PowerShell:

```powershell
$node26 = fnm exec --using=26 -- node -p "process.execPath"
$env:PATH = (Split-Path $node26) + ";" + $env:PATH
node -v   # v26.13.1
```

## 2. Suite automatizada (`node:test`)

```bash
cd projects/backend
npm test
npm run test:tap
npm run test:coverage
```

| Archivo | Pruebas | Estado |
|---|---|---|
| `tests/auth.test.js` | 6 | 6 pass, 0 fail |
| `tests/smoke.test.js` | 8 | 8 pass, 0 fail |
| `tests/api.test.js` | 13 | 13 pass, 0 fail |
| **Total** | **27** | **27 pass, 0 fail, 0 skipped** |

Reporte TAP: [`backend-test-results.tap`](./backend-test-results.tap) · líneas `# tests 27`, `# pass 27`, `# fail 0`.

### Cobertura

| Métrica | Resultado | Umbral |
|---|---|---|
| Líneas | **91,17 %** | ≥ 90 % ✅ |
| Funciones | **90,80 %** | ≥ 90 % ✅ |
| Ramas | 79,20 % | Sin umbral exigido |

Reporte completo: [`backend-coverage.txt`](./backend-coverage.txt).

### Alcance de las pruebas

- Contrato HTTP: envelope `{ ok, data }`, errores `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN` y `CONFLICT`.
- Autenticación: registro, login, `me`, login inválido, usuarios inactivos, rotación de refresh, detección de reutilización y logout.
- Roles: `viewer` no crea contenido ni lista usuarios; `editor` crea contenido pero no gestiona usuarios; `admin` accede a todo.
- Usuarios: alta, duplicado (409), edición, baja lógica e ID inválido (400).
- Integrantes: validación de `voiceType`, baja lógica y filtro público no eludible con `?isActive=false`.
- Obras: paginación, búsqueda, filtros por categoría y tag, borrado lógico y ocultación de borradores.
- Eventos: ciclo `draft → published → finished`, `populate` de obras/integrantes, visibilidad pública y validación de `startAt`.
- Archivo patrimonial: publicación, filtros `type/tag/year/featured` y validación de tipo.
- Monumentos: validación de categoría, borrado lógico y subida múltiple de imágenes jpg/png.
- Uploads: subida válida, entrega estática, carpeta MIME inválidos, archivo ausente y rol insuficiente.
- Tiempo real: emisión de `content:published` al publicar `Work`, `Event` y `HeritageItem`.
- Robustez: CORS con lista blanca, JSON malformado y ruta desconocida.

## 3. Colección Postman (referencia principal)

```bash
# desde la raíz del repositorio, con el servidor local en marcha
npm run dev:memory   # en projects/backend
newman run docs/postman/coro-patrimonial-unefa.postman_collection.json \
  -e docs/postman/Local.postman_environment.json -r cli
```

| Métrica | Resultado |
|---|---|
| Requests ejecutados | 26 |
| Requests fallidos | 0 |
| Scripts de prueba | 26 |
| Asserts | 27, 0 fallidos |
| Duración | ~3,1 s |

Salida completa: [`postman-run.txt`](./postman-run.txt).

Colección y entornos:

- [`../postman/coro-patrimonial-unefa.postman_collection.json`](../postman/coro-patrimonial-unefa.postman_collection.json)
- [`../postman/Local.postman_environment.json`](../postman/Local.postman_environment.json)
- [`../postman/Deployed.postman_environment.json`](../postman/Deployed.postman_environment.json) — pendiente de sustituir el placeholder por la URL pública.

## 4. Colección Bruno (apoyo local)

Bruno **no sustituye** a Postman como documentación de API; se usa solo para iteración local y su colección está versionada en `projects/backend/bruno/`.

```bash
cd projects/backend/bruno
bru run --env Local -r
```

| Métrica | Resultado |
|---|---|
| Requests | 10, 10 pass |
| Pruebas | 10/10 |
| Estado | ✓ PASS |

Salida completa: [`bruno-local-run.txt`](./bruno-local-run.txt).

## 5. Integración continua

`.github/workflows/backend-tests.yml` ejecuta en Node 26, para `push` y `pull_request` que toquen `projects/backend/**`:

1. `actions/checkout@v4`
2. `actions/setup-node@v4` con `node-version: '26'` y caché de npm
3. `npm ci`
4. `npm test`
5. `npm run test:coverage`

## 6. Defectos detectados y corregidos durante la prueba

| ID | Defecto | Corrección | Registro |
|---|---|---|---|
| ES-005 | JSON malformado respondía 500 | `400 VALIDATION_ERROR` para `entity.parse.failed` / `entity.too.large` | `memory/error_solutions.md` |
| ES-006 | `?isActive=false` revelaba integrantes dados de baja | Filtros públicos aplicados al final del listado | `memory/error_solutions.md` |
| ES-007 | Detalle público exponía borradores | Filtros públicos aplicados también en `getById` | `memory/error_solutions.md` |
| ES-008 | Node del sistema era v24 | Node 26.13.1 vía fnm y CI fijada en 26 | `memory/error_solutions.md` |
| ES-009 | Bloque `auth {}` inválido en Bruno 4.4.0 | Migrado a `auth:bearer { token: ... }` | `memory/error_solutions.md` |

## 7. Reproducción sin MongoDB local

`projects/backend/scripts/local-api-server.js` levanta `MongoMemoryServer` + la API en `http://127.0.0.1:3500` siembra tres usuarios (`admin@coro.local`, `editor@coro.local`, `viewer@coro.local`, contraseña `CoroUnefa2026!`). Los datos se descartan al detener el proceso. Es el servidor usado para las ejecuciones de Postman y Bruno documentadas arriba.
