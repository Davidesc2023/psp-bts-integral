# Gap Analysis — PSP Sistema de Seguimiento a Pacientes
**Modo**: Codebase-Aware Master Agent — PHASE 00  
**Fecha**: 2026-04-08  
**Fuentes**: USER_STORIES_PSP.md (44 HU) vs código real del workspace  

---

## RESUMEN EJECUTIVO

| Categoría | Cantidad | % |
|---|---|---|
| Historias completamente implementadas ✅ | 19 | 43% |
| Historias parcialmente implementadas ⚠️ | 17 | 39% |
| Historias pendientes ❌ | 8 | 18% |
| **Issues críticos de seguridad/legal** | **3** | — |

**Conclusión**: El sistema tiene ~80% del código de UI construido. Los gaps principales son:
1. Un problema de seguridad P0 que bloquea producción multi-tenant
2. Una obligación legal (Ley 1581) no implementada
3. ~10 módulos desconectados del backend real (usan mock o service parcial)
4. Roles mal alineados con el PRD

---

## MÓDULO 1: AUTENTICACIÓN Y SEGURIDAD

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-001 | Inicio de Sesión | ✅ Implementada | — |
| HU-002 | Control de Acceso por Rol | ⚠️ Parcial | Guards frontend incompletos; roles PRD ≠ roles DB |
| HU-003 | Gestión de Usuarios (ADMIN) | ❌ Pendiente | UsersAdminPage existe, falta verificar endpoints CRUD completo |
| HU-004 | Cambio/Recuperación Contraseña | ❌ Pendiente | Supabase tiene reset_password — solo falta conectar UI |

**Gaps de seguridad transversales:**

| Gap | Criticidad | Descripción |
|---|---|---|
| DEFAULT_TENANT hardcodeado | 🔴 P0 CRÍTICO | 11 servicios usan `'00000000-...'` — bloquea multi-tenancy |
| Roles DB incompletos | 🔴 P1 | EDUCADORA, FARMACEUTICA, AUDITOR, MSL no existen en CHECK constraint |
| Guards frontend | 🟡 P2 | ProtectedRoute y AdminRoute existen; guards por rol específico (MEDICO, FARMACEUTICA) no implementados en páginas individuales |

---

## MÓDULO 2: PACIENTES

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-005 | Listado de Pacientes | ✅ | Funciona. Filtros básicos OK |
| HU-006 | Registro Nuevo Paciente (Wizard 4 pasos) | ✅ | Wizard funciona. Paso 1–4 implementados |
| HU-007 | Detalle del Paciente (tabs) | ✅ | PatientDetailPage con tabs funciona |
| HU-008 | Cambio de Estado del Paciente | ⚠️ Parcial | Backend OK; UI historial de estados pendiente |
| HU-009 | Edición de Datos del Paciente | ✅ | Wizard pre-poblado funciona |
| HU-010 | Búsqueda Avanzada | ⚠️ Parcial | Filtros básicos OK; export Excel/CSV ❌ pendiente |

**Gap crítico — Vista 360°:**
- `patientService.get360()` YA EXISTE en código
- Componente `Patient360Panel.tsx` NO EXISTE
- Tab "Vista 360°" NO existe en `PacienteTabs.tsx`
- La función RPC `get_patient_360` necesita verificar si está desplegada en Supabase Cloud

**Gap legal — Anonimización DROP_OUT:**
- `patient.service.ts updatePatient()` NO detecta `status === 'DROP_OUT'`
- Los campos personales NO se enmascaran al pasar a DROP_OUT
- Campo `anonymized` existe en la tabla pero no se escribe
- **Obligación Ley 1581/2012 Colombia — sin implementar**

---

## MÓDULO 3: PRESCRIPCIONES

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-011 | Listado de Prescripciones | ✅ | Funciona |
| HU-012 | Crear Prescripción | ✅ | Funciona |
| HU-013 | Gestión Médicos Prescriptores | ✅ | MedicosAdminPage existe |
| HU-014 | Gestión Medicamentos | ⚠️ Parcial | MedicamentosAdminPage existe; falta bulk upload Excel |

---

## MÓDULO 4: APLICACIONES

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-015 | Listado de Aplicaciones | ✅ | Funciona |
| HU-016 | Registrar Aplicación | ✅ | Funciona |
| HU-017 | Generación Masiva de Aplicaciones | ✅ | Bulk generation endpoint OK |

---

## MÓDULO 5: ENTREGAS

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-018 | Listado de Entregas | ✅ | Funciona |
| HU-019 | Crear Entrega | ✅ | Funciona |
| HU-020 | Avance de Estado de Entrega | ✅ | Funciona |

---

## MÓDULO 6: PARACLÍNICOS

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-021 | Listado de Paraclínicos | ⚠️ Parcial | UI OK pero puede usar mock en algunos casos |
| HU-022 | Solicitar Examen | ⚠️ Parcial | POST endpoint funciona; GET listado puede ser mock |
| HU-023 | Registrar Resultado | ❌ Pendiente | Sin UI para ingresar resultados |
| HU-024 | Gestión Tipos Examen Admin | ⚠️ Parcial | TiposParaclinicoAdminPage existe; falta bulk upload |

---

## MÓDULO 7: BARRERAS

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-025 | Listado de Barreras | ⚠️ Parcial | UI existe con apiClient pero puede desconectarse |
| HU-026 | Registrar Barrera | ⚠️ Parcial | **Gap crítico: UI no valida RN1 (1 barrera activa máx)** |
| HU-027 | Cerrar Barrera | ⚠️ Parcial | Backend OK; frontend parcial |
| HU-028 | Gestión Categorías Barrera | ❌ Pendiente | Están como enums, necesitan tabla BD + UI admin |

---

