# PSP — Lista de Tareas Ejecutables para Agentes

**Versión:** 1.0 (AI-DLC Master Agent)
**Fecha:** 2026-04-06
**Estado:** Listo para asignación a agentes de desarrollo

---

## Convenciones

- **ID:** formato `TASK-XXX`
- **Tipo:** `FRONTEND` | `DB` | `FULLSTACK` | `SECURITY`
- **Prioridad:** `P0` (crítico) | `P1` (alto) | `P2` (medio) | `P3` (mejora)
- **Fase:** `F1` (Core/MVP) | `F2` (Extendido) | `F3` (Escala)
- **Esfuerzo:** S (< 4h) | M (4–8h) | L (8–16h) | XL (> 16h)
- **Estado:** `pending` | `in-progress` | `done`

---

## FASE 1 — Core (Bloqueadores de Producción)

---

### TASK-001 — Hook useTenantId + inyección en todos los services

**Tipo:** SECURITY + FRONTEND
**Prioridad:** P0 — CRÍTICO
**Fase:** F1
**Esfuerzo:** L
**Estado:** pending

**Descripción:**
Todos los servicios usan `const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001'` hardcodeado.
Debe reemplazarse por lectura dinámica desde el perfil del usuario autenticado.

**Archivos a modificar:**
- Crear: `frontend/web/src/hooks/useTenantId.ts`
- Crear: `frontend/web/src/utils/getCurrentTenant.ts` (versión async para services)
- Modificar: todos los archivos en `frontend/web/src/services/` que tengan `DEFAULT_TENANT`

**Implementación:**
```typescript
// utils/getCurrentTenant.ts
import { supabase } from '@services/supabaseClient';

export const getCurrentTenantId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();
  if (!profile?.tenant_id) throw new Error('Perfil sin tenant asignado');
  return profile.tenant_id;
};
```

**Criterios de aceptación:**
- `DEFAULT_TENANT` no aparece en ningún archivo de `/services/`
- Las queries en Supabase se filtran por el `tenant_id` real del usuario autenticado
- RLS rechaza datos de otros tenants

**Dependencias:** Ninguna

---

### TASK-002 — Anonimización automática al DROP_OUT

**Tipo:** FULLSTACK
**Prioridad:** P0 — CRÍTICO (obligación legal)
**Fase:** F1
**Esfuerzo:** M
**Estado:** pending

**Descripción:**
Cuando el `status` de un paciente cambia a `DROP_OUT`, los campos de datos personales sensibles
deben ser enmascarados automáticamente conforme a la Ley 1581/2012 (Habeas Data, Colombia).

**Archivos a modificar:**
- `frontend/web/src/services/patient.service.ts` — función `updatePatient()`
- `frontend/web/src/modules/patients/pages/PatientDetailPage.tsx` — mostrar banner anonimizado

**Campos a anonimizar (reemplazar por "ANONIMIZADO"):**
```
first_name, second_name, last_name, second_last_name,
document_number, email, phone, phone2,
address, emergency_contact_name, emergency_contact_phone
```

**Campos a preservar (trazabilidad estadística):**
```
id, codigo_paciente, tenant_id, programa_psp_id, laboratorio_id,
diagnostico_id, status, fecha_retiro, motivo_retiro,
anonymized = true, anonymized_at = NOW()
```

**Criterios de aceptación:**
- Al guardar un paciente con `status = DROP_OUT`, los campos personales se enmascaran
- El campo `anonymized = true` y `anonymized_at` quedan registrados en la fila
- `PatientDetailPage` muestra banner visible "Paciente anonimizado — Datos personales protegidos por Ley 1581/2012"
- En `PacientesPage` listado, el nombre aparece como "ANONIMIZADO" para pacientes drop out

**Dependencias:** TASK-001

---

### TASK-003 — Vista 360° del Paciente (componente UI)

**Tipo:** FRONTEND
**Prioridad:** P1
**Fase:** F1
**Esfuerzo:** L
**Estado:** pending

**Descripción:**
Implementar el panel consolidado `Patient360Panel` que las educadoras usan para ver
el estado completo de un paciente de un vistazo.

La función RPC `get_patient_360` ya está definida en `patient.service.ts get360()`.
Solo falta el componente UI.

**Archivos a crear/modificar:**
- Crear: `frontend/web/src/modules/patients/components/Patient360Panel.tsx`
- Modificar: `frontend/web/src/modules/patients/components/PacienteTabs.tsx` — agregar tab "Vista 360°" (primer tab)

