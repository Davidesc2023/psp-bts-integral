# PSP â€” Lista de Tareas Ejecutables para Agentes

**VersiÃ³n:** 1.0 (AI-DLC Master Agent)
**Fecha:** 2026-04-06
**Estado:** Listo para asignaciÃ³n a agentes de desarrollo

---

## Convenciones

- **ID:** formato `TASK-XXX`
- **Tipo:** `FRONTEND` | `DB` | `FULLSTACK` | `SECURITY`
- **Prioridad:** `P0` (crÃ­tico) | `P1` (alto) | `P2` (medio) | `P3` (mejora)
- **Fase:** `F1` (Core/MVP) | `F2` (Extendido) | `F3` (Escala)
- **Esfuerzo:** S (< 4h) | M (4â€“8h) | L (8â€“16h) | XL (> 16h)
- **Estado:** `pending` | `in-progress` | `done`

---

## FASE 1 â€” Core (Bloqueadores de ProducciÃ³n)

---

### TASK-001 â€” Hook useTenantId + inyecciÃ³n en todos los services

**Tipo:** SECURITY + FRONTEND
**Prioridad:** P0 â€” CRÃTICO
**Fase:** F1
**Esfuerzo:** L
**Estado:** done

**DescripciÃ³n:**
Todos los servicios usan `const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001'` hardcodeado.
Debe reemplazarse por lectura dinÃ¡mica desde el perfil del usuario autenticado.

**Archivos a modificar:**
- Crear: `frontend/web/src/hooks/useTenantId.ts`
- Crear: `frontend/web/src/utils/getCurrentTenant.ts` (versiÃ³n async para services)
- Modificar: todos los archivos en `frontend/web/src/services/` que tengan `DEFAULT_TENANT`

**ImplementaciÃ³n:**
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

**Criterios de aceptaciÃ³n:**
- `DEFAULT_TENANT` no aparece en ningÃºn archivo de `/services/`
- Las queries en Supabase se filtran por el `tenant_id` real del usuario autenticado
- RLS rechaza datos de otros tenants

**Dependencias:** Ninguna

---

### TASK-002 â€” AnonimizaciÃ³n automÃ¡tica al DROP_OUT

**Tipo:** FULLSTACK
**Prioridad:** P0 â€” CRÃTICO (obligaciÃ³n legal)
**Fase:** F1
**Esfuerzo:** M
**Estado:** done

**DescripciÃ³n:**
Cuando el `status` de un paciente cambia a `DROP_OUT`, los campos de datos personales sensibles
deben ser enmascarados automÃ¡ticamente conforme a la Ley 1581/2012 (Habeas Data, Colombia).

**Archivos a modificar:**
- `frontend/web/src/services/patient.service.ts` â€” funciÃ³n `updatePatient()`
- `frontend/web/src/modules/patients/pages/PatientDetailPage.tsx` â€” mostrar banner anonimizado

**Campos a anonimizar (reemplazar por "ANONIMIZADO"):**
```
first_name, second_name, last_name, second_last_name,
document_number, email, phone, phone2,
address, emergency_contact_name, emergency_contact_phone
```

**Campos a preservar (trazabilidad estadÃ­stica):**
```
id, codigo_paciente, tenant_id, programa_psp_id, laboratorio_id,
diagnostico_id, status, fecha_retiro, motivo_retiro,
anonymized = true, anonymized_at = NOW()
```

**Criterios de aceptaciÃ³n:**
- Al guardar un paciente con `status = DROP_OUT`, los campos personales se enmascaran
- El campo `anonymized = true` y `anonymized_at` quedan registrados en la fila
- `PatientDetailPage` muestra banner visible "Paciente anonimizado â€” Datos personales protegidos por Ley 1581/2012"
- En `PacientesPage` listado, el nombre aparece como "ANONIMIZADO" para pacientes drop out

**Dependencias:** TASK-001

---

### TASK-003 â€” Vista 360Â° del Paciente (componente UI)

**Tipo:** FRONTEND
**Prioridad:** P1
**Fase:** F1
**Esfuerzo:** L
**Estado:** done

