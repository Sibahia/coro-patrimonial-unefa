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
| 7 | URL del backend desplegado | ✅ | <https://coro-patrimonial-unefa-api.onrender.com> · `GET /api/health` verificado · guía en [`docs/despliegue_render.md`](../despliegue_render.md) |
| 8 | Documentación de API / Postman | ✅ | [`context/api_contracts.md`](../../context/api_contracts.md) · [`docs/postman/`](../postman/) · evidencia Newman: [`postman-run.txt`](./postman-run.txt) |
| 9 | Evidencia de pruebas del backend | ✅ | [`docs/evidencias/backend_tests.md`](./backend_tests.md) · [`backend-test-results.tap`](./backend-test-results.tap) · [`backend-coverage.txt`](./backend-coverage.txt) |
| 10 | README y manual de instalación | ✅ | [`README.md`](../../README.md) · [`docs/manual_instalacion.md`](../manual_instalacion.md) |

## Resumen

- **Disponibles ahora:** 10/10 entregables con archivo o URL verificable.
- **Backend en producción:** Render (plan gratuito) + MongoDB Atlas M0; healthcheck público y colección Postman ejecutada contra la URL desplegada.
- **Nomenclatura de evidencias:** se desconoce si la rúbrica exige nombres de carpeta/archivo concretos, por lo que se conserva `docs/evidencias/` con nombres descriptivos. Si se indican otros nombres, se renombran o duplican los archivos sin cambiar su contenido.

## Evidencias complementarias

| Evidencia | Ubicación | Resultado |
|---|---|---|
| Pruebas unitarias/de integración | `docs/evidencias/backend-test-results.tap` | 27/27 pass |
| Cobertura | `docs/evidencias/backend-coverage.txt` | 91,17 % líneas · 90,80 % funciones · 79,20 % ramas |
| Colección Postman ejecutada | `docs/evidencias/postman-run.txt` | 26 requests · 27 asserts · 0 fallos |
| Colección Postman contra el despliegue | `docs/evidencias/postman-deployed-run.txt` | 26 requests · 27 asserts · 0 fallos (entorno `Deployed`) |
| Colección Bruno (apoyo local) | `docs/evidencias/bruno-local-run.txt` | 10/10 requests y pruebas |
| CI | `.github/workflows/backend-tests.yml` | Node 26 en push y PR |

## Cierre del entregable 7

El servicio se creó con la API pública de Render sobre la rama `feat/backend-test-evidence` (PR #4 abierto) y apunta a un cluster Atlas M0. `render.yaml` permanece versionado como referencia reproducible.

1. `GET https://coro-patrimonial-unefa-api.onrender.com/api/health` → `{ "ok": true, "data": { "status": "ok", ... } }`.
2. Seed ejecutado contra la misma URI de Atlas (los *one-off jobs* de Render requieren plan de pago).
3. Entornos `Deployed` de Postman y Bruno actualizados con la URL pública y la contraseña del usuario semilla.
4. Newman: 26 requests y 27 assertions sin fallos; salida en [`postman-deployed-run.txt`](./postman-deployed-run.txt).
5. Detalle completo en [`docs/despliegue_render.md`](../despliegue_render.md).

Si la rúbrica exige además un enlace público al Workspace de Postman, se debe publicar la colección desde una cuenta de Postman y añadir ese enlace en la fila 8; la colección versionada ya está lista para importar.
