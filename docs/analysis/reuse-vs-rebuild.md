# Reuse vs Rebuild — PSP Sistema de Seguimiento a Pacientes
**Modo**: Codebase-Aware Master Agent — PHASE 00  
**Fecha**: 2026-04-08  
**Decisión base**: el sistema tiene ~80% del código ya escrito. Rebuild sería un error.  

---

## VEREDICTO EJECUTIVO

```
✅ REUTILIZAR: 85% del código existente
⚙️ CORREGIR:   12% (bugs + fixes de seguridad/gaps)
🔴 ELIMINAR:   3%  (código obsoleto/duplicado detectado)
🆕 CONSTRUIR:  0%  (nueva arquitectura innecesaria)
```

**La arquitectura React + Supabase es correcta y debe mantenerse.**  
No se necesita backend separado. Supabase cubre todos los casos de uso del PSP.

---

## CAPA 1: BASE DE DATOS — REUTILIZAR TODO

| Componente | Decisión | Justificación |
|---|---|---|
| `schema.sql` (22+ tablas) | ✅ REUTILIZAR | Bien diseñado, indexado, con RLS |
| `tenants` multi-tenant | ✅ REUTILIZAR | Diseño correcto — solo falta activarlo en services |
| `user_profiles` + auth | ✅ REUTILIZAR | Supabase Auth es la decisión correcta |
| Migraciones v2–v4 | ✅ REUTILIZAR | Adicionan campos relevantes correctamente |
| RLS policies (`fix_rls_policies.pgsql`) | ✅ REUTILIZAR | Ya definidas, solo verificar deployment |
| `patient_status_config` | ✅ REUTILIZAR | Tabla creada — falta UI admin |
| `notifications` (migration_v4) | ✅ REUTILIZAR | Tabla creada — falta service + UI |
| `crisis_paciente`, `heridas_paciente` | ✅ REUTILIZAR | Tablas nuevas bien diseñadas |

**No hay que tocar la base de datos.** Solo falta desplegar migraciones pendientes y crear RPCs.

---

## CAPA 2: AUTENTICACIÓN — REUTILIZAR TODO

| Componente | Decisión | Justificación |
|---|---|---|
| `auth.service.ts` | ✅ REUTILIZAR | Login/logout/refresh correctamente implementado |
| `supabaseClient.ts` | ✅ REUTILIZAR | Singleton correcto |
| `LoginPage.tsx` | ✅ REUTILIZAR | Funciona |
| `ProtectedRoute.tsx` | ✅ REUTILIZAR | Funciona |
| `AdminRoute.tsx` | ✅ REUTILIZAR | Funciona — ampliar para más roles |

---

## CAPA 3: SERVICIOS (16 archivos) — CORREGIR, NO RECONSTRUIR

### El patrón de todos los services es correcto:
```typescript
const DEFAULT_TENANT = '...' // ← ESTE ES EL ÚNICO PROBLEMA
// Toda la lógica de queries Supabase es correcta
```

### Decisiones por servicio:
| Servicio | Decisión | Acción concreta |
|---|---|---|
| `patient.service.ts` | ✅ CORREGIR | Reemplazar DEFAULT_TENANT + agregar lógica DROP_OUT anonimización |
| `prescripcionService.ts` | ✅ CORREGIR | Solo reemplazar DEFAULT_TENANT |
| `aplicacionService.ts` | ✅ CORREGIR | Solo reemplazar DEFAULT_TENANT |
| `entregaService.ts` | ✅ CORREGIR | Solo reemplazar DEFAULT_TENANT |
| `seguimientoService.ts` | ✅ CORREGIR | Solo reemplazar DEFAULT_TENANT |
| `barrierService.ts` | ✅ CORREGIR | Reemplazar DEFAULT_TENANT + agregar validación RN1 |
| `tareaService.ts` | ✅ CORREGIR | Solo reemplazar DEFAULT_TENANT |
| `transporteService.ts` | ✅ CORREGIR | Solo reemplazar DEFAULT_TENANT |
| `consentimientoService.ts` | ✅ CORREGIR | Reemplazar DEFAULT_TENANT (también en storage path) |
| `servicioComplementarioService.ts` | ✅ CORREGIR | Solo reemplazar DEFAULT_TENANT |
| `paraclinicoService.ts` | ✅ CORREGIR | Verificar y conectar completamente |
| `catalog.service.ts` | ✅ CORREGIR | Reemplazar DEFAULT_TENANT |
| `dashboardService.ts` | ✅ REUTILIZAR | Correcto — solo falta desplegar RPC |
| `auditoriaService.ts` | ✅ REUTILIZAR | Correcto tal cual |
| `auth.service.ts` | ✅ REUTILIZAR | Correcto tal cual |