**DescripciÃ³n:**
Implementar el panel consolidado `Patient360Panel` que las educadoras usan para ver
el estado completo de un paciente de un vistazo.

La funciÃ³n RPC `get_patient_360` ya estÃ¡ definida en `patient.service.ts get360()`.
Solo falta el componente UI.

**Archivos a crear/modificar:**
- Crear: `frontend/web/src/modules/patients/components/Patient360Panel.tsx`
- Modificar: `frontend/web/src/modules/patients/components/PacienteTabs.tsx` â€” agregar tab "Vista 360Â°" (primer tab)

**Secciones del panel:**

| SecciÃ³n | Datos a mostrar | Color indicator |
|---------|----------------|----------------|
| PrescripciÃ³n | PrescripciÃ³n activa, dÃ­as para vencer | Verde/Amarillo/Rojo |
| Barreras | NÂ° barreras abiertas, dÃ­as mÃ¡s antigua | SegÃºn cantidad |
| Aplicaciones | PrÃ³xima aplicaciÃ³n, Ãºltima realizada | Verde si < 3 dÃ­as |
| Entregas | Ãšltima entrega, dÃ­as de medicamento restantes | Alerta si < 7 dÃ­as |
| Seguimientos | NÂ° tareas pendientes de alta prioridad | Rojo si > 0 urgentes |
| Estado general | Chip de estado + subestado | Por estado |

**Criterios de aceptaciÃ³n:**
- Tab "Vista 360Â°" aparece como primer tab en `PatientDetailPage`
- Los indicadores visuales cambian de color segÃºn umbrales
- Si `get_patient_360` RPC no existe en Supabase Cloud, mostrar datos agregados desde las 5+ queries individuales como fallback

**Dependencias:** TASK-001

---

### TASK-004 â€” Sistema de Notificaciones (bell + panel + generaciÃ³n)

**Tipo:** FULLSTACK
**Prioridad:** P1
**Fase:** F1
**Esfuerzo:** XL
**Estado:** done

**Sub-tareas:**

**4a â€” UI: Bell + Panel en MainLayout**
- Archivo: `frontend/web/src/modules/shared/layout/MainLayout.tsx`
- Agregar `Badge` con contador de notificaciones no leÃ­das en el header
- Panel dropdown al hacer clic: lista de notificaciones con Ã­cono, tÃ­tulo, fecha y link

**4b â€” Service: notificacionesService.ts**
- Crear: `frontend/web/src/services/notificacionesService.ts`
- Lee tabla `notifications` (ya existe en migration_v4)
- FunciÃ³n `getUnread(tenantId)`, `markAsRead(notifId)`, `markAllAsRead(tenantId)`

**4c â€” DB: FunciÃ³n SQL para generar notificaciones**
Crear en Supabase (o edge function) que genere registros en `notifications` cuando:
- Seguimiento `fecha_programada` < NOW() + 48h y estado = 'PENDIENTE'
- PrescripciÃ³n `fecha_vencimiento_prescripcion` < NOW() + 7 dÃ­as y estado = 'VIGENTE'
- Barrera `status = 'ABIERTA'` y `opened_at` < NOW() - 5 dÃ­as
- AplicaciÃ³n `estado = 'NO_APLICADA'` sin barrera asociada

**4d â€” NavegaciÃ³n desde notificaciÃ³n**
- Al hacer clic en una notificaciÃ³n, navegar a `/patients/:id` (pestaÃ±a correspondiente)
- Marcar como leÃ­da al navegar

**Criterios de aceptaciÃ³n:**
- Bell icon muestra badge con nÃºmero de notificaciones no leÃ­das (real-time via Supabase subscription)
- Panel dropdown muestra lista ordenada por fecha descendente
- Hacer clic navega al recurso correcto
- Notificaciones leÃ­das se ocultan o aparecen en secciÃ³n "leÃ­das"

**Dependencias:** TASK-001

---

### TASK-005 â€” AlineaciÃ³n de Roles con PRD

**Tipo:** DB + FRONTEND
**Prioridad:** P1
**Fase:** F1
**Esfuerzo:** M
**Estado:** done

