# Existing Architecture — PSP Sistema de Seguimiento a Pacientes
**Modo**: Codebase-Aware Master Agent — PHASE 00  
**Fecha**: 2026-04-08  
**Basado en**: lectura directa del código real del workspace  

---

## ARQUITECTURA REAL (como funciona HOY)

```
┌──────────────────────────────────────────────────────────────┐
│                    USUARIO (Browser)                          │
│                                                              │
│  React 18 SPA — Vite 5 — TypeScript 5.3                     │
│  Material-UI 5 — React Query — Zustand — Recharts            │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS (sdk directo, sin servidor)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    SUPABASE                                   │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Supabase   │  │ PostgreSQL  │  │  Supabase Storage   │  │
│  │    Auth     │  │  (RLS)      │  │  (consentimientos)  │  │
│  │  (JWT)      │  │  22+ tablas │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                    ┌─────────────┐                           │
│                    │ RPC / Edge  │                           │
│                    │ Functions   │                           │
│                    │(get_dashboard│                          │
│                    │ _stats, etc) │                          │
│                    └─────────────┘                           │
└──────────────────────────────────────────────────────────────┘

NOTA: NO EXISTE backend separado. config.ts tiene baseUrl='' vacío.
```

---

## FLUJO REAL DE AUTENTICACIÓN

```
1. Usuario entra a cualquier ruta
   └─► ProtectedRoute verifica: supabase.auth.getSession()
       ├─ Sin sesión → redirect /login
       └─ Con sesión → continúa

2. Login (/login)
   └─► authService.login(email, password)
       └─► supabase.auth.signInWithPassword()
           ├─ Error → mensaje al usuario
           └─ OK → supabase.from('user_profiles').select().eq('id', user.id)
                   └─► Construye User { id, email, nombre, role, tenant_id, ... }
                       └─► Guarda en Zustand store

3. Roles y Tenants
   └─► user_profiles.role: 'SUPER_ADMIN' | 'ADMIN_INSTITUCION' | 'MEDICO' |
                            'ENFERMERIA' | 'COORDINADOR' | 'PACIENTE' | 'CUIDADOR'
   └─► user_profiles.tenant_id: UUID (actualmente ignorado en servicios)

4. AdminRoute: verifica role IN ['SUPER_ADMIN', 'ADMIN_INSTITUCION']
```

---

## FLUJO REAL DE DATOS — MÓDULO PACIENTES

```
PacientesPage.tsx
└─► usePatients hook (hooks/usePatients.ts)
    └─► patientService.getPatients(filters)
        └─► supabase.from('patients')
            .select('*, document_types(code,name), genres(code,name),
                     cities(name), departments(name), eps(name), ips(name)')
            .eq('tenant_id', DEFAULT_TENANT)  ◄─── HARDCODEADO ⚠️
            .eq('deleted', false)
            .range(from, to)
            └─► Retorna PaginatedResponse<Patient>
                └─► Mapeo con mapRow() (campo por campo, ~80 propiedades)
```

```
PatientDetailPage.tsx (/patients/:id)
└─► patientService.getPatient(id)
    └─► supabase.from('patients').select(...joins...).eq('id', id).single()
        └─► Renderiza tabs: Info General | Prescripciones | Aplicaciones |
            Entregas | Seguimientos | Barreras | Paraclínicos | Adherencia
            (cada tab carga datos del service correspondiente al hacer clic)
```

```
PacienteFormPage.tsx — Wizard 4 pasos
Paso 1: Datos básicos → state local del formulario
Paso 2: Sociodemográfico → state local
Paso 3: Clínicos → state local  
Paso 4: Consentimiento/Acudiente → state local
[Guardar] → patientService.createPatient(data) o updatePatient(id, data)
         → supabase.from('patients').insert/update
         → tenant_id: DEFAULT_TENANT  ◄─── HARDCODEADO ⚠️
```

---

## FLUJO REAL DE DATOS — MÓDULOS CLÍNICOS

### Seguimientos
```
FollowupsPage.tsx
└─► seguimientoService.listar(filters)
    └─► supabase.from('seguimientos').select('*, patients(...)').eq('tenant_id', DEFAULT_TENANT)
Crear seguimiento → seguimientoService.crear(patientId, data)
    └─► supabase.from('seguimientos').insert({..., tenant_id: DEFAULT_TENANT})
```

### Barreras
```
BarriersPage.tsx
└─► barrierService.getBarriers(filters)
    └─► supabase.from('barriers').select().eq('tenant_id', DEFAULT_TENANT)
⚠️ PROBLEMA: frontend NO valida RN1 (1 barrera activa por paciente antes de crear)
```

### Tareas
```
TasksPage.tsx
└─► tareaService.listar(filters)
    └─► supabase.from('tareas').select('*, patients(...)').eq('tenant_id', DEFAULT_TENANT)
```

### Prescripciones
```
PrescripcionesPage.tsx
└─► prescripcionService.getAll(filters)
    └─► supabase.from('prescripciones').select('*, medications, doctors, patients')
        .eq('tenant_id', DEFAULT_TENANT)
```

---

## FLUJO REAL — DASHBOARD

