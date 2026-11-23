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
npm install
npm run dev               # node --watch, puerto 3500 por defecto
npm run seed              # datos iniciales (admin + contenido de ejemplo)
npm start                 # producción
```

Verificación rápida: `GET http://localhost:3500/api/health`.

## Convenciones del repositorio

- La rama `main` está protegida: **solo se puede actualizar mediante Pull Request**, con squash merge y borrado automático de la rama del PR.
- Los identificadores de entidades, campos, colecciones y rutas van en **inglés**; la documentación narrativa puede estar en español.
- Los secretos y `projects/backend/backup.doc` están excluidos del repositorio público.
