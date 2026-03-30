# VetApp — Lista de Tareas

## Base y Autenticación
- [x] Esquema de base de datos completo (owners, pets, visits, appointments, payments, visitAttachments)
- [x] Migración de base de datos con pnpm db:push
- [x] Sistema de autenticación con roles (admin/user)
- [x] Layout principal con sidebar responsive (DashboardLayout)
- [x] Estilos globales en español, paleta de colores profesional (teal/verde)
- [x] Tipografía: Inter + Nunito (Google Fonts)

## Módulo de Propietarios
- [x] Tabla `owners` en schema
- [x] tRPC router: listar, crear, editar, eliminar propietarios
- [x] Página: lista de propietarios con búsqueda
- [x] Página: detalle/edición de propietario con lista de mascotas

## Módulo de Mascotas
- [x] Tabla `pets` en schema (vinculada a owners)
- [x] tRPC router: listar, crear, editar, eliminar mascotas
- [x] Subida de foto de mascota a S3 (vía servidor)
- [x] Página: lista de mascotas con filtros
- [x] Página: detalle/edición de mascota con foto e historial

## Historial Clínico
- [x] Tabla `visits` en schema (vinculada a pets)
- [x] tRPC router: listar, crear, editar visitas
- [x] Página: historial de visitas (lista global y por mascota)
- [x] Formulario: nueva visita (motivo, diagnóstico, tratamiento, medicamentos, próximos pasos)
- [x] Carga de archivos adjuntos por visita (S3 vía servidor)
- [x] Visualización de archivos adjuntos en detalle de visita

## Calendario y Turnos
- [x] Tabla `appointments` en schema
- [x] tRPC router: listar, crear, confirmar, cancelar turnos
- [x] Página: calendario mensual/semanal/lista de turnos
- [x] Formulario: nuevo turno con selección de propietario/mascota existentes
- [x] Gestión de estados (pendiente, confirmado, completado, cancelado)

## Módulo Financiero
- [x] Tabla `payments` en schema (vinculada a owners)
- [x] tRPC router: listar, crear, actualizar, eliminar pagos
- [x] Página: registro de cobros con filtros por estado
- [x] Indicadores: cobrado, pendiente, total registrado

## Dashboard
- [x] Página principal: turnos del día
- [x] Dashboard: cobros pendientes
- [x] Dashboard: visitas recientes
- [x] Dashboard: resumen estadístico (propietarios, mascotas, cobrado del mes)

## Calidad y Entrega
- [x] 11 tests con Vitest (auth + owners + pets + visits + appointments + payments + dashboard)
- [x] TypeScript sin errores (tsc --noEmit)
- [x] Responsividad móvil: sidebar colapsable, header sticky en móvil
- [x] Todo el contenido en español
- [x] Checkpoint final y entrega