**Secciones del panel:**

| Sección | Datos a mostrar | Color indicator |
|---------|----------------|----------------|
| Prescripción | Prescripción activa, días para vencer | Verde/Amarillo/Rojo |
| Barreras | N° barreras abiertas, días más antigua | Según cantidad |
| Aplicaciones | Próxima aplicación, última realizada | Verde si < 3 días |
| Entregas | Última entrega, días de medicamento restantes | Alerta si < 7 días |
| Seguimientos | N° tareas pendientes de alta prioridad | Rojo si > 0 urgentes |
| Estado general | Chip de estado + subestado | Por estado |

**Criterios de aceptación:**
- Tab "Vista 360°" aparece como primer tab en `PatientDetailPage`
- Los indicadores visuales cambian de color según umbrales
- Si `get_patient_360` RPC no existe en Supabase Cloud, mostrar datos agregados desde las 5+ queries individuales como fallback

**Dependencias:** TASK-001

---

### TASK-004 — Sistema de Notificaciones (bell + panel + generación)

**Tipo:** FULLSTACK
**Prioridad:** P1
**Fase:** F1
**Esfuerzo:** XL
**Estado:** pending

**Sub-tareas:**

**4a — UI: Bell + Panel en MainLayout**
- Archivo: `frontend/web/src/modules/shared/layout/MainLayout.tsx`
- Agregar `Badge` con contador de notificaciones no leídas en el header
- Panel dropdown al hacer clic: lista de notificaciones con ícono, título, fecha y link

**4b — Service: notificacionesService.ts**
- Crear: `frontend/web/src/services/notificacionesService.ts`
- Lee tabla `notifications` (ya existe en migration_v4)
- Función `getUnread(tenantId)`, `markAsRead(notifId)`, `markAllAsRead(tenantId)`

**4c — DB: Función SQL para generar notificaciones**
Crear en Supabase (o edge function) que genere registros en `notifications` cuando:
- Seguimiento `fecha_programada` < NOW() + 48h y estado = 'PENDIENTE'
- Prescripción `fecha_vencimiento_prescripcion` < NOW() + 7 días y estado = 'VIGENTE'
- Barrera `status = 'ABIERTA'` y `opened_at` < NOW() - 5 días
- Aplicación `estado = 'NO_APLICADA'` sin barrera asociada

**4d — Navegación desde notificación**
- Al hacer clic en una notificación, navegar a `/patients/:id` (pestaña correspondiente)
- Marcar como leída al navegar

**Criterios de aceptación:**
- Bell icon muestra badge con número de notificaciones no leídas (real-time via Supabase subscription)
- Panel dropdown muestra lista ordenada por fecha descendente
- Hacer clic navega al recurso correcto
- Notificaciones leídas se ocultan o aparecen en sección "leídas"

**Dependencias:** TASK-001

---

### TASK-005 — Alineación de Roles con PRD

**Tipo:** DB + FRONTEND
**Prioridad:** P1
**Fase:** F1
**Esfuerzo:** M
**Estado:** pending

**Descripción:**
Los roles en DB (`user_profiles.role`) no incluyen `EDUCADOR` ni `MSL` que define el PRD.

**Pasos:**
1. Migración SQL: alterar CHECK constraint en `user_profiles` para incluir `EDUCADOR` y `MSL`
2. Modificar `UsersAdminPage.tsx` para mostrar/seleccionar los 5 roles del PRD
3. Actualizar `AdminRoute.tsx` para incluir lógica de acceso por rol
4. Documentar matriz de permisos por rol

**Migración SQL:**
```sql
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('SUPER_ADMIN','ADMIN_INSTITUCION','MEDICO','ENFERMERIA',
                'COORDINADOR','PACIENTE','CUIDADOR','EDUCADOR','MSL'));
```

**Criterios de aceptación:**
- Los roles EDUCADOR y MSL son asignables desde la UI de admin
- Los EDUCADOR solo ven módulos de seguimiento, aplicaciones, entregas (no admin)
- Los MSL ven análisis/reportes de su laboratorio asignado

**Dependencias:** TASK-001

---

## FASE 2 — Features Extendidos

---

### TASK-006 — Import/Export Excel Real

**Tipo:** FRONTEND
**Prioridad:** P1
**Fase:** F2
**Esfuerzo:** XL
**Estado:** pending

