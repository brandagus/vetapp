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

## Rebranding
- [x] Cambiar nombre de app a "Dra Branda Veterinaria" en todo el código
- [x] Actualizar VITE_APP_TITLE
- [x] Actualizar sidebar, login page, y todas las referencias visibles
- [x] Generar logo con animalito tierno (critter) para la app
- [x] Generar favicon con el mismo estilo
- [x] Usar íconos de estilo cute/critter en la navegación del sidebar
- [x] Subir assets a CDN con manus-upload-file --webdev

## Rediseño Historia Clínica y Perfiles
- [x] Investigar mejores prácticas de historias clínicas veterinarias
- [x] Rediseñar perfil de paciente: foto, info general, dueño completo, última visita, último pago
- [x] Header de paciente con auto-llenado (buscar por nombre/ID y se completa todo)
- [x] Info del dueño en perfil: nombre, teléfono, email, dirección
- [x] Formulario de visita con campos dinámicos (+) para agregar en tiempo real
- [x] Campos opcionales: peso, altura, temperatura, etc. (no aparecen vacíos)
- [x] Campo de texto libre para notas clínicas
- [x] Campos fijos: fecha, hora, motivo de consulta
- [x] Auto-relleno de fecha/hora al crear visita
- [x] Buscador/filtro inteligente: por nombre de dueño, nombre de mascota, especie
- [x] Filtros por especie (perro, gato, etc.)

## Reestructuración de Navegación
- [x] Simplificar sidebar a 3 módulos: Pacientes, Turnos, Estadísticas
- [x] Eliminar secciones separadas de Propietarios e Historial Clínico
- [x] Renombrar "Propietario" a "Familiar" en toda la app
- [x] Pacientes: base de datos unificada con búsqueda por mascota, familiar, especie, etc.
- [x] Perfil de paciente: mostrar familiar, historial como "entries" inline
- [x] Poder agregar nueva entry (visita) desde el perfil del paciente
- [x] Módulo Estadísticas: página "Próximamente" (coming soon)
- [x] Dashboard simplificado como página de inicio

## Nuevo Logo
- [x] Quitar fondo del logo (galgo + gato)
- [x] Crear versión favicon (recortada/cuadrada)
- [x] Subir a CDN con manus-upload-file --webdev
- [x] Actualizar logo en sidebar, login page, y favicon

## Formulario Nuevo Paciente - Rediseño
- [x] Reemplazar diálogo pequeño por página completa para nuevo paciente
- [x] Selector de Familiar: campo de texto buscable (combobox), no dropdown chico
- [x] Formulario ocupa toda la pantalla en desktop y optimizado para móvil
- [x] Opción de crear familiar nuevo inline desde el combobox

## Integración Google Calendar - Turnos
- [x] Investigar mejor approach para Google Calendar API
- [x] Configurar credenciales Google OAuth2 (Client ID + Secret)
- [x] Crear lógica server-side para sincronizar turnos con Google Calendar
- [x] Al crear turno → crear evento en Google Calendar (auto-sync)
- [x] Al actualizar/cancelar turno → actualizar/cancelar evento en Google Calendar
- [x] UI: botón para conectar/desconectar Google Calendar
- [x] UI: indicador de sincronización + botón actualizar por turno
- [x] 11 tests pasando, TypeScript sin errores