**DescripciÃ³n:**
Los roles en DB (`user_profiles.role`) no incluyen `EDUCADOR` ni `MSL` que define el PRD.

**Pasos:**
1. MigraciÃ³n SQL: alterar CHECK constraint en `user_profiles` para incluir `EDUCADOR` y `MSL`
2. Modificar `UsersAdminPage.tsx` para mostrar/seleccionar los 5 roles del PRD
3. Actualizar `AdminRoute.tsx` para incluir lÃ³gica de acceso por rol
4. Documentar matriz de permisos por rol

**MigraciÃ³n SQL:**
```sql
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('SUPER_ADMIN','ADMIN_INSTITUCION','MEDICO','ENFERMERIA',
                'COORDINADOR','PACIENTE','CUIDADOR','EDUCADOR','MSL'));
```

**Criterios de aceptaciÃ³n:**
- Los roles EDUCADOR y MSL son asignables desde la UI de admin
- Los EDUCADOR solo ven mÃ³dulos de seguimiento, aplicaciones, entregas (no admin)
- Los MSL ven anÃ¡lisis/reportes de su laboratorio asignado

**Dependencias:** TASK-001

---

## FASE 2 â€” Features Extendidos

---

### TASK-006 â€” Import/Export Excel Real

**Tipo:** FRONTEND
**Prioridad:** P1
**Fase:** F2
**Esfuerzo:** XL
**Estado:** done

**DescripciÃ³n:**
Actualmente `ReportesPage.tsx` genera CSV disfrazado de Excel (`.xls`). Implementar export/import real.

**Sub-tareas:**

**6a â€” Dependencia:**
```bash
npm install xlsx
```

**6b â€” Export:**
- Reemplazar `downloadExcel()` en `ReportesPage.tsx` por `XLSX.utils.json_to_sheet()` + `XLSX.writeFile()`
- Los datos exportados deben incluir los filtros activos

**6c â€” Import â€” componente ImportExcelButton:**
- Crear `frontend/web/src/modules/shared/components/ImportExcelButton.tsx`
- Acepta archivo `.xlsx`
- Parsea con `XLSX.read()`
- Valida cada fila contra un schema de columnas requeridas
- Muestra reporte de errores (tabla con fila y mensaje)
- Inserta registros vÃ¡lidos en Supabase (usando `import_jobs` table como cola)

**6d â€” Plantilla descargable:**
- BotÃ³n "Descargar Plantilla" en los mÃ³dulos con import
- Genera xlsx vacÃ­o con encabezados correctos y tooltips de validaciÃ³n

**MÃ³dulos prioritarios para import/export:**
1. Pacientes (mayor impacto)
2. Seguimientos
3. Prescripciones
4. Entregas

**Criterios de aceptaciÃ³n:**
- El archivo exportado se abre correctamente en Excel/Libre Office
- Import con errores muestra tabla de errores por fila (no inserta nada si hay errores crÃ­ticos)
- Import exitoso muestra confirmaciÃ³n con nÃºmero de registros insertados

**Dependencias:** TASK-001

---

### TASK-007 â€” ConfiguraciÃ³n de Estados por Laboratorio/Programa

**Tipo:** FRONTEND + DB
**Prioridad:** P2
**Fase:** F2
**Esfuerzo:** M
**Estado:** done

**DescripciÃ³n:**
La tabla `patient_status_config` existe en migration_v4 pero no tiene UI.
El PRD requiere que los estados del paciente sean configurables por laboratorio/programa.

**Archivos a crear/modificar:**
- Crear: `frontend/web/src/modules/admin/pages/EstadosConfigPage.tsx`
- Modificar: `frontend/web/src/routes/AppRoutes.tsx` â€” agregar ruta `/admin/estados-config`
- Modificar: `frontend/web/src/modules/patients/components/forms/Step4GuardianConsent.tsx` â€” cargar estados configurados

**Criterios de aceptaciÃ³n:**
- Admin puede definir quÃ© estados estÃ¡n disponibles para cada programa
- El wizard de paciente solo muestra los estados configurados para el programa seleccionado
- Si no hay configuraciÃ³n, se muestran los estados base del sistema

