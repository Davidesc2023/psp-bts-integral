# PSP — Arquitectura del Sistema

**Versión:** 2.0 (generada por AI-DLC Master Agent)
**Fecha:** 2026-04-06
**Estado:** Activo — basado en código real del repositorio

---

## 1. Stack Tecnológico Real

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend framework | React | 18 |
| Lenguaje | TypeScript | 5 |
| Build tool | Vite | 5 |
| UI Kit | Material-UI (MUI) | v5 |
| Enrutamiento | React Router | v6 |
| Server state | TanStack Query | v5 |
| Client state | Zustand | v4 |
| Animaciones | Framer Motion | — |
| Gráficos | Recharts | — |
| BaaS | Supabase | JS v2 |
| Base de datos | PostgreSQL | via Supabase |
| Auth | Supabase Auth | JWT |
| Storage | Supabase Storage | S3-compatible |
| Deploy frontend | Vercel | — |
| Deploy base datos | Supabase Cloud | — |

**Color primario:** `#0e7490`

---

## 2. Estructura de Repositorio

```
SOPORTE PACIENTES/          ← raíz del workspace (sin .git)
├── frontend/web/           ← RAÍZ GIT (github: Davidesc2023/psp-bts-integral)
│   ├── src/
│   │   ├── modules/        ← 19 módulos funcionales
│   │   ├── services/       ← 17 servicios Supabase
│   │   ├── types/          ← tipos TypeScript globales
│   │   ├── stores/         ← Zustand stores
│   │   ├── routes/         ← AppRoutes.tsx (lazy loading)
│   │   ├── config/         ← app.config.ts
│   │   └── hooks/          ← hooks reutilizables
│   ├── tsconfig.json       ← paths con ./src/... (sin baseUrl)
│   ├── vite.config.ts
│   └── vercel.json
├── supabase/               ← migraciones SQL
│   ├── schema.sql          ← schema base
│   ├── migration_v4_campos_nuevos.pgsql  ← campos nuevos + funciones
│   ├── fix_rls_policies.pgsql
│   └── seed.sql
└── docs/                   ← documentación (no versionado en git)
```

---

## 3. Módulos del Frontend

| Módulo | Carpeta | Página principal | Servicio |
|--------|---------|-----------------|---------|
| Auth | `modules/auth/` | `LoginPage.tsx` | `auth.service.ts` |
| Dashboard | `modules/dashboard/` | `DashboardPageEnriched.tsx` | `dashboardService.ts` |
| Pacientes | `modules/patients/` | `PacientesPage`, `PatientDetailPage`, `PacienteFormPage` | `patient.service.ts` |
| Prescripciones | `modules/prescripciones/` | `PrescripcionesPage.tsx` | `prescripcionService.ts` |
| Consultas Médicas | `modules/consultas/` | `ConsultasPage.tsx` | `consultaService.ts` |
| Aplicaciones | `modules/aplicaciones/` | `AplicacionesPage.tsx` | `aplicacionService.ts` |
| Entregas | `modules/entregas/` | `EntregasPage.tsx` | `entregaService.ts` |
| Inventario | `modules/inventario/` | `InventarioPage.tsx` | `inventario.service.ts` |
| Seguimientos | `modules/followups/` | `FollowupsPage.tsx` | `seguimientoService.ts` |
| Tareas | `modules/tasks/` | `TasksPage.tsx` | `tareaService.ts` |
| Barreras | `modules/barriers/` | `BarriersPage.tsx` | `barrierService.ts` |
| Paraclínicos | `modules/diagnostics/` | `ParaclinicosPage.tsx` | `paraclinicoService.ts` |
| Consentimientos | `modules/consentimientos/` | `ConsentimientosPage.tsx` | `consentimientoService.ts` |
| Transportes | `modules/transportes/` | `TransportesPage.tsx` | `transporteService.ts` |
| Servicios Especiales | `modules/servicios-especiales/` | `ServiciosEspecialesPage.tsx` | `servicioComplementarioService.ts` |
| Reportes | `modules/reportes/` | `ReportesPage.tsx` | múltiples services |
| Configuración | `modules/configuracion/` | `ConfiguracionPage.tsx` | supabase direct |
| Admin | `modules/admin/` | `AdminDashboardPage.tsx` + 10 páginas catálogo | varios |
| Shared | `modules/shared/` | `MainLayout`, `PatientSelector`, `LoadingFallback` | — |