**Descripción:**
Actualmente `ReportesPage.tsx` genera CSV disfrazado de Excel (`.xls`). Implementar export/import real.

**Sub-tareas:**

**6a — Dependencia:**
```bash
npm install xlsx
```

**6b — Export:**
- Reemplazar `downloadExcel()` en `ReportesPage.tsx` por `XLSX.utils.json_to_sheet()` + `XLSX.writeFile()`
- Los datos exportados deben incluir los filtros activos

**6c — Import — componente ImportExcelButton:**
- Crear `frontend/web/src/modules/shared/components/ImportExcelButton.tsx`
- Acepta archivo `.xlsx`
- Parsea con `XLSX.read()`
- Valida cada fila contra un schema de columnas requeridas
- Muestra reporte de errores (tabla con fila y mensaje)
- Inserta registros válidos en Supabase (usando `import_jobs` table como cola)

**6d — Plantilla descargable:**
- Botón "Descargar Plantilla" en los módulos con import
- Genera xlsx vacío con encabezados correctos y tooltips de validación

**Módulos prioritarios para import/export:**
1. Pacientes (mayor impacto)
2. Seguimientos
3. Prescripciones
4. Entregas

**Criterios de aceptación:**
- El archivo exportado se abre correctamente en Excel/Libre Office
- Import con errores muestra tabla de errores por fila (no inserta nada si hay errores críticos)
- Import exitoso muestra confirmación con número de registros insertados

**Dependencias:** TASK-001

---

### TASK-007 — Configuración de Estados por Laboratorio/Programa

**Tipo:** FRONTEND + DB
**Prioridad:** P2
**Fase:** F2
**Esfuerzo:** M
**Estado:** pending

**Descripción:**
La tabla `patient_status_config` existe en migration_v4 pero no tiene UI.
El PRD requiere que los estados del paciente sean configurables por laboratorio/programa.

**Archivos a crear/modificar:**
- Crear: `frontend/web/src/modules/admin/pages/EstadosConfigPage.tsx`
- Modificar: `frontend/web/src/routes/AppRoutes.tsx` — agregar ruta `/admin/estados-config`
- Modificar: `frontend/web/src/modules/patients/components/forms/Step4GuardianConsent.tsx` — cargar estados configurados

**Criterios de aceptación:**
- Admin puede definir qué estados están disponibles para cada programa
- El wizard de paciente solo muestra los estados configurados para el programa seleccionado
- Si no hay configuración, se muestran los estados base del sistema

**Dependencias:** TASK-001, TASK-005

---

### TASK-008 — Asignación Usuario-Programa

**Tipo:** FRONTEND + DB
**Prioridad:** P2
**Fase:** F2
**Esfuerzo:** M
**Estado:** pending

**Descripción:**
La tabla `user_program_assignments` existe pero no tiene UI.
Los educadores deben ver solo los pacientes de sus programas asignados.

**Archivos a crear/modificar:**
- Crear: sección en `UsersAdminPage.tsx` para gestionar asignaciones
- Modificar: `patient.service.ts getAll()` — si rol = EDUCADOR, filtrar por `user_program_assignments`

**Criterios de aceptación:**
- Admin asigna laboratorio(s) y programa(s) a un usuario EDUCADOR
- EDUCADOR con asignaciones: solo ve pacientes de esos programas en el listado

**Dependencias:** TASK-001, TASK-005

---

### TASK-009 — Prioridad Dinámica de Seguimientos

**Tipo:** FRONTEND
**Prioridad:** P2
**Fase:** F2
**Esfuerzo:** S
**Estado:** pending

**Descripción:**
El PRD especifica que la prioridad se calcula en tiempo real: menor `diasRestantes` = mayor prioridad.

**Archivos a modificar:**
- `frontend/web/src/modules/followups/pages/FollowupsPage.tsx`

**Implementación:**
```typescript
const seguimientosConPrioridad = seguimientos
  .map(s => ({
    ...s,
    diasRestantes: Math.ceil((new Date(s.fechaProgramada).getTime() - Date.now()) / 86400000),
  }))
  .sort((a, b) => a.diasRestantes - b.diasRestantes);
```

**Chips de prioridad:**
- `diasRestantes < 0` → label "Vencido" (rojo oscuro)
- `0 ≤ diasRestantes ≤ 3` → "Alta" (rojo)
- `4 ≤ diasRestantes ≤ 7` → "Media" (naranja)
- `diasRestantes > 7` → "Normal" (verde)

