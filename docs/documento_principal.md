# Documento principal del proyecto

**Proyecto:** Coro Patrimonial UNEFA · **Versión:** 1.0 · **Fecha:** 2026-11-25

## Resumen ejecutivo

Se desarrolla una plataforma web y móvil para centralizar la gestión y difusión del patrimonio cultural del Coro Patrimonial de la Universidad Nacional Experimental de la Fuerza Armada (UNEFA). El backend expone una API REST segura con autenticación por roles, y el frontend y la app móvil consumen un contrato único documentado. La entrega actual cubre el backend, sus pruebas automatizadas, la documentación de API y las evidencias académicas.

## 1. Problema

La información del coro está dispersa entre documentos, redes sociales y archivos personales. No existe una fuente única y confiable para mostrar integrantes, publicar el repertorio, difundir conciertos y conservar fotografías, documentos, audios y videos históricos.

## 2. Solución

Un sistema Full Stack con:

- **Backend:** Node.js 26, Express 5, MongoDB/Mongoose, JWT + bcrypt, Socket.IO y subida de archivos.
- **Frontend:** SPA Angular 22 Standalone + Signals con panel administrativo.
- **Móvil:** aplicación Kotlin nativa con Retrofit y Corrutinas.
- **Documentación:** contexto de negocio, contrato de API, requerimientos, arquitectura y manual.

## 3. Objetivos

### Generales

Centralizar y preservar el quehacer coral y su patrimonio cultural en una plataforma accesible y sostenible.

### Específicos

1. Modelar las entidades `User`, `Member`, `Work`, `Event`, `HeritageItem`, `Monument`, `Asset` y `AuditLog`.
2. Implementar autenticación JWT con roles `admin`, `editor` y `viewer`.
3. Publicar contenido con borrado lógico y control de visibilidad.
4. Validar entradas, subidas de archivos y límites de tasa.
5. Notificar publicaciones mediante Socket.IO.
6. Alcanzar cobertura automatizada superior al 90 % en el backend.
7. Producir los diez entregables exigidos por la rúbrica con evidencia verificable.

## 4. Alcance

| Incluido | No incluido en esta entrega |
|---|---|
| API REST y Socket.IO | Implementación funcional del frontend Angular |
| Modelo de datos y seeder | Compilación del APK móvil |
| Pruebas automatizadas y CI | Campaña de marketing o despliegue de contenidos reales |
| Documentación y colección Postman | Integración con pasarelas de pago u otros servicios externos |

## 5. Público objetivo

| Perfil | Necesidad |
|---|---|
| Directiva / administradores | Gestionar usuarios, contenido y publicaciones |
| Editores del coro | Cargar obras, eventos y piezas patrimoniales |
| Coristas | Consultar repertorio y eventos propios |
| Visitantes | Conocer el coro, su historia y su agenda pública |

## 6. Arquitectura resumida

El backend se organiza en módulos `api/<modulo>/` (rutas, controlador y modelo), con middlewares transversales y un controlador CRUD genérico que aplica filtros públicos, paginación y emisión de eventos. Los archivos se guardan en `uploads/` y se entregan como estáticos. El detalle está en `docs/arquitectura_modelo_datos.md`.

## 7. Estado de la implementación

| Componente | Estado |
|---|---|
| 8 módulos de API | ✅ Implementados |
| Autenticación y roles | ✅ Implementada y probada |
| Subida de archivos e imágenes de monumentos | ✅ Implementada y probada |
| Socket.IO `content:published` | ✅ Implementado y probado |
| Suite automatizada | ✅ 27 pruebas, 27 pass |
| Cobertura de líneas | ✅ 91,17 % |
| CI de backend | ✅ Configurada |
| Documentación académica | ✅ Producción |
| URL pública del backend | ⏳ Por completar según plataforma de despliegue |

## 8. Entregables de la rúbrica

| Entregable | Documento / evidencia |
|---|---|
| Documento principal | `docs/documento_principal.md` |
| Estudio o investigación | `docs/estudio_investigacion.md` |
| Requerimientos y casos de uso | `docs/requerimientos_casos_de_uso.md` |
| Arquitectura y modelo de datos | `docs/arquitectura_modelo_datos.md` |
| Planificación y riesgos | `docs/planificacion_riesgos.md` |
| Repositorio backend | `https://github.com/Sibahia/coro-patrimonial-unefa` |
| URL del backend desplegado | `docs/evidencias/matriz_entregables.md` |
| Documentación de API / Postman | `context/api_contracts.md` y `docs/postman/` |
| Evidencia de pruebas backend | `docs/evidencias/backend_tests.md` |
| README y manual de instalación | `README.md` y `docs/manual_instalacion.md` |

## 9. Resultados de pruebas

La suite `node --test` se ejecuta con MongoDB en memoria, sin depender de una base de datos externa. La ejecución de referencia con Node 26.13.1 arroja **27 pruebas, 27 superadas, 0 fallidas** y **91,17 % de cobertura de líneas**. El detalle y los reportes TAP están en `docs/evidencias/backend_tests.md`.

Durante la ampliación de la suite se detectaron y corrigieron tres defectos: manejo de JSON malformado como error 500, filtros públicos eludibles mediante query params y exposición de borradores en rutas de detalle.

## 10. Cronograma y equipo

El cronograma por fases y la matriz de riesgos están en `docs/planificacion_riesgos.md`. El trabajo se organiza por roles: análisis, arquitectura, backend/QA, DevOps y documentación, sin nombres individuales asignados en el repositorio público.

## 11. Conclusiones

El backend cumple las reglas de negocio definidas y cuenta con evidencia automatizada de su comportamiento. La documentación producida cubre los entregables académicos y deja una base reproducible para continuar con el frontend, el móvil y el despliegue público.

## 12. Enlaces

- Repositorio: <https://github.com/Sibahia/coro-patrimonial-unefa>
- Contrato de API: `context/api_contracts.md`
- Evidencias: `docs/evidencias/`
- Manual: `docs/manual_instalacion.md`