---

## 4. Esquema de Base de Datos

### Tablas catálogo (sin FK externas)

```
tenants, countries, departments, cities, document_types, genres,
estados_civiles, niveles_educativos, tipos_poblacion,
eps, ips, logistics_operators, programas_psp,
diagnosticos_cie10, doctors, laboratories, medications, tipos_paraclinicos
```

### Tabla de usuarios

```
user_profiles → extiende auth.users de Supabase
  roles: SUPER_ADMIN | ADMIN_INSTITUCION | MEDICO | ENFERMERIA | COORDINADOR | PACIENTE | CUIDADOR
```

### Tablas principales (con tenant_id + RLS)

```
patients              ← tabla core; tiene anonymized, soft delete, status history
patient_status_history
barriers
seguimientos
tareas
prescripciones
aplicaciones
entregas
inventario_paciente   ← por paciente
movimientos_inventario
paraclinicos
transportes
consentimientos
consultas_medicas     ← en migration_v4
notifications         ← en migration_v4 (tabla creada, sin UI)
patient_status_config ← en migration_v4 (sin UI)
user_program_assignments ← en migration_v4 (sin UI)
import_jobs           ← en migration_v4 (sin UI)
```

### Funciones SQL relevantes

```sql
generate_patient_code(p_treatment_id, p_tenant_id)
  → retorna código tipo "AD001" basado en iniciales del medicamento + secuencial
  → ubicada en migration_v4_campos_nuevos.pgsql

get_patient_360(patient_id)
  → RPC llamada desde patient.service.ts get360()
  → PENDIENTE de verificar si existe en Supabase Cloud
```

---

## 5. Seguridad

### Row Level Security (RLS)

- Habilitado en todas las tablas principales
- Definido en `supabase/fix_rls_policies.pgsql`
- Aplica filtro por `tenant_id`

### Autenticación

- Supabase Auth — JWT
- Guards: `ProtectedRoute` (auth) + `AdminRoute` (rol SUPER_ADMIN/ADMIN)
- Roles codificados en `user_profiles.role`

### Vulnerabilidad activa detectada

> **CRÍTICO:** Todos los servicios del frontend usan `DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001'` hardcodeado.
> El `tenant_id` del usuario autenticado (disponible en `user_profiles`) **no se inyecta** en las queries.
> Esto hace que RLS sea inoperante por programas/laboratorios → todos los usuarios de todos los tenants ven todos los datos.
> **Debe corregirse antes de producción multi-tenant real.**

---

## 6. Flujo de Datos — Creación de Paciente

```
PacienteFormPage (wizard 6 pasos)
  └── Step1BasicData      → documentType, documentNumber, nombres, birthDate (con validación tipo-doc/edad)
  └── Step2Sociodemographic → género, estado civil, nivel educativo, teléfonos, email
  └── Step3Clinical       → departamento, ciudad, dirección, zona, estrato
  └── Step4GuardianConsent → estado paciente, tratamiento, programa, médico, fechas, DROP_OUT (warning + fechaRetiro)
  └── Step5Guardian       → acudiente
  └── Step6Documents      → documentos, consentimientos
       ↓
  patientService.createPatient()
       ↓
  Supabase INSERT INTO patients (tenant_id = DEFAULT_TENANT)
       ↓
  generate_patient_code() → asigna codigo_paciente
```

---

## 7. Flujo Drop Out + Anonimización