**Criterios de aceptación:**
- Los seguimientos se ordenan por días restantes ASC
- Los vencidos aparecen al tope con badge rojo "Vencido"
- El cálculo se hace en el frontend al cargar, sin cambiar datos en DB

**Dependencias:** Ninguna

---

### TASK-010 — Inventario Automático al Registrar Aplicación

**Tipo:** FULLSTACK
**Prioridad:** P2
**Fase:** F2
**Esfuerzo:** M
**Estado:** pending

**Descripción:**
El PRD dice: "Al registrar una aplicación efectiva, se debe descontar del inventario automáticamente".

**Archivos a modificar:**
- `frontend/web/src/services/aplicacionService.ts` — tras crear aplicación exitosa, llamar a inventario
- `frontend/web/src/modules/inventario/services/inventario.service.ts` — agregar función `descontarUnidades()`

**Flujo:**
```
registrarAplicacion(pacienteId, medicamentoId, cantidadAplicada)
  → INSERT INTO aplicaciones (estado = 'APLICADA')
  → UPDATE inventario_paciente SET cantidad_disponible = cantidad_disponible - cantidadAplicada
     WHERE paciente_id = pacienteId AND medicamento_id = medicamentoId
  → INSERT INTO movimientos_inventario (tipo = 'APLICACION', cantidad = -cantidadAplicada)
  → Si cantidad_disponible = 0: mostrar alerta "Inventario agotado"
```

**Criterios de aceptación:**
- Al marcar una aplicación como efectiva, el inventario del paciente se reduce
- Si el inventario cae a cero o menos, se muestra toast de alerta
- El módulo de inventario refleja el cambio inmediatamente

**Dependencias:** TASK-001

---

### TASK-011 — Verificar e Integrar generate_patient_code

**Tipo:** FULLSTACK
**Prioridad:** P2
**Fase:** F2
**Esfuerzo:** S
**Estado:** pending

**Descripción:**
La función `generate_patient_code()` existe en `migration_v4`. Verificar que se invoca al crear paciente
y que el código se muestra correctamente en toda la aplicación.

**Verificaciones:**
1. Revisar `patient.service.ts createPatient()` — ¿llama a `generate_patient_code`?
2. Revisar si hay trigger en DB que lo llame automáticamente
3. Si ninguno, agregar la llamada en `createPatient()` con RPC

**Visibilidad del código:**
- `PacientesPage` listado: mostrar `codigoPaciente` como primera columna
- `PatientDetailPage` header: mostrar código prominente junto al nombre
- Módulos de prescripciones/aplicaciones/entregas: mostrar `codigoPaciente` en el selector de paciente

**Criterios de aceptación:**
- Al crear un paciente, `codigo_paciente` se asigna automáticamente (ej: "AD001")
- El código es visible y consistente en todo el sistema

**Dependencias:** TASK-001

---

## FASE 3 — Optimización

---

### TASK-012 — Paginación Server-Side en Listados

**Tipo:** FRONTEND + DB
**Prioridad:** P2
**Fase:** F3
**Esfuerzo:** L
**Estado:** pending

**Descripción:**
Los servicios actualmente usan `getAll(0, 50)` con pageSize fijo. En producción con miles de
pacientes esto creará tiempos de carga inaceptables.

**Archivos a modificar:** todos los `*Service.ts` y páginas de listados

**Implementación estándar:**
```typescript
// SÃ­ permite: supabase.from('tablename').select('*', { count: 'exact' }).range(from, to)
const { data, count } = await supabase.from('patients').select('*', { count: 'exact' }).range(page * pageSize, (page + 1) * pageSize - 1);
```

**Módulos a priorizar en paginación:** Pacientes, Seguimientos, Prescripciones, Entregas

**Criterios de aceptación:**
- Los listados muestran "Página X de Y" con botones prev/next
- El total de registros se muestra en el header
- Búsqueda y filtros funcionan sobre el total (no solo la página actual)

**Dependencias:** TASK-001

---

### TASK-013 — Reportes Avanzados por Programa/Laboratorio

**Tipo:** FRONTEND
**Prioridad:** P2
**Fase:** F3
**Esfuerzo:** L
**Estado:** pending

**Descripción:**
Ampliar `ReportesPage.tsx` con reportes de valor para el negocio.