```
DashboardPageEnriched.tsx
└─► dashboardService.getStats()
    └─► supabase.rpc('get_dashboard_stats')
        ├─ ERROR (RPC no existe en Cloud) → UI muestra error o vacío
        └─ OK → Retorna DashboardStats {
              totalPacientes, pacientesActivos, pacientesEnProceso,
              seguimientos, tareas, barreras, transportes,
              inventario, paraclinicos, servicios,
              adherenciaTratamiento, adherenciaEntrega, ...
           }
```

> ⚠️ Si la función `get_dashboard_stats` no está desplegada en Supabase Cloud, el Dashboard falla silenciosamente.

---

## FLUJO REAL — AUTENTICACIÓN MULTI-TENANT (PROBLEMA CRÍTICO)

```
HOY así funciona (ROTO para multi-org):

Tenant A usuario logueado
└─► patientService.getPatients()
    └─► WHERE tenant_id = '00000000-0000-0000-0000-000000000001'  ← SIEMPRE el mismo
        └─► Ve TODOS los datos del tenant hardcodeado,
            NO los de su organización real
            
El tenant_id del usuario autenticado en user_profiles.tenant_id
NUNCA SE USA en ningún service (exceptuando auth.service.ts)
```

---

## FLUJO REAL — STORAGE (Consentimientos)

```
ConsentimientosPage.tsx
└─► consentimientoService.subirDocumento(file, patientId)
    └─► supabase.storage.from('consentimientos').upload(
          `${DEFAULT_TENANT}/${patientId}/${Date.now()}.pdf`
        )
    ⚠️ El path usa DEFAULT_TENANT hardcodeado
```

---

## FLUJO REAL — LAYOUT

```
MainLayout.tsx
├─ TopNavbar (horizontal, fondo blanco)
│   ├─ Logo PSP con gradiente Indigo/Cyan
│   ├─ Navegación horizontal con tabs (rutas)
│   ├─ Avatar de usuario
│   └─ Bell de notificaciones (SIN FUNCIONALIDAD — solo UI)
└─ Outlet de React Router (contenido de cada módulo)

Antes: sidebar izquierdo
Ahora: top navbar (cambiado en Resumen Cambios Mar 2026)
```

---

## MODELO DE ROLES REAL (vs PRD)

### En la base de datos (`user_profiles.role` CHECK constraint):
```sql
CHECK (role IN (
  'SUPER_ADMIN',
  'ADMIN_INSTITUCION',
  'MEDICO',
  'ENFERMERIA',
  'COORDINADOR',
  'PACIENTE',
  'CUIDADOR'
))
```

### Lo que necesita el PRD:
```
SUPER_ADMIN    ← ✅ Existe
ADMIN          ← ✅ Existe como ADMIN_INSTITUCION
MEDICO         ← ✅ Existe
ENFERMERA      ← ✅ Existe como ENFERMERIA
EDUCADORA      ← ❌ NO EXISTE (mapeado incorrectamente como COORDINADOR?)
FARMACEUTICA   ← ❌ NO EXISTE  
AUDITOR        ← ❌ NO EXISTE
MSL            ← ❌ NO EXISTE
```

---

## ESTADO REAL DEL CÓDIGO — SEMÁFORO

| Módulo/componente | Estado real | Conectado | Producción |
|---|---|---|---|
| Supabase Auth | ✅ Funciona | ✅ | ✅ |
| user_profiles + roles | ⚠️ Roles incompletos | ✅ | ⚠️ |
| RLS en tablas | ✅ Definido | ✅ | ✅ |
| CRUD Pacientes | ✅ Funciona | ✅ | ⚠️ (tenant) |
| Wizard 4 pasos | ✅ Funciona | ✅ | ⚠️ (tenant) |
| CRUD Prescripciones | ✅ Funciona | ✅ | ⚠️ (tenant) |
| CRUD Aplicaciones | ✅ Funciona | ✅ | ⚠️ (tenant) |
| CRUD Entregas | ✅ Funciona | ✅ | ⚠️ (tenant) |
| CRUD Seguimientos | ✅ Funciona | ✅ | ⚠️ (tenant) |
| CRUD Barreras | ✅ Funciona | ✅ | ⚠️ (tenant + RN1) |
| CRUD Tareas | ✅ Funciona | ✅ | ⚠️ (tenant) |
| CRUD Transportes | ✅ Funciona | ✅ | ⚠️ (tenant) |
| CRUD Consentimientos | ✅ Funciona | ✅ | ⚠️ (tenant) |
| CRUD Paraclínicos | ⚠️ Parcial | ⚠️ | ❌ |
| Inventario | ⚠️ Parcial | ⚠️ | ❌ |
| Servicios Complementarios | ⚠️ Parcial | ⚠️ | ❌ |
| Dashboard | ⚠️ Parcial | ⚠️ (depende RPC) | ❌ |
| Reportes | ❌ Mock | ❌ | ❌ |
| Notificaciones | ❌ Solo bell icon | ❌ | ❌ |
| Vista 360° | ❌ Service sí, UI no | ⚠️ | ❌ |
| Anonimización DROP_OUT | ❌ No implementada | ❌ | ❌ LEGAL |
| Multi-tenant real | ❌ Hardcodeado | ❌ | ❌ CRÍTICO |
| Panel Admin | ✅ 12 páginas | ✅ | ⚠️ (tenant) |