**Dependencias:** TASK-001, TASK-005

---

### TASK-008 â€” AsignaciÃ³n Usuario-Programa

**Tipo:** FRONTEND + DB
**Prioridad:** P2
**Fase:** F2
**Esfuerzo:** M
**Estado:** done

**DescripciÃ³n:**
La tabla `user_program_assignments` existe pero no tiene UI.
Los educadores deben ver solo los pacientes de sus programas asignados.

**Archivos a crear/modificar:**
- Crear: secciÃ³n en `UsersAdminPage.tsx` para gestionar asignaciones
- Modificar: `patient.service.ts getAll()` â€” si rol = EDUCADOR, filtrar por `user_program_assignments`

**Criterios de aceptaciÃ³n:**
- Admin asigna laboratorio(s) y programa(s) a un usuario EDUCADOR
- EDUCADOR con asignaciones: solo ve pacientes de esos programas en el listado

**Dependencias:** TASK-001, TASK-005

---

### TASK-009 â€” Prioridad DinÃ¡mica de Seguimientos

**Tipo:** FRONTEND
**Prioridad:** P2
**Fase:** F2
**Esfuerzo:** S
**Estado:** done

**DescripciÃ³n:**
El PRD especifica que la prioridad se calcula en tiempo real: menor `diasRestantes` = mayor prioridad.

**Archivos a modificar:**
- `frontend/web/src/modules/followups/pages/FollowupsPage.tsx`

**ImplementaciÃ³n:**
```typescript
const seguimientosConPrioridad = seguimientos
  .map(s => ({
    ...s,
    diasRestantes: Math.ceil((new Date(s.fechaProgramada).getTime() - Date.now()) / 86400000),
  }))
  .sort((a, b) => a.diasRestantes - b.diasRestantes);
```

**Chips de prioridad:**
- `diasRestantes < 0` â†’ label "Vencido" (rojo oscuro)
- `0 â‰¤ diasRestantes â‰¤ 3` â†’ "Alta" (rojo)
- `4 â‰¤ diasRestantes â‰¤ 7` â†’ "Media" (naranja)
- `diasRestantes > 7` â†’ "Normal" (verde)

**Criterios de aceptaciÃ³n:**
- Los seguimientos se ordenan por dÃ­as restantes ASC
- Los vencidos aparecen al tope con badge rojo "Vencido"
- El cÃ¡lculo se hace en el frontend al cargar, sin cambiar datos en DB

**Dependencias:** Ninguna

---

### TASK-010 â€” Inventario AutomÃ¡tico al Registrar AplicaciÃ³n

**Tipo:** FULLSTACK
**Prioridad:** P2
**Fase:** F2
**Esfuerzo:** M
**Estado:** done

**DescripciÃ³n:**
El PRD dice: "Al registrar una aplicaciÃ³n efectiva, se debe descontar del inventario automÃ¡ticamente".

**Archivos a modificar:**
- `frontend/web/src/services/aplicacionService.ts` â€” tras crear aplicaciÃ³n exitosa, llamar a inventario
- `frontend/web/src/modules/inventario/services/inventario.service.ts` â€” agregar funciÃ³n `descontarUnidades()`

**Flujo:**
```
registrarAplicacion(pacienteId, medicamentoId, cantidadAplicada)
  â†’ INSERT INTO aplicaciones (estado = 'APLICADA')
  â†’ UPDATE inventario_paciente SET cantidad_disponible = cantidad_disponible - cantidadAplicada
     WHERE paciente_id = pacienteId AND medicamento_id = medicamentoId
  â†’ INSERT INTO movimientos_inventario (tipo = 'APLICACION', cantidad = -cantidadAplicada)
  â†’ Si cantidad_disponible = 0: mostrar alerta "Inventario agotado"
```

**Criterios de aceptaciÃ³n:**
- Al marcar una aplicaciÃ³n como efectiva, el inventario del paciente se reduce
- Si el inventario cae a cero o menos, se muestra toast de alerta
- El mÃ³dulo de inventario refleja el cambio inmediatamente

**Dependencias:** TASK-001

---

### TASK-011 â€” Verificar e Integrar generate_patient_code

