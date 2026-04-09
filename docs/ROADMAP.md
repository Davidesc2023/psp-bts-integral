# PSP — Roadmap de Desarrollo

**Versión:** 1.0 (AI-DLC Master Agent)
**Fecha:** 2026-04-06
**Basado en:** psp-prd.md v1.0 + análisis de gaps del código real

---

## Estado General del Proyecto

| Categoría | Estado |
|-----------|--------|
| Módulos de datos (CRUD) | ✅ 19/19 implementados |
| Base de datos + schema | ✅ Completo con RLS |
| Autenticación básica | ✅ Funcional |
| Flujo Drop Out (UI) | ⚠️ Parcial — falta anonimización real |
| Multi-tenancy dinámico | ❌ DEFAULT_TENANT hardcodeado |
| Notificaciones sistema | ❌ No implementado |
| Vista 360° del paciente | ❌ Sin UI (service existe) |
| Import Excel real | ❌ No implementado |
| Roles PSP (Educador/MSL/Coordinador) | ⚠️ Parcial — misalignment roles |
| Configuración de estados por laboratorio | ❌ Tabla creada, sin UI |

---

## 🚀 Fase 1 — Estabilización del Core (MVP Piloto)

**Objetivo:** Hacer el sistema listo para operación real con un grupo piloto de pacientes.

**Duración estimada:** 2–3 semanas

### 1.1 Seguridad — Multitenancy real (CRÍTICO)
Reemplazar `DEFAULT_TENANT` hardcodeado por lectura dinámica desde `user_profiles.tenant_id`.

- [ ] Crear hook `useTenantId()` que lee tenant desde el usuario autenticado en Supabase Auth
- [ ] Aplicar el hook en todos los servicios (17 archivos en `/services/`)
- [ ] Verificar que RLS filtra correctamente por tenant
- [ ] Test: crear 2 tenants y verificar aislamiento de datos

**Dependencias:** Ninguna  
**Tipo:** Security + Backend  
**Prioridad:** CRÍTICA — bloquea producción multi-organización

---

### 1.2 Drop Out — Anonimización automática real (LEGAL)
Completar el flujo de anonimización de datos personales al cambiar status a DROP_OUT.

- [ ] En `patient.service.ts updatePatient()`: detectar cuando `status === 'DROP_OUT'`
- [ ] Enmascarar campos: `first_name`, `last_name`, `document_number`, `email`, `phone`, `phone2`, `address`, `emergency_contact_name`, `emergency_contact_phone`
- [ ] Guardar `anonymized = true` + `anonymized_at = NOW()`
- [ ] No anonimizar: `codigo_paciente`, `diagnostico_id`, `programa_psp_id`, `laboratorio_id` (trazabilidad estadística)
- [ ] Mostrar en `PatientDetailPage` banner "Paciente anonimizado" si `anonymized = true`

**Dependencias:** Ninguna  
**Tipo:** Frontend + DB  
**Prioridad:** CRÍTICA — obligatorio por Ley 1581/2012 Colombia

---

### 1.3 Vista 360° del Paciente
Implementar el panel consolidado que requieren las educadoras.

- [ ] Crear componente `Patient360Panel.tsx` en `modules/patients/components/`
- [ ] Consumir `patientService.get360(patientId)` (ya existe)
- [ ] Renderizar las 6 secciones: Prescripción activa, Barreras abiertas, Próxima aplicación, Última entrega, Seguimientos pendientes, Estado general
- [ ] Integrar como tab principal en `PacienteTabs.tsx` (actualmente no existe ese tab)
- [ ] Verificar que la función `get_patient_360` exista en Supabase Cloud o crearla

**Dependencias:** Task 1.1 (tenant correcto para los datos del 360)  
**Tipo:** Frontend  
**Prioridad:** ALTA

---

### 1.4 Sistema de Notificaciones
Implementar el sistema de alertas/notificaciones funcional.

- [ ] Crear `NotificationsPanel.tsx` — bell icon en el header del `MainLayout`
- [ ] Crear `notificacionesService.ts` — lee `notifications` table (ya creada en migration_v4)
- [ ] Implementar generación de notificaciones en Supabase (función SQL o edge function):
  - Seguimientos próximos (< 48h)
  - Prescripciones por vencer (< 7 días)
  - Paraclínicos próximos
  - Barreras abiertas sin resolución (> 5 días)
  - Aplicaciones no efectivas sin barrera