**Reportes nuevos:**
1. **Adherencia al tratamiento** — % de aplicaciones realizadas vs programadas por mes
2. **Barreras por categoría** — distribución de tipos y tiempo promedio de resolución
3. **Entregas** — puntualidad (% entregadas a tiempo), devoluciones
4. **Evolución de estados** — gráfico de estado de pacientes por mes (funnel: EN_PROCESO → ACTIVO → DROP_OUT)

**Todos con:** filtro por programa, por laboratorio, por rango de fechas + export xlsx

**Criterios de aceptación:**
- Los reportes muestran datos reales desde Supabase
- Las gráficas usan Recharts (ya instalado)
- Export xlsx funcional (requiere TASK-006)

**Dependencias:** TASK-006

---

### TASK-014 — Tutorial Onboarding para Nuevos Usuarios

**Tipo:** FRONTEND
**Prioridad:** P3
**Fase:** F3
**Esfuerzo:** M
**Estado:** pending

**Descripción:**
El PRD menciona un tutorial para nuevos usuarios sobre las notificaciones y el uso del sistema.

**Implementación:**
- Instalar `react-joyride` o implementar modal de bienvenida simple
- Mostrar solo en primer login (almacenar flag en `user_profiles`)
- Pasos: Dashboard → Pacientes → Notificaciones → Seguimientos

**Criterios de aceptación:**
- El tour aparece solo en el primer login
- El usuario puede saltarlo en cualquier momento
- El flag `tutorial_completado` se guarda en `user_profiles`

**Dependencias:** TASK-004 (notificaciones deben existir para mostrarlas en el tour)

---

### TASK-015 — Módulo RAM (Reacción Adversa a Medicamentos)

**Tipo:** FRONTEND + DB
**Prioridad:** P3
**Fase:** F3
**Esfuerzo:** M
**Estado:** pending

**Descripción:**
El campo `ram` existe en el formulario de paciente pero no hay flujo dedicado.
El PRD lo menciona como dato relevante del paciente.

**Implementación:**
- Crear sección "RAM" en `PatientDetailPage` tab (puede incluirse en el tab de Aplicaciones)
- CRUD simple: registrar fecha, descripción, medicamento asociado, gravedad
- Notificación automática al crear un RAM (usando `notifications` table)
- Opcional: tabla `ramos` en Supabase o usar campo TEXT en patients

**Criterios de aceptación:**
- Educador/Coordinador puede registrar un RAM para un paciente
- El RAM aparece en el historial del paciente
- Se genera notificación automática al coordinador

**Dependencias:** TASK-001, TASK-004

---

## Resumen por Agente

### Para Senior Backend Developer
- TASK-001 (useTenantId hook + services) — P0
- TASK-002 (anonimización DROP_OUT en patient.service.ts) — P0
- TASK-004c (función SQL notificaciones) — P1
- TASK-010 (inventario automático) — P2
- TASK-011 (verificar generate_patient_code) — P2
- TASK-012 (paginación server-side) — P2

### Para Senior Frontend Developer
- TASK-003 (Vista 360° UI) — P1
- TASK-004a/4b/4d (bell + panel + navegación notificaciones) — P1
- TASK-005 (roles en UsersAdminPage) — P1
- TASK-006 (Import/Export Excel real) — P1
- TASK-007 (Config estados por laboratorio) — P2
- TASK-008 (Asignación usuario-programa) — P2
- TASK-009 (Prioridad dinámica seguimientos) — P2
- TASK-013 (Reportes avanzados) — P2
- TASK-014 (Tutorial onboarding) — P3

### Para QA Specialist
- Validar TASK-001 con 2 tenants reales
- Validar TASK-002 con proceso legal colombiano
- Smoke test de todos los módulos CRUD post TASK-001
- Validar TASK-006 import con archivos con errores

---

## Dependencias Críticas entre Tasks

```
TASK-001 (tenant)
  ├── TASK-002 (anonimización)
  ├── TASK-003 (360°)
  ├── TASK-004 (notificaciones)
  ├── TASK-005 (roles)
  │     ├── TASK-007 (config estados)
  │     └── TASK-008 (asignación programa)
  ├── TASK-006 (excel)
  │     └── TASK-013 (reportes avanzados)
  └── TASK-010 (inventario auto)

TASK-004 (notificaciones)
  └── TASK-014 (tutorial)
  └── TASK-015 (RAM)
```

---

*Generado por AI-DLC Master Agent — listo para asignación a agentes de desarrollo*