**La corrección de tenant es mecánica y repetitiva:**
```typescript
// ANTES (en 11 archivos):
const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
...tenant_id: DEFAULT_TENANT...

// DESPUÉS (crear 1 utility, corregir 11 archivos):
import { getCurrentTenantId } from '@/utils/getCurrentTenant';
const tenantId = await getCurrentTenantId();
...tenant_id: tenantId...
```

---

## CAPA 4: MÓDULOS FRONTEND — REUTILIZAR CON AJUSTES MENORES

### ✅ REUTILIZAR COMPLETAMENTE (funcionan, no tocar)
| Módulo | Archivos clave | Estado |
|---|---|---|
| `patients/pages/PacientesPage.tsx` | PacienteFilters, tabla paginada | ✅ |
| `patients/pages/PatientDetailPage.tsx` | Tabs, header | ✅ |
| `patients/pages/PacienteFormPage.tsx` | Wizard 4 pasos | ✅ |
| `prescripciones/PrescripcionesPage.tsx` | Lista + CRUD | ✅ |
| `aplicaciones/AplicacionesPage.tsx` | Lista + CRUD | ✅ |
| `entregas/EntregasPage.tsx` | Lista + CRUD + estados | ✅ |
| `transportes/TransportesPage.tsx` | CRUD básico | ✅ |
| `consentimientos/ConsentimientosPage.tsx` | Upload + lista | ✅ |
| `admin/*` (12 páginas) | CRUDs admin | ✅ |
| `auth/*` | Login, guards | ✅ |
| `shared/layout/MainLayout.tsx` | TopNavbar horizontal | ✅ |
| `shared/layout/TopNavbar.tsx` | Nav horizontal | ✅ |

### ⚙️ CORREGIR/COMPLETAR (estructura correcta, falta conectar)
| Módulo | Gap | Acción |
|---|---|---|
| `barriers/pages/BarriersPage.tsx` | No valida RN1 en UI antes de crear | Agregar check antes del `POST` |
| `followups/pages/FollowupsPage.tsx` | Parcialmente conectado | Verificar conexión con seguimientoService |
| `tasks/pages/TasksPage.tsx` | Parcialmente conectado | Verificar conexión con tareaService |
| `diagnostics/pages/ParaclinicosPage.tsx` | Mock en algunas vistas | Conectar completamente a paraclinicoService |
| `inventario/pages/InventarioPage.tsx` | Parcialmente conectado | Verificar + agregar ajuste manual |
| `servicios-especiales/pages/ServiciosEspecialesPage.tsx` | Parcialmente conectado | Conectar a servicioComplementarioService |
| `dashboard/DashboardPageEnriched.tsx` | Depende de RPC | Agregar manejo de error si RPC no existe |
| `reportes/pages/ReportesPage.tsx` | Datos mock | Conectar a queries reales + agregar export |

### 🆕 CONSTRUIR (no existen, deben crearse)
| Componente | Dónde | Prioridad |
|---|---|---|
| `utils/getCurrentTenant.ts` | `src/utils/` | P0 — base de todo |
| `hooks/useTenantId.ts` | `src/hooks/` | P0 |
| `patients/components/Patient360Panel.tsx` | `modules/patients/components/` | P1 |
| `services/notificacionesService.ts` | `src/services/` | P1 |
| `shared/components/NotificationsPanel.tsx` | `modules/shared/components/` | P1 |
| Función SQL `get_dashboard_stats()` | Supabase Cloud | P1 |
| Función SQL `get_patient_360()` | Supabase Cloud | P1 |
| Función SQL `generate_notifications()` | Supabase Cloud | P2 |

---