**Tipo:** FULLSTACK
**Prioridad:** P2
**Fase:** F2
**Esfuerzo:** S
**Estado:** done

**DescripciÃ³n:**
La funciÃ³n `generate_patient_code()` existe en `migration_v4`. Verificar que se invoca al crear paciente
y que el cÃ³digo se muestra correctamente en toda la aplicaciÃ³n.

**Verificaciones:**
1. Revisar `patient.service.ts createPatient()` â€” Â¿llama a `generate_patient_code`?
2. Revisar si hay trigger en DB que lo llame automÃ¡ticamente
3. Si ninguno, agregar la llamada en `createPatient()` con RPC

**Visibilidad del cÃ³digo:**
- `PacientesPage` listado: mostrar `codigoPaciente` como primera columna
- `PatientDetailPage` header: mostrar cÃ³digo prominente junto al nombre
- MÃ³dulos de prescripciones/aplicaciones/entregas: mostrar `codigoPaciente` en el selector de paciente

**Criterios de aceptaciÃ³n:**
- Al crear un paciente, `codigo_paciente` se asigna automÃ¡ticamente (ej: "AD001")
- El cÃ³digo es visible y consistente en todo el sistema

**Dependencias:** TASK-001

---

## FASE 3 â€” OptimizaciÃ³n

---

### TASK-012 â€” PaginaciÃ³n Server-Side en Listados

**Tipo:** FRONTEND + DB
**Prioridad:** P2
**Fase:** F3
**Esfuerzo:** L
**Estado:** done

**DescripciÃ³n:**
Los servicios actualmente usan `getAll(0, 50)` con pageSize fijo. En producciÃ³n con miles de
pacientes esto crearÃ¡ tiempos de carga inaceptables.

**Archivos a modificar:** todos los `*Service.ts` y pÃ¡ginas de listados

**ImplementaciÃ³n estÃ¡ndar:**
```typescript
// SÃƒÂ­ permite: supabase.from('tablename').select('*', { count: 'exact' }).range(from, to)
const { data, count } = await supabase.from('patients').select('*', { count: 'exact' }).range(page * pageSize, (page + 1) * pageSize - 1);
```

**MÃ³dulos a priorizar en paginaciÃ³n:** Pacientes, Seguimientos, Prescripciones, Entregas

**Criterios de aceptaciÃ³n:**
- Los listados muestran "PÃ¡gina X de Y" con botones prev/next
- El total de registros se muestra en el header
- BÃºsqueda y filtros funcionan sobre el total (no solo la pÃ¡gina actual)

**Dependencias:** TASK-001

---

### TASK-013 â€” Reportes Avanzados por Programa/Laboratorio

**Tipo:** FRONTEND
**Prioridad:** P2
**Fase:** F3
**Esfuerzo:** L
**Estado:** done

**DescripciÃ³n:**
Ampliar `ReportesPage.tsx` con reportes de valor para el negocio.

**Reportes nuevos:**
1. **Adherencia al tratamiento** â€” % de aplicaciones realizadas vs programadas por mes
2. **Barreras por categorÃ­a** â€” distribuciÃ³n de tipos y tiempo promedio de resoluciÃ³n
3. **Entregas** â€” puntualidad (% entregadas a tiempo), devoluciones
4. **EvoluciÃ³n de estados** â€” grÃ¡fico de estado de pacientes por mes (funnel: EN_PROCESO â†’ ACTIVO â†’ DROP_OUT)

**Todos con:** filtro por programa, por laboratorio, por rango de fechas + export xlsx

**Criterios de aceptaciÃ³n:**
- Los reportes muestran datos reales desde Supabase
- Las grÃ¡ficas usan Recharts (ya instalado)
- Export xlsx funcional (requiere TASK-006)

**Dependencias:** TASK-006

---

### TASK-014 â€” Tutorial Onboarding para Nuevos Usuarios

**Tipo:** FRONTEND
**Prioridad:** P3
**Fase:** F3
**Esfuerzo:** M
**Estado:** done

**DescripciÃ³n:**
El PRD menciona un tutorial para nuevos usuarios sobre las notificaciones y el uso del sistema.

