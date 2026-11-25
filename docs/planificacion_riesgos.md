# Planificación y riesgos

Versión: 1.0 · Fecha: 2026-11-25 · Proyecto: Coro Patrimonial UNEFA

## 1. Objetivo del plan

Ordenar la ejecución del backend y la producción de evidencias hasta dejar los diez entregables de la rúbrica con artefacto verificable.

## 2. WBS y cronograma

| ID | Tarea | Responsable | Inicio | Fin | Estado |
|---|---|---|---|---|---|
| 1.1 | Fijar Node 26, `npm ci` y línea base de pruebas | Backend | 2026-11-25 | 2026-11-25 | ✅ Completado |
| 1.2 | Ampliar suite a todos los módulos y medir cobertura | Backend / QA | 2026-11-25 | 2026-11-25 | ✅ Completado |
| 1.3 | CI de backend en GitHub Actions | DevOps | 2026-11-25 | 2026-11-25 | ✅ Completado |
| 2.1 | Requerimientos y casos de uso | Análisis | 2026-11-25 | 2026-11-25 | ✅ Completado |
| 2.2 | Arquitectura y modelo de datos | Arquitectura | 2026-11-25 | 2026-11-25 | ✅ Completado |
| 2.3 | Planificación y riesgos | Gestión | 2026-11-25 | 2026-11-25 | ✅ Completado |
| 3.1 | Colección Postman y entornos | QA | 2026-11-25 | 2026-11-26 | 🔄 En curso |
| 3.2 | Colección Bruno de apoyo local | QA | 2026-11-25 | 2026-11-26 | ⏳ Pendiente |
| 4.1 | Despliegue y URL pública del backend | DevOps | 2026-11-26 | 2026-11-27 | ⏳ Pendiente |
| 5.1 | Documento principal y estudio | Gestión | 2026-11-26 | 2026-11-27 | ✅ Completado |
| 5.2 | Manual de instalación y matriz de evidencias | Documentación | 2026-11-25 | 2026-11-27 | 🔄 En curso |
| 6.1 | PR, revisión y cierre de entregables | Todo el equipo | 2026-11-27 | 2026-11-28 | ⏳ Pendiente |

## 3. Hitos

| Hito | Fecha | Criterio |
|---|---|---|
| H1 — Backend estable | 2026-11-25 | 27 pruebas en verde con Node 26 y cobertura > 90 % |
| H2 — Documentación base | 2026-11-25 | Requerimientos, arquitectura, plan y manual disponibles |
| H3 — API documentada | 2026-11-26 | Colección Postman ejecutable en local y entornos definidos |
| H4 — Backend en producción | 2026-11-27 | `GET /api/health` responde públicamente y se registra la URL |
| H5 — Entrega | 2026-11-28 | Matriz con 10/10 entregables enlazados |

## 4. Matriz de riesgos

| ID | Riesgo | Prob. | Impacto | Mitigación | Responsable |
|---|---|---|---|---|---|
| R-01 | Desfase de versión de Node (local 24 vs exigido 26) | Alta | Alto | Instalar Node 26 con fnm, fijar `.nvmrc`/`engines` y ejecutar CI con Node 26 | Backend |
| R-02 | Cambios sin commitear o PR rechazada | Media | Alto | Crear rama, PR con squash y revisión antes de fusionar | Todo el equipo |
| R-03 | `mongodb-memory-server` no descarga el binario en CI | Media | Alto | Verificar primera ejecución en CI; cachear binario o permitir script de postinstalación | DevOps |
| R-04 | Limitadores de tasa generan `429` en pruebas | Media | Medio | Mantener el volumen de peticiones de la suite bajo los límites y documentar el comportamiento | QA |
| R-05 | Fuga de contenido no publicado por filtros de query | Baja | Crítico | Aplicar filtros públicos al final de listado y detalle; pruebas de regresión | Backend |
| R-06 | Archivos huérfanos tras fallos de subida | Media | Medio | Limpieza de archivos recién guardados y `trackUpload` en pruebas | Backend |
| R-07 | Ausencia de URL pública del backend | Alta | Alto | Definir plataforma de despliegue y publicar health check en README y matriz | DevOps |
| R-08 | La rúbrica no acepte Bruno como documentación de API | Media | Medio | Mantener Postman como referencia principal y Bruno solo como apoyo local | QA |
| R-09 | Secretos expuestos en el repositorio público | Baja | Crítico | `.env` ignorado, `.env.example` sin valores reales y revisión de PR | DevOps |
| R-10 | Pérdida de datos durante despliegue | Baja | Crítico | Respaldo previo con `mongodump` y copia de fuente según `AGENTS.md` | DevOps |

## 5. Criterios de aceptación globales

- `npm test` y `npm run test:coverage` en verde con Node 26.
- Cobertura de líneas ≥ 90 %.
- Los diez entregables tienen archivo o URL enlazada en `docs/evidencias/matriz_entregables.md`.
- Ningún secreto, `.env` o binario adicional versionado.
- El despliegue responde `200` en `/api/health` y la colección Postman pasa contra esa URL.

## 6. Seguimiento

El estado se actualiza en esta tabla y en `docs/evidencias/matriz_entregables.md` al cerrar cada hito. Las decisiones técnicas se registran en `memory/architecture_decisions.md` y los parches en `memory/error_solutions.md`.
