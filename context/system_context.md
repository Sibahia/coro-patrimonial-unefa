# system_context.md

## Visión general

Sistema Full Stack para el **Coro Patrimonial de la UNEFA** (Universidad Nacional Experimental de la Fuerza Armada). Centraliza la gestión y difusión del quehacer coral y de su patrimonio cultural: integrantes, obras de repertorio, presentaciones y archivo histórico.

## Problema que resuelve

Hoy la información del coro está dispersa en documentos, redes sociales y archivos personales. No existe una fuente única y confiable para:

- Mostrar quiénes conforman el coro y sus voces.
- Publicar el repertorio con partituras y grabaciones.
- Convocar y difundir conciertos, ensayos y grabaciones.
- Conservar y exponer fotografías, documentos, audios y videos históricos.

## Público objetivo

| Perfil | Necesidad |
|---|---|
| Directiva / administradores | Gestionar usuarios, contenido y publicaciones |
| Editores del coro | Cargar obras, eventos y piezas patrimoniales |
| Coristas | Consultar repertorio y eventos propios |
| Visitantes del sitio | Conocer el coro, su historia y su agenda pública |

## Alcance del sistema

- **Backend (`projects/backend`):** API REST + Socket.IO, MongoDB, autenticación JWT con roles.
- **Frontend (`projects/frontend`):** SPA pública + panel de administración (Angular Standalone + Signals).
- **Mobile (`projects/mobile`):** aplicación Kotlin para consulta y notificaciones.

## Convención de lenguaje

Los nombres de entidades, campos, colecciones, rutas y eventos son **inglés**. La documentación narrativa se escribe en español.
