# Workspace Inventory — PSP Sistema de Seguimiento a Pacientes
**Modo**: Codebase-Aware Master Agent — PHASE 00  
**Fecha**: 2026-04-08  
**Análisis basado en**: lectura directa de archivos reales del workspace  

---

## ESTRUCTURA RAÍZ

```
SOPORTE PACIENTES/
├── .env.example              # Solo 2 vars: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
├── README.md
├── ai-dlc/                   # Proyecto separado EntreVista AI (NO es PSP)
├── docs/                     # Documentación del proyecto PSP
├── frontend/web/             # Aplicación React (ÚNICO código de aplicación)
└── supabase/                 # Esquema y migraciones de base de datos
```

> ⚠️ NO EXISTE carpeta `backend/`. La arquitectura es Frontend + Supabase ÚNICAMENTE.

---

## DOMINIO: INFRAESTRUCTURA

### Stack Tecnológico Real
| Componente | Tecnología | Versión |
|---|---|---|
| Frontend SPA | React + TypeScript | 18.2.0 + 5.3.3 |
| Build tool | Vite | 5.1.3 |
| UI Framework | Material-UI | 5.15.11 |
| State Management | React Query + Zustand | — |
| Gráficos | Recharts | 2.12.0 |
| Animaciones | Framer Motion | — |
| Backend-as-a-Service | Supabase | — |
| Base de datos | PostgreSQL (Supabase) | — |
| Autenticación | Supabase Auth | — |
| Storage | Supabase Storage | — |

### Variables de entorno
```
VITE_SUPABASE_URL     → URL del proyecto Supabase
VITE_SUPABASE_ANON_KEY → Clave pública (restringida por RLS)
VITE_API_BASE_URL     → Vacío en dev (sin backend separado)
```

---

## DOMINIO: BASE DE DATOS (Supabase/PostgreSQL)

### Tablas de Catálogo (sin dependencias externas)
| Tabla | Filas estimadas | Estado |
|---|---|---|
| `tenants` | N (multi-tenant) | ✅ Definida |
| `countries` | ~5 | ✅ Definida |
| `departments` | ~32 (Colombia) | ✅ Definida |
| `cities` | ~100+ | ✅ Definida |
| `document_types` | ~5 | ✅ Definida |
| `genres` | ~3 | ✅ Definida |
| `estados_civiles` | ~5 | ✅ Definida |
| `niveles_educativos` | ~6 | ✅ Definida |
| `tipos_poblacion` | ~4 | ✅ Definida |
| `eps` | ~50+ | ✅ Definida |
| `ips` | ~50+ | ✅ Definida |
| `logistics_operators` | ~10 | ✅ Definida |
| `programas_psp` | ~5 | ✅ Definida |
| `diagnosticos_cie10` | ~10,000 | ✅ Definida |
| `doctors` | N | ✅ Definida |
| `laboratories` | N | ✅ Definida |
| `medications` | N | ✅ Definida |
| `tipos_paraclinicos` | ~50 | ✅ Definida |

### Tablas de Negocio Principal
| Tabla | PK | Índices | RLS | Estado |
|---|---|---|---|---|
| `user_profiles` | UUID (ref auth.users) | — | Exigido | ✅ |
| `patients` | BIGSERIAL | tenant, status, eps, document, name | ✅ | ✅ |
| `patient_status_history` | BIGSERIAL | — | Heredado | ✅ |
| `barriers` | UUID | patient, status, tenant | ✅ | ✅ |
| `seguimientos` | UUID | patient, estado, tenant | ✅ | ✅ |
| `tareas` | UUID | patient, estado, tenant | ✅ | ✅ |
| `prescripciones` | BIGSERIAL | paciente, estado, tenant | ✅ | ✅ |
| `aplicaciones` | BIGSERIAL | paciente, estado, fecha, tenant | ✅ | ✅ |
| `entregas` | BIGSERIAL | paciente, estado, tenant | ✅ | ✅ |
| `inventario_paciente` | UUID | paciente, medicamento, tenant | ✅ | ✅ |
| `movimientos_inventario` | UUID | — | Heredado | ✅ |
| `paraclinicos` | UUID | patient, tenant | ✅ | ✅ |
| `transportes` | BIGSERIAL | paciente, estado, tenant | ✅ | ✅ |
| `consentimientos` | UUID | — | ✅ | ✅ |
| `facturacion` | UUID | patient, estado, tenant | ✅ | ✅ |
| `servicios_complementarios` | UUID | patient, estado, tenant | ✅ | ✅ |
| `auditoria_logs` | UUID | tabla, fecha, tenant | ✅ | ✅ |
| `adherencia_proyecciones` | UUID | patient, tenant | ✅ | ✅ |
| `adherencia_registros` | UUID | — | ✅ | ✅ |

### Tablas de Migraciones (v2–v4)
| Tabla | Origen | Estado |
|---|---|---|
| `crisis_paciente` | migration_v3 | ✅ |
| `heridas_paciente` | migration_v3 | ✅ |
| `patient_status_config` | migration_v4 | ✅ (sin UI) |
| `notifications` | migration_v4 | ✅ (sin UI) |
| `patient_guardian_details` | migration_pacientes_v2 | ✅ |