## CAPA 5: CÓDIGO A ELIMINAR (solo 3%)

| Archivo/código | Razón |
|---|---|
| `const DEFAULT_TENANT = '...'` (en 11 archivos) | Reemplazado por `getCurrentTenantId()` |
| Versiones antiguas de Dashboard/Sidebar (si existen en `src/components/`) | Diagnóstico CTO detectó duplicados — verificar y eliminar |
| `src/components/Layout/Sidebar.tsx` (si existe) | Reemplazado por TopNavbar |
| `modules/dashboard/DashboardPage.tsx` y `DashboardPageModern.tsx` (si existen) | Reemplazados por `DashboardPageEnriched.tsx` |

---

## PLAN DE IMPLEMENTACIÓN ORDENADO

### Fase 1 — Estabilización Core (2–3 semanas)
```
TASK-001: Crear getCurrentTenantId() + reemplazar DEFAULT_TENANT en 11 servicios
TASK-002: Implementar anonimización DROP_OUT en patient.service.ts
TASK-003: Migración SQL — agregar EDUCADOR, FARMACEUTICA, AUDITOR, MSL a roles CHECK
TASK-004: Verificar/desplegar RPC get_dashboard_stats en Supabase Cloud  
TASK-005: Agregar manejo de error en DashboardPageEnriched si RPC falla
TASK-006: Verificar/desplegar RPC get_patient_360 en Supabase Cloud
TASK-007: Construir Patient360Panel.tsx + integrarlo en PacienteTabs.tsx
```

### Fase 2 — Conectar módulos desconectados (2–3 semanas)
```
TASK-008: Conectar FollowupsPage completamente a seguimientoService
TASK-009: Conectar TasksPage completamente a tareaService
TASK-010: Conectar ParaclinicosPage + agregar UI para ingresar resultados
TASK-011: Conectar InventarioPage + agregar ajuste manual
TASK-012: Conectar ServiciosEspecialesPage completamente
TASK-013: Agregar validación RN1 en BarriersPage antes de crear barrera
```

### Fase 3 — Funcionalidades nuevas (3–4 semanas)
```
TASK-014: Sistema de notificaciones (notifications table existe — UI falta)
TASK-015: Reportes con datos reales + export Excel/PDF
TASK-016: Dashboard de adherencia
TASK-017: Recuperación de contraseña (Supabase tiene el endpoint — solo UI)
TASK-018: Gestión de Usuarios CRUD completo (UsersAdminPage — verificar endpoints)
```

---

## DECISIÓN ARQUITECTURAL FINAL

```
❌ NO construir backend separado (Node.js, Python, etc.)
   → Supabase cubre 100% de los casos de uso del PSP
   → Agregar un backend añade complejidad sin valor

❌ NO migrar de Supabase a otra base de datos  
   → Schema correcto, RLS funcional, Auth integrada

❌ NO refactorizar el stack tecnológico
   → React 18 + TypeScript + MUI + Vite es el stack correcto

✅ SÍ hacer todos los cambios dentro de la arquitectura existente
✅ SÍ reutilizar los 16 servicios (solo corregir tenant en 11 de ellos)
✅ SÍ reutilizar las 22+ tablas (solo agregar RPCs faltantes)
✅ SÍ reutilizar todos los módulos frontend (solo conectar y completar)
✅ SÍ usar Supabase Edge Functions si se necesita lógica server-side compleja
```

---

## RESUMEN DE ESFUERZO TOTAL

| Tipo de trabajo | Horas estimadas | % del total |
|---|---|---|
| Corregir DEFAULT_TENANT (11 servicios) | 8–16h | 15% |
| Anonimización DROP_OUT | 2–4h | 4% |
| Roles DB + guards | 4–8h | 7% |
| RPCs Supabase (dashboard, 360, notif) | 4–8h | 7% |
| Patient360Panel.tsx | 6–10h | 10% |
| Conectar módulos desconectados (6 mód.) | 16–24h | 28% |
| Sistema notificaciones | 12–20h | 20% |
| Reportes reales + export | 8–16h | 15% |
| **TOTAL** | **~60–106h** | — |

> Comparado con reconstrucción desde cero: >600h. El código existente ahorra **5–6x** el esfuerzo.
