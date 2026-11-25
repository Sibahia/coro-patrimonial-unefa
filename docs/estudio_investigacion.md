# Estudio e investigación

Versión: 1.0 · Fecha: 2026-11-25 · Proyecto: Coro Patrimonial UNEFA

## 1. Introducción

Este estudio presenta el análisis previo que justifica la solución propuesta. Se basa en revisión documental del repositorio, observación de las necesidades descritas por la directiva del coro y análisis de alternativas tecnológicas. No se reportan encuestas con datos cuantitativos porque todavía no se ha aplicado un instrumento formal; al final se propone el protocolo para hacerlo.

## 2. Metodología

1. **Revisión documental:** `context/system_context.md`, `context/business_rules.md` y `context/api_contracts.md`.
2. **Análisis de brechas:** comparación entre la situación descrita y los requerimientos de la rúbrica.
3. **Análisis de alternativas:** evaluación de stack y de herramientas de prueba/documentación de API.
4. **Factibilidad técnica:** verificación de dependencias, versión de Node y ejecución de la suite.
5. **Validación:** 27 pruebas automatizadas y cobertura de 91,17 % de líneas.

## 3. Situación actual

- La información del coro se encuentra dispersa en documentos, redes sociales y archivos personales.
- No hay una fuente única para integrantes, repertorio, eventos y archivo histórico.
- El acceso público y el administrativo no están diferenciados.
- No existe trazabilidad de cambios ni control de publicación.

## 4. Alternativas consideradas

| Alternativa | Ventajas | Limitaciones | Decisión |
|---|---|---|---|
| Sitio estático + formularios | Bajo costo y despliegue simple | Sin roles, sin CRUD, sin archivo histórico gestionable | Descartada |
| CMS genérico (WordPress) | Rápido de instalar | Dependencia de plugins, modelo de datos rígido para patrimonio | Descartada |
| Backend propio Node/Express + MongoDB | Modelo flexible, control de roles, eventos en tiempo real y pruebas automatizadas | Requiere servidor y mantenimiento | **Seleccionada** |
| Postman como documentación de API | Estándar del rubro, ejecución colaborativa y exportable | Requiere cuenta para enlace público | **Referencia principal** |
| Bruno como complemento | Colecciones versionables en Git, ideal para pruebas locales | No sustituye la evidencia Postman exigida | **Apoyo local únicamente** |

## 5. Hallazgos del análisis técnico

1. El repositorio ya contenía ocho módulos de API y 14 pruebas antes de esta entrega; la brecha estaba en la documentación entregable y en la cobertura de módulos.
2. El entorno local tenía Node 24.12.0 mientras el proyecto exige Node 26; se instaló Node 26.13.1 con fnm y se fijó CI con esa versión.
3. El manejo de errores devolvía `500` ante JSON malformado; se ajustó a `400 VALIDATION_ERROR`.
4. Los filtros públicos se aplicaban antes que los parámetros de consulta, permitiendo eludir la visibilidad con `?isActive=false`; se corrigió.
5. El detalle de contenido exponía borradores a visitantes; se corrigió aplicando los filtros públicos también en `getById`.
6. La cobertura inicial estaba concentrada en autenticación y monumentos; se amplió a todos los módulos.

## 6. Factibilidad

| Dimensión | Evaluación |
|---|---|
| Técnica | Factible: stack disponible, dependencias instaladas y pruebas en verde |
| Operativa | Factible: seeder idempotente y configuración por `.env` |
| Económica | Baja: servicios de despliegue gratuitos o de bajo costo; MongoDB Atlas con capa gratuita |
| Legal / institucional | Requiere autorización para publicar material del coro y definir licencias de imágenes y grabaciones |
| Riesgo principal | Ausencia de URL pública del backend y disponibilidad de cuenta para publicar la colección Postman |

## 7. Recomendaciones

1. Publicar la colección Postman en un workspace accesible y adjuntar el enlace en la matriz de evidencias.
2. Desplegar el backend y verificar `/api/health` con el entorno `Deployed` de Postman.
3. Aplicar una encuesta a coristas y visitantes (10–15 preguntas) para validar prioridades de repertorio y eventos.
4. Definir licencias de uso de fotografías, partituras y grabaciones antes de publicar contenido real.
5. Mantener la colección Bruno solo como herramienta local, sin presentarla como sustituto de Postman.

## 8. Fuentes

- `context/system_context.md`, `context/business_rules.md`, `context/api_contracts.md`.
- `memory/architecture_decisions.md`, `memory/error_solutions.md`.
- `docs/requerimientos_casos_de_uso.md`, `docs/arquitectura_modelo_datos.md`, `docs/planificacion_riesgos.md`.
- Documentación oficial de Node.js, Express, Mongoose, JWT, Postman y Bruno (referencias de herramientas, no datos de campo).