### Funciones RPC en Supabase
| Función | Llamada desde | Estado |
|---|---|---|
| `get_dashboard_stats()` | `dashboardService.getStats()` | ⚠️ Necesita verificación en Cloud |
| `get_patient_360(patient_id)` | `patientService.get360()` | ⚠️ Necesita verificación en Cloud |

---

## DOMINIO: AUTENTICACIÓN

| Archivo | Ruta | Descripción | Estado |
|---|---|---|---|
| `auth.service.ts` | `services/` | Login/logout/refresh con Supabase Auth | ✅ |
| `supabaseClient.ts` | `services/` | Singleton del cliente Supabase | ✅ |
| `LoginPage.tsx` | `modules/auth/` | Formulario de login | ✅ |
| `ProtectedRoute.tsx` | `modules/auth/` | Guard para rutas autenticadas | ✅ |
| `AdminRoute.tsx` | `modules/auth/` | Guard para rutas ADMIN/SUPER_ADMIN | ✅ |

---

## DOMINIO: RUTAS DE LA APLICACIÓN

### Todas las rutas definidas en `AppRoutes.tsx`
| Ruta | Componente | Módulo | Estado |
|---|---|---|---|
| `/login` | `LoginPage` | auth | ✅ |
| `/dashboard` | `DashboardPageEnriched` | dashboard | ⚠️ Parcial |
| `/patients` | `PacientesPage` | patients | ✅ |
| `/patients/new` | `PacienteFormPage` | patients | ✅ |
| `/patients/:id` | `PatientDetailPage` | patients | ✅ |
| `/patients/:id/editar` | `PacienteFormPage` | patients | ✅ |
| `/prescriptions` | `PrescripcionesPage` | prescripciones | ✅ |
| `/applications` | `AplicacionesPage` | aplicaciones | ✅ |
| `/deliveries` | `EntregasPage` | entregas | ✅ |
| `/followups` | `FollowupsPage` | followups | ⚠️ Parcial |
| `/barriers` | `BarriersPage` | barriers | ⚠️ Parcial |
| `/tasks` | `TasksPage` | tasks | ⚠️ Parcial |
| `/diagnostics` | `ParaclinicosPage` | diagnostics | ⚠️ Parcial |
| `/inventory` | `InventarioPage` | inventario | ⚠️ Parcial |
| `/transports` | `TransportesPage` | transportes | ⚠️ Parcial |
| `/special-services` | `ServiciosEspecialesPage` | servicios-especiales | ⚠️ Parcial |
| `/reports` | `ReportesPage` | reportes | ⚠️ Mock |
| `/configuration` | `ConfiguracionPage` | configuracion | ❌ Sin verificar |
| `/consents` | `ConsentimientosPage` | consentimientos | ⚠️ Parcial |
| `/consultations` | `ConsultasPage` | consultas | ⚠️ Sin verificar |
| `/admin` | `AdminDashboardPage` | admin | ✅ |
| `/admin/eps` | `EpsAdminPage` | admin | ✅ |
| `/admin/diagnosticos` | `DiagnosticosAdminPage` | admin | ✅ |
| `/admin/users` | `UsersAdminPage` | admin | ✅ |
| `/admin/programas-psp` | `ProgramasPspAdminPage` | admin | ✅ |
| `/admin/ips` | `IpsAdminPage` | admin | ✅ |
| `/admin/logistics-operators` | `LogisticsOperatorsAdminPage` | admin | ✅ |
| `/admin/cities` | `CitiesAdminPage` | admin | ✅ |
| `/admin/tipos-paraclinico` | `TiposParaclinicoAdminPage` | admin | ✅ |
| `/admin/medicamentos` | `MedicamentosAdminPage` | admin | ✅ |
| `/admin/medicos` | `MedicosAdminPage` | admin | ✅ |
| `/admin/auditoria` | `AuditoriaPage` | admin | ✅ |

---

## DOMINIO: SERVICIOS (capa de datos)