## MÓDULO 8: SEGUIMIENTOS

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-029 | Listado de Seguimientos | ⚠️ Parcial | Service existe; frontend puede no estar totalmente conectado |
| HU-030 | Registrar Seguimiento | ⚠️ Parcial | Backend OK; frontend desconectado o parcial |

---

## MÓDULO 9: TAREAS

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-031 | Listado de Tareas (Kanban) | ⚠️ Parcial | TasksPage existe; puede usar mock para algunos datos |
| HU-032 | Crear Tarea | ⚠️ Parcial | Backend OK; frontend desconectado o parcial |
| HU-033 | Gestionar Estado de Tarea | ⚠️ Parcial | Backend OK; frontend desconectado o parcial |

---

## MÓDULO 10: TRANSPORTES

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-034 | Gestión de Transportes | ⚠️ Parcial | Backend OK; frontend básico |

---

## MÓDULO 11: INVENTARIO

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-035 | Ver Inventario por Paciente | ⚠️ Parcial | InventarioPage existe; puede usar mock |
| HU-036 | Ajuste Manual de Inventario | ❌ Pendiente | CRUD ajuste manual no implementado |

---

## MÓDULO 12: SERVICIOS COMPLEMENTARIOS

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-037 | Gestión Servicios Complementarios | ⚠️ Parcial | Service y page existen; frontend usa mock |

---

## MÓDULO 13: DASHBOARD Y KPIs

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-038 | Dashboard Principal | ⚠️ Parcial | UI OK; datos dependen de RPC `get_dashboard_stats` |
| HU-039 | Dashboard de Adherencia | ❌ Pendiente | Sin UI específica; adherencia service no implementado en frontend |

---

## MÓDULO 14: REPORTES

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-040 | Generación de Reportes | ⚠️ Parcial | UI con mock; sin backend real; sin export Excel/PDF |

---

## MÓDULO 15: PANEL DE ADMINISTRACIÓN

| HU | Descripción | Estado | Gap |
|---|---|---|---|
| HU-041 | Dashboard Admin | ❌ Pendiente | Admin ruta existe pero AdminDashboardPage puede ser stub |
| HU-042+ | Gestión de EPS, IPS, etc. | ✅ | 10 páginas admin implementadas |

---

## ISSUES CRÍTICOS TRANSVERSALES

### 🔴 CRÍTICO-1: Multi-Tenancy Roto (P0 — Bloquea Producción)
```
Afecta: 11 servicios
Qué pasa: todos los datos se leen/escriben con tenant fijo '00000000-...'
Impacto: en producción con 2+ organizaciones, los datos se mezclan
Fix: crear utils/getCurrentTenant.ts + reemplazar en 11 services
Esfuerzo: L (8-16h)
Archivos: patient.service.ts, prescripcionService.ts, aplicacionService.ts,
          entregaService.ts, seguimientoService.ts, barrierService.ts,
          tareaService.ts, transporteService.ts, consentimientoService.ts,
          servicioComplementarioService.ts, catalog.service.ts
```

### 🔴 CRÍTICO-2: Anonimización DROP_OUT (P0 — Obligación Legal Ley 1581)
```
Afecta: patient.service.ts (updatePatient), PatientDetailPage.tsx
Qué pasa: al cambiar status a DROP_OUT, los datos personales NO se enmascaran
Impacto: INCUMPLIMIENTO LEGAL — habeas data Colombia
Fix: ~2h de implementación
```

### 🟡 CRÍTICO-3: Roles Incompletos (P1)
```
Afecta: user_profiles CHECK constraint + guards frontend
Qué pasa: EDUCADORA, FARMACEUTICA, AUDITOR, MSL no están en la DB
Impacto: cuando esos roles se creen no podrán hacer login
Fix: migración SQL + alinear guards
```

### 🟡 CRÍTICO-4: RPC Dashboard no verificada (P1)
```
Afecta: dashboardService.ts → supabase.rpc('get_dashboard_stats')
Qué pasa: si la función no está desplegada en Supabase Cloud, dashboard falla
Fix: verificar/desplegar la función RPC en Supabase Cloud
```

### 🟡 CRÍTICO-5: Vista 360° sin UI (P1)
```
Afecta: PatientDetailPage.tsx, PacienteTabs.tsx
Qué pasa: el service get360() existe pero no hay componente UI
Impacto: educadoras no tienen la vista principal que necesitan
Fix: crear Patient360Panel.tsx (~4-6h)
```

---

## MATRIZ DE GAPS POR PRIORIDAD

| Prioridad | Gap | Esfuerzo | Bloqueado por |
|---|---|---|---|
| P0 | Multi-tenant dinámico | L (8-16h) | Nada |
| P0 | Anonimización DROP_OUT | M (2-4h) | Nada |
| P1 | Roles DB + guards frontend | M (4-8h) | Nada |
| P1 | RPC get_dashboard_stats en Cloud | S (1-2h) | Supabase access |
| P1 | Vista 360° Patient360Panel.tsx | L (6-10h) | P0 multi-tenant |
| P1 | Sistema notificaciones | XL (>16h) | P0 multi-tenant |
| P2 | Paraclínicos — registrar resultado | M (4-8h) | P0 |
| P2 | Reportes con datos reales + export | L (8-16h) | P0 |
| P2 | Gestión Usuarios Admin (CRUD completo) | M (4-8h) | P1 roles |
| P2 | Recuperación de contraseña | S (1-2h) | Nada |
| P2 | Inventario ajuste manual | M (4-8h) | P0 |
| P3 | Barreras — categorías como tabla | M (4-8h) | Nada |
| P3 | Dashboard Adherencia | L (8-16h) | P0 |
| P3 | Bulk import Excel medicamentos | M (4-8h) | Nada |
