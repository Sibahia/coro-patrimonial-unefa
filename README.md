# Coro Patrimonial UNEFA

Plataforma web y móvil para gestionar y difundir el patrimonio cultural del Coro de la UNEFA: integrantes, repertorio, eventos y archivo histórico (fotografías, documentos, audios y videos).

## Requisitos

- **Node.js 26+** (ver `.nvmrc`). Se recomienda [fnm](https://github.com/Schniz/fnm): `fnm use` al entrar a la carpeta selecciona la versión correcta.
- MongoDB (local o Atlas).
- npm 11+.

## Estructura

```text
context/    → contexto de negocio, reglas y contratos de API
skills/     → guías metodológicas
memory/     → decisiones de arquitectura y soluciones
projects/
  backend/  → API REST + Socket.IO (Express 5, Mongoose, JWT)
  frontend/ → SPA Angular (Standalone + Signals)
  mobile/   → App Android Kotlin (MVVM + Retrofit)
```

## Backend

```bash
cd projects/backend
cp .env.example .env      # configurar MONGO_URI y secretos
npm ci
npm run dev               # node --watch, puerto 3500 por defecto
npm run seed              # datos iniciales (admin + contenido de ejemplo)
npm start                 # producción
```

Verificación rápida: `GET http://localhost:3500/api/health`.

Si `fnm use` no funciona en tu shell, activa Node 26 anteponiendo su ruta al PATH:

```powershell
$node26 = fnm exec --using=26 -- node -p "process.execPath"
$env:PATH = (Split-Path $node26) + ";" + $env:PATH
```

### Sin MongoDB local

```bash
cd projects/backend
npm run dev:memory        # MongoDB en memoria + API en http://127.0.0.1:3500
```

Siembra `admin@coro.local`, `editor@coro.local` y `viewer@coro.local` (contraseña `CoroUnefa2026!`). Los datos se pierden al detener el proceso.

## Pruebas y evidencias

```bash
cd projects/backend
npm test                  # 27 pruebas: 27 pass, 0 fail
npm run test:tap          # reporte TAP
npm run test:coverage     # 91,17 % líneas · 90,80 % funciones · 79,20 % ramas
```

- [Evidencia de pruebas](docs/evidencias/backend_tests.md) · [TAP](docs/evidencias/backend-test-results.tap) · [Cobertura](docs/evidencias/backend-coverage.txt)
- [Matriz de entregables](docs/evidencias/matriz_entregables.md)
- CI: `.github/workflows/backend-tests.yml` (Node 26, `npm ci`, `npm test`, cobertura)

## Documentación

- [Documento principal](docs/documento_principal.md) · [Estudio](docs/estudio_investigacion.md)
- [Requerimientos y casos de uso](docs/requerimientos_casos_de_uso.md) · [Arquitectura y modelo de datos](docs/arquitectura_modelo_datos.md) · [Planificación y riesgos](docs/planificacion_riesgos.md)
- [Manual de instalación](docs/manual_instalacion.md) · [Contrato de API](context/api_contracts.md)
- **Postman (referencia principal):** importar `docs/postman/coro-patrimonial-unefa.postman_collection.json` con `docs/postman/Local.postman_environment.json`. Evidencia: [Newman](docs/evidencias/postman-run.txt).
- **Bruno (apoyo local):** `projects/backend/bruno/`. Evidencia: [ejecución local](docs/evidencias/bruno-local-run.txt).

## Convenciones del repositorio

- La rama `main` está protegida: **solo se puede actualizar mediante Pull Request**, con squash merge y borrado automático de la rama del PR.
- Los identificadores de entidades, campos, colecciones y rutas van en **inglés**; la documentación narrativa puede estar en español.
- Los secretos y `projects/backend/backup.doc` están excluidos del repositorio público.