- [ ] Al hacer clic en una notificación: navegar a `/patients/:id` o al módulo correspondiente
- [ ] Marcar notificaciones como leídas

**Dependencias:** Task 1.1 (tenant), tabla `notifications` en migration_v4  
**Tipo:** Frontend + DB  
**Prioridad:** ALTA

---

### 1.5 Alineación de Roles de Usuario con PRD
Los roles en DB no coinciden con los del PRD.

**Roles DB actuales:** `SUPER_ADMIN, ADMIN_INSTITUCION, MEDICO, ENFERMERIA, COORDINADOR, PACIENTE, CUIDADOR`  
**Roles PRD:** `Administrador, Coordinador, Educador, MSL, Médico`

- [ ] Agregar roles `EDUCADOR` y `MSL` al CHECK constraint de `user_profiles`
- [ ] Actualizar `UsersAdminPage.tsx` para soportar los 5 roles del PRD
- [ ] Actualizar `AdminRoute` para incluir `EDUCADOR` en páginas de módulos de pacientes
- [ ] Aplicar filtro de `user_program_assignments` para educadores (ver solo sus pacientes)

**Dependencias:** Task 1.1  
**Tipo:** DB + Frontend  
**Prioridad:** ALTA

---

## 🔧 Fase 2 — Features Completos (MVP Extendido)

**Objetivo:** Completar todas las funcionalidades del PRD para operación normal.

**Duración estimada:** 3–4 semanas

---

### 2.1 Import/Export Excel Real
Actualmente solo hay export de CSV disfrazado de .xls.

- [ ] Instalar `xlsx` (SheetJS) o `exceljs` como dependencia
- [ ] Reemplazar `downloadExcel()` en `ReportesPage` por generación real de `.xlsx` con estilos
- [ ] Implementar importación con:
  - Plantilla descargable con columnas requeridas
  - Parsing del archivo subido
  - Validación por fila (reporte de errores)
  - Inserción en batch en Supabase usando `import_jobs` table
- [ ] Módulos con import/export: Pacientes, Prescripciones, Seguimientos, Entregas, Aplicaciones, Paraclínicos, Consultas Médicas

**Dependencias:** Ninguna  
**Tipo:** Frontend  
**Prioridad:** MEDIA-ALTA

---

### 2.2 Configuración de Estados por Laboratorio/Programa
La tabla `patient_status_config` existe en migration_v4 pero no tiene UI.

- [ ] Crear `EstadosConfigPage.tsx` en `modules/admin/pages/`
- [ ] CRUD para configurar qué estados están disponibles por `programa_psp_id`
- [ ] En el wizard de paciente (Step4), cargar estados desde `patient_status_config` filtrado por programa seleccionado
- [ ] Fallback a estados base si no hay configuración para el programa

**Dependencias:** Task 1.1, Task 1.5  
**Tipo:** Frontend + DB  
**Prioridad:** MEDIA

---

### 2.3 Asignación Usuario-Programa
La tabla `user_program_assignments` existe pero no tiene UI ni se usa.

- [ ] Crear `UserProgramAssignmentsPage.tsx` en admin (o sección en UsersAdminPage)
- [ ] Permitir asignar a un usuario: laboratorio(s) y tratamiento(s)
- [ ] En `PacientesPage`: si el usuario es EDUCADOR, filtrar automáticamente por programas asignados

**Dependencias:** Task 1.1, Task 1.5  
**Tipo:** Frontend + DB  
**Prioridad:** MEDIA

---

### 2.4 Prioridad Dinámica de Seguimientos
El PRD pide prioridad numérica basada en días restantes.

- [ ] En `FollowupsPage`: calcular `diasRestantes = fechaProgramada - hoy` en el frontend al cargar
- [ ] Ordenar seguimientos por `diasRestantes` ASC (los más urgentes primero)
- [ ] Los vencidos (diasRestantes < 0) van al principio con badge "Vencido"
- [ ] Actualizar chips de prioridad para reflejar el cálculo dinámico