**ImplementaciÃ³n:**
- Instalar `react-joyride` o implementar modal de bienvenida simple
- Mostrar solo en primer login (almacenar flag en `user_profiles`)
- Pasos: Dashboard â†’ Pacientes â†’ Notificaciones â†’ Seguimientos

**Criterios de aceptaciÃ³n:**
- El tour aparece solo en el primer login
- El usuario puede saltarlo en cualquier momento
- El flag `tutorial_completado` se guarda en `user_profiles`

**Dependencias:** TASK-004 (notificaciones deben existir para mostrarlas en el tour)

---

### TASK-015 â€” MÃ³dulo RAM (ReacciÃ³n Adversa a Medicamentos)

**Tipo:** FRONTEND + DB
**Prioridad:** P3
**Fase:** F3
**Esfuerzo:** M
**Estado:** done

**DescripciÃ³n:**
El campo `ram` existe en el formulario de paciente pero no hay flujo dedicado.
El PRD lo menciona como dato relevante del paciente.

**ImplementaciÃ³n:**
- Crear secciÃ³n "RAM" en `PatientDetailPage` tab (puede incluirse en el tab de Aplicaciones)
- CRUD simple: registrar fecha, descripciÃ³n, medicamento asociado, gravedad
- NotificaciÃ³n automÃ¡tica al crear un RAM (usando `notifications` table)
- Opcional: tabla `ramos` en Supabase o usar campo TEXT en patients

**Criterios de aceptaciÃ³n:**
- Educador/Coordinador puede registrar un RAM para un paciente
- El RAM aparece en el historial del paciente
- Se genera notificaciÃ³n automÃ¡tica al coordinador

**Dependencias:** TASK-001, TASK-004

---

## Resumen por Agente

### Para Senior Backend Developer
- TASK-001 (useTenantId hook + services) â€” P0
- TASK-002 (anonimizaciÃ³n DROP_OUT en patient.service.ts) â€” P0
- TASK-004c (funciÃ³n SQL notificaciones) â€” P1
- TASK-010 (inventario automÃ¡tico) â€” P2
- TASK-011 (verificar generate_patient_code) â€” P2
- TASK-012 (paginaciÃ³n server-side) â€” P2

### Para Senior Frontend Developer
- TASK-003 (Vista 360Â° UI) â€” P1
- TASK-004a/4b/4d (bell + panel + navegaciÃ³n notificaciones) â€” P1
- TASK-005 (roles en UsersAdminPage) â€” P1
- TASK-006 (Import/Export Excel real) â€” P1
- TASK-007 (Config estados por laboratorio) â€” P2
- TASK-008 (AsignaciÃ³n usuario-programa) â€” P2
- TASK-009 (Prioridad dinÃ¡mica seguimientos) â€” P2
- TASK-013 (Reportes avanzados) â€” P2
- TASK-014 (Tutorial onboarding) â€” P3

### Para QA Specialist
- Validar TASK-001 con 2 tenants reales
- Validar TASK-002 con proceso legal colombiano
- Smoke test de todos los mÃ³dulos CRUD post TASK-001
- Validar TASK-006 import con archivos con errores

---

## Dependencias CrÃ­ticas entre Tasks

```
TASK-001 (tenant)
  â”œâ”€â”€ TASK-002 (anonimizaciÃ³n)
  â”œâ”€â”€ TASK-003 (360Â°)
  â”œâ”€â”€ TASK-004 (notificaciones)
  â”œâ”€â”€ TASK-005 (roles)
  â”‚     â”œâ”€â”€ TASK-007 (config estados)
  â”‚     â””â”€â”€ TASK-008 (asignaciÃ³n programa)
  â”œâ”€â”€ TASK-006 (excel)
  â”‚     â””â”€â”€ TASK-013 (reportes avanzados)
  â””â”€â”€ TASK-010 (inventario auto)

TASK-004 (notificaciones)
  â””â”€â”€ TASK-014 (tutorial)
  â””â”€â”€ TASK-015 (RAM)
```

---

*Generado por AI-DLC Master Agent â€” listo para asignaciÃ³n a agentes de desarrollo*
