# Matriz de entregables

**Proyecto:** Coro Patrimonial UNEFA · **Versión:** 1.0 · **Fecha:** 2026-11-25 · **Rama de trabajo:** `feat/backend-test-evidence`

Estado: ✅ disponible · 🔄 pendiente de publicación externa · ⏳ depende de decisión externa.

| # | Entregable | Estado | Archivo o URL |
|---|---|---|---|
| 1 | Documento principal del proyecto | ✅ | [`docs/documento_principal.md`](../documento_principal.md) |
| 2 | Estudio / investigación | ✅ | [`docs/estudio_investigacion.md`](../estudio_investigacion.md) |
| 3 | Requerimientos y casos de uso | ✅ | [`docs/requerimientos_casos_de_uso.md`](../requerimientos_casos_de_uso.md) |
| 4 | Arquitectura y modelo de datos | ✅ | [`docs/arquitectura_modelo_datos.md`](../arquitectura_modelo_datos.md) |
| 5 | Planificación y riesgos | ✅ | [`docs/planificacion_riesgos.md`](../planificacion_riesgos.md) |
| 6 | Repositorio del backend | ✅ | <https://github.com/Sibahia/coro-patrimonial-unefa> · rama `feat/backend-test-evidence` → PR con squash |
| 7 | URL del backend desplegado | 🔄 | Plataforma elegida: **Render**. Blueprint listo en [`render.yaml`](../../render.yaml) y guía en [`docs/despliegue_render.md`](../despliegue_render.md). Falta ejecutar el Blueprint (sin credenciales aquí). Verificar con `GET /api/health`. Placeholder en [`Deployed.postman_environment.json`](../postman/Deployed.postman_environment.json) |
| 8 | Documentación de API / Postman | ✅ | [`context/api_contracts.md`](../../context/api_contracts.md) · [`docs/postman/`](../postman/) · evidencia Newman: [`postman-run.txt`](./postman-run.txt) |
| 9 | Evidencia de pruebas del backend | ✅ | [`docs/evidencias/backend_tests.md`](./backend_tests.md) · [`backend-test-results.tap`](./backend-test-results.tap) · [`backend-coverage.txt`](./backend-coverage.txt) |
| 10 | README y manual de instalación | ✅ | [`README.md`](../../README.md) · [`docs/manual_instalacion.md`](../manual_instalacion.md) |

## Resumen

- **Disponibles ahora:** 9/10 entregables con archivo o URL verificable.
- **Pendiente:** URL pública del backend (entregable 7). La plataforma ya está decidida (Render) y el Blueprint está versionado; solo falta ejecutarlo con credenciales de la cuenta del proyecto.
- **Nomenclatura de evidencias:** se desconoce si la rúbrica exige nombres de carpeta/archivo concretos, por lo que se conserva `docs/evidencias/` con nombres descriptivos. Si se indican otros nombres, se renombran o duplican los archivos sin cambiar su contenido.

## Evidencias complementarias

| Evidencia | Ubicación | Resultado |
|---|---|---|
| Pruebas unitarias/de integración | `docs/evidencias/backend-test-results.tap` | 27/27 pass |
| Cobertura | `docs/evidencias/backend-coverage.txt` | 91,17 % líneas · 90,80 % funciones · 79,20 % ramas |
| Colección Postman ejecutada | `docs/evidencias/postman-run.txt` | 26 requests · 27 asserts · 0 fallos |
| Colección Bruno (apoyo local) | `docs/evidencias/bruno-local-run.txt` | 10/10 requests y pruebas |
| CI | `.github/workflows/backend-tests.yml` | Node 26 en push y PR |

## Cierre del entregable 7

Para completar la matriz al 10/10, con Render ya elegido, hay que:

1. Abrir <https://dashboard.render.com> → **New → Blueprint** y seleccionar el repositorio y la rama que contiene `render.yaml`.
2. Completar `MONGO_URI` (MongoDB Atlas), `CORS_ORIGINS` y `SEED_PASSWORD` cuando Render lo solicite; los secretos JWT se generan solos.
3. Verificar `https://<SERVICIO>.onrender.com/api/health` → `{ "ok": true, "data": { "status": "ok", ... } }`. El detalle está en [`docs/despliegue_render.md`](../despliegue_render.md).
4. Reemplazar `https://REEMPLAZAR-POR-URL-DEL-BACKEND` en `docs/postman/Deployed.postman_environment.json` y `projects/backend/bruno/environments/Deployed.bru`.
5. Ejecutar la colección Postman con el entorno `Deployed` y añadir la salida a `docs/evidencias/`.
6. Actualizar esta fila con la URL y marcar ✅.

Si la rúbrica exige además un enlace público al Workspace de Postman, se debe publicar la colección desde una cuenta de Postman y añadir ese enlace en la fila 8; la colección versionada ya está lista para importar.