**Dependencias:** Ninguna  
**Tipo:** Frontend  
**Prioridad:** MEDIA

---

### 2.5 Inventario Automático al Registrar Aplicación
El PRD requiere que al registrar una aplicación, se descuente del inventario.

- [ ] En `aplicacionService.ts registrarAplicacion()`: tras guardar la aplicación, invocar `inventarioService.descontarUnidades(pacienteId, medicamentoId, cantidad)`
- [ ] Crear función SQL o manejarlo desde el service (con transacción si possible)
- [ ] Mostrar alerta si el inventario cae a 0 o negativo

**Dependencias:** Ninguna  
**Tipo:** Frontend + DB  
**Prioridad:** MEDIA

---

### 2.6 Código de Paciente — Verificar Integración Completa
La función SQL `generate_patient_code()` existe. Verificar que se llama correctamente al crear paciente.

- [ ] Revisar `patient.service.ts createPatient()` — confirmar que llama a `generate_patient_code` o que el trigger lo hace automáticamente
- [ ] Si no hay trigger, agregar llamada explícita en el service
- [ ] Mostrar `codigo_paciente` prominentemente en `PacientesPage` (listado) y `PatientDetailPage`
- [ ] Asegurarse que el código se muestra en los formularios de módulos relacionados (prescripciones, aplicaciones, etc.)

**Dependencias:** Ninguna  
**Tipo:** Frontend + DB  
**Prioridad:** MEDIA

---

## 🌟 Fase 3 — Optimización y Escala

**Objetivo:** Preparar el sistema para múltiples laboratorios y alta concurrencia.

**Duración estimada:** 2–3 semanas

---

### 3.1 Dashboard Enriquecido con Filtros por Programa/Laboratorio
- [ ] Agregar filtros en el dashboard por programa PSP y laboratorio
- [ ] Los KPIs deben filtrar por tenant + programa en tiempo real
- [ ] Gráfico de evolución de estados de pacientes por mes

### 3.2 Reportes Avanzados
- [ ] Reporte de adherencia al tratamiento (aplicaciones realizadas vs programadas)
- [ ] Reporte de barreras por categoría y tiempo promedio de resolución
- [ ] Reporte de entrega de medicamentos (puntualidad, devoluciones)
- [ ] Export a Excel/PDF con filtros aplicados

### 3.3 Tutorial Onboarding para Nuevos Usuarios
- [ ] Crear flujo de onboarding tipo tour (con react-joyride o similar)
- [ ] Explicar notificaciones al primer login
- [ ] Guía rápida del wizard de pacientes

### 3.4 Rendimiento y Monitoreo
- [ ] Implementar paginación server-side en listados (actualmente `getAll(0, 50)` fijo)
- [ ] Agregar índices adicionales en Supabase si consultas > 2s
- [ ] Configurar alertas de Supabase para queries lentas

### 3.5 RAM — Reacción Adversa a Medicamentos
- [ ] El campo `ram` existe en `patient.service.ts` pero no tiene flujo dedicado
- [ ] Crear sección en `PatientDetailPage` para registrar y gestionar RAMs
- [ ] Notificación automática al registrar una RAM

---

## 📊 Resumen de Esfuerzo

| Fase | Features | Tipo de trabajo | Semanas |
|------|----------|----------------|---------|
| Fase 1 — Core | 5 features | Security + Legal + UX | ~3 sem |
| Fase 2 — Extendido | 6 features | Frontend + DB | ~4 sem |
| Fase 3 — Escala | 5 features | Optimización | ~3 sem |
| **Total** | **16 features** | — | **~10 sem** |

---

## ⚠️ Bloqueadores Críticos para Producción

Antes de operar con datos reales de pacientes, son OBLIGATORIOS:

1. **Task 1.1** — Multi-tenancy real (sin DEFAULT_TENANT hardcodeado)
2. **Task 1.2** — Anonimización DROP_OUT (obligación legal Ley 1581/2012)
3. **Aplicar migration_v4 + fix_rls en Supabase Cloud** (si no se ha hecho)

---

*Generado por AI-DLC Master Agent — basado en análisis real del repositorio*