### Servicios implementados en `frontend/web/src/services/`
| Archivo | Tablas accedidas | DEFAULT_TENANT | Estado |
|---|---|---|---|
| `auth.service.ts` | `auth.users`, `user_profiles` | ❌ No tiene | ✅ |
| `patient.service.ts` | `patients`, joins múltiples | ⚠️ Hardcodeado | ✅ |
| `prescripcionService.ts` | `prescripciones`, `medications`, `doctors` | ⚠️ Hardcodeado | ✅ |
| `aplicacionService.ts` | `aplicaciones` | ⚠️ Hardcodeado | ✅ |
| `entregaService.ts` | `entregas` | ⚠️ Hardcodeado | ✅ |
| `seguimientoService.ts` | `seguimientos`, `patients` | ⚠️ Hardcodeado | ✅ |
| `barrierService.ts` | `barriers` | ⚠️ Hardcodeado | ✅ |
| `tareaService.ts` | `tareas` | ⚠️ Hardcodeado | ✅ |
| `transporteService.ts` | `transportes` | ⚠️ Hardcodeado | ✅ |
| `consentimientoService.ts` | `consentimientos`, storage | ⚠️ Hardcodeado | ✅ |
| `servicioComplementarioService.ts` | `servicios_complementarios` | ⚠️ Hardcodeado | ✅ |
| `paraclinicoService.ts` | `paraclinicos` | ⚠️ Posible | ⚠️ Parcial |
| `dashboardService.ts` | RPC `get_dashboard_stats` | ❌ No tiene | ⚠️ RPC no verificada |
| `catalog.service.ts` | catalogs (eps, ips, cities, etc.) | ⚠️ Hardcodeado | ✅ |
| `auditoriaService.ts` | `auditoria_logs` | — | ✅ |
| `tareaService.ts` | `tareas` | ⚠️ Hardcodeado | ✅ |

**CRÍTICO**: `DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001'` aparece en **11 archivos**.

---

## DOMINIO: MÓDULOS DEL FRONTEND

### Módulos en `frontend/web/src/modules/`
| Módulo | Páginas | Componentes | Conectado a Supabase | Issues |
|---|---|---|---|---|
| `auth/` | LoginPage | ProtectedRoute, AdminRoute | ✅ Supabase Auth | — |
| `patients/` | PacientesPage, PatientDetailPage, PacienteFormPage | PacienteTabs, PacienteFilters, etc. | ✅ patient.service | ❌ Sin Vista 360° tab |
| `dashboard/` | DashboardPageEnriched | KPI cards, charts | ⚠️ RPC puede fallar | ❌ Datos estáticos/mock si RPC falla |
| `prescripciones/` | PrescripcionesPage | — | ✅ prescripcionService | — |
| `aplicaciones/` | AplicacionesPage | — | ✅ aplicacionService | — |
| `entregas/` | EntregasPage | — | ✅ entregaService | — |
| `barriers/` | BarriersPage | — | ✅ barrierService | ⚠️ No valida RN1 (1 barrera activa) en UI |
| `followups/` | FollowupsPage | — | ⚠️ seguimientoService | ⚠️ Parcialmente conectado |
| `tasks/` | TasksPage | — | ⚠️ tareaService | ⚠️ Parcialmente conectado |
| `diagnostics/` | ParaclinicosPage | — | ⚠️ paraclinicoService | ⚠️ Mock en algunas vistas |
| `inventario/` | InventarioPage | — | ⚠️ | ⚠️ Parcialmente conectado |
| `transportes/` | TransportesPage | — | ✅ transporteService | — |
| `consentimientos/` | ConsentimientosPage | — | ✅ consentimientoService | — |
| `servicios-especiales/` | ServiciosEspecialesPage | — | ⚠️ servicioComplementarioService | ⚠️ Parcial |
| `reportes/` | ReportesPage | — | ❌ | ❌ Datos mock, sin exports reales |
| `admin/` | 12 páginas admin | — | ✅ catalog.service | — |
| `configuracion/` | ConfiguracionPage | — | ❓ Sin verificar | — |
| `consultas/` | ConsultasPage | — | ❓ Sin verificar | — |
| `shared/` | MainLayout, TopNavbar | Componentes reutilizables | — | TopNavbar nuevo (Horizontal) |

---

## DOMINIO: DOCUMENTACIÓN EXISTENTE

| Archivo | Utilidad | Completitud |
|---|---|---|
| `docs/USER_STORIES_PSP.md` | 44+ historias con AC y estado | ✅ Completo |
| `docs/DIAGNOSTICO_CTO_PSP.md` | Diagnóstico de estado (Mar 2026) | ✅ Relevante |
| `docs/ROADMAP.md` | Fases de desarrollo priorizadas | ✅ Actualizado |
| `docs/TASKS.md` | Tareas ejecutables para agentes | ✅ F1 definida |
| `docs/RESUMEN_CAMBIOS_COMPLETADOS.md` | Cambios recientes implementados | ✅ |
| `docs/prd/psp-prd.md` | PRD completo del sistema | ✅ Fuente de verdad |
| `docs/PLAN_MAESTRO_IMPLEMENTACION.md` | Plan de implementación | ✅ |
| `docs/RUNBOOK.md` | Operaciones | ✅ |
| `docs/GO_LIVE_CHECKLIST.md` | Checklist deployment | ✅ |

---

## DOMINIO: SEGURIDAD

| Issue | Severidad | Archivos afectados |
|---|---|---|
| DEFAULT_TENANT hardcodeado | 🔴 CRÍTICO | 11 servicios |
| Drop Out sin anonimización real | 🔴 LEGAL (Ley 1581) | patient.service.ts |
| Roles no alineados (EDUCADOR/MSL) | 🟡 MEDIO | user_profiles.role CHECK constraint |
| Guards de rol en frontend incompletos | 🟡 MEDIO | múltiples páginas |