```
Usuario selecciona status = 'DROP_OUT' en Step4
   → Alert warning mostrado en UI (Ley 1581/2012 Colombia)
   → fechaRetiro + motivoRetiro se vuelven campos obligatorios
   → Al guardar: patient.service.ts envía status + fechas a Supabase UPDATE
   → PENDIENTE: lógica de anonimización automática de campos sensibles
     (nombres, número ID, teléfonos, email, dirección)
     debe ejecutarse en el servicio o via trigger en Supabase
```

---

## 8. Multi-Tenancy — Estado Actual vs Objetivo

| Aspecto | Estado Actual | Objetivo |
|---------|--------------|---------|
| `tenant_id` en DB | Presente en todas las tablas | ✅ Correcto |
| RLS por tenant | Habilitado en todas las tablas | ✅ Correcto |
| Obtención del tenant desde Auth | `DEFAULT_TENANT` hardcodeado | ❌ Debe leer `user_profiles.tenant_id` |
| Asignación usuario-programa | Tabla `user_program_assignments` creada | UI faltante |
| Filtrado educador por laboratorio/tratamiento | No implementado | Requiere `user_program_assignments` |

---

## 9. Rutas Registradas

| Ruta | Componente | Guard |
|------|-----------|-------|
| `/login` | `LoginPage` | Público |
| `/dashboard` | `DashboardPageEnriched` | Auth |
| `/patients` | `PacientesPage` | Auth |
| `/patients/new` | `PacienteFormPage` | Auth |
| `/patients/:id` | `PatientDetailPage` | Auth |
| `/patients/:id/editar` | `PacienteFormPage` | Auth |
| `/prescriptions` | `PrescripcionesPage` | Auth |
| `/applications` | `AplicacionesPage` | Auth |
| `/deliveries` | `EntregasPage` | Auth |
| `/followups` | `FollowupsPage` | Auth |
| `/barriers` | `BarriersPage` | Auth |
| `/tasks` | `TasksPage` | Auth |
| `/paraclinicos` | `ParaclinicosPage` | Auth |
| `/inventory` | `InventarioPage` | Auth |
| `/transportes` | `TransportesPage` | Auth |
| `/servicios-especiales` | `ServiciosEspecialesPage` | Auth |
| `/reportes` | `ReportesPage` | Auth |
| `/configuracion` | `ConfiguracionPage` | Auth |
| `/consultas` | `ConsultasPage` | Auth |
| `/consentimientos` | `ConsentimientosPage` | Auth |
| `/admin` | `AdminDashboardPage` | Admin |
| `/admin/eps` | `EpsAdminPage` | Admin |
| `/admin/diagnosticos` | `DiagnosticosAdminPage` | Admin |
| `/admin/users` | `UsersAdminPage` | Admin |
| `/admin/programas` | `ProgramasPspAdminPage` | Admin |
| `/admin/ips` | `IpsAdminPage` | Admin |
| `/admin/logistics-operators` | `LogisticsOperatorsAdminPage` | Admin |
| `/admin/cities` | `CitiesAdminPage` | Admin |
| `/admin/tipos-paraclinico` | `TiposParaclinicoAdminPage` | Admin |
| `/admin/medicamentos` | `MedicamentosAdminPage` | Admin |
| `/admin/medicos` | `MedicosAdminPage` | Admin |
| `/admin/auditoria` | `AuditoriaPage` | Admin |

---

## 10. Variables de Entorno Requeridas

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

---

## 11. Orden de Aplicación de Migraciones SQL en Supabase

```
1. schema.sql                              ← tablas base
2. migration_pacientes_v2.sql             ← campos adicionales pacientes
3. migration_patients_sociodemographic_columns.pgsql
4. migration_v4_campos_nuevos.pgsql       ← codigo_paciente, consultas_medicas, generate_patient_code, RLS
5. migration_transportes_servicios_v2.pgsql
6. fix_rls_policies.pgsql                 ← políticas RLS definitivas
7. seed.sql                               ← datos base (document_types, countries, etc.)
```

---

*Generado por AI-DLC Master Agent — basado en análisis real del repositorio*
