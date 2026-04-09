# PSP — Programa de Seguimiento a Pacientes

Plataforma web para la gestión integral de pacientes en programas de soporte farmacoterapéutico en Colombia. Permite a laboratorios, coordinadores y educadoras registrar y dar seguimiento a pacientes crónicos: prescripciones, aplicaciones, entregas, paraclínicos, barreras y más.

**Estado**: En desarrollo activo  
**Versión**: 1.0.0  
**Stack**: React 18 + TypeScript 5 + Vite + MUI v5 + Supabase  
**Despliegue**: Vercel (frontend) + Supabase Cloud (base de datos y autenticación)

---

## Navegación del Proyecto

| Directorio | Descripción |
|------------|-------------|
| [`frontend/web/`](frontend/web/README.md) | Aplicación React — componentes, rutas, servicios |
| [`supabase/`](supabase/) | Migraciones SQL, schema, seeds, scripts RLS |
| [`docs/`](docs/README.md) | Documentación técnica del proyecto |
| [`docs/prd/psp-prd.md`](docs/prd/psp-prd.md) | Product Requirements Document completo |
| [`docs/prd/psp-mvp.md`](docs/prd/psp-mvp.md) | Definición de fases MVP |

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 · TypeScript 5 · Vite 5 |
| UI | Material-UI v5 · Recharts |
| Estado cliente | Zustand |
| Estado servidor | TanStack Query (React Query) |
| Autenticación | Supabase Auth (JWT) |
| Base de datos | PostgreSQL (Supabase Cloud) |
| Seguridad BD | Row Level Security (RLS) por laboratorio/programa |
| Despliegue frontend | Vercel |
| Node portable | `frontend/web/node-portable/node-v20.11.0-win-x64/` |

---

## Módulos de la Aplicación

| Ruta | Módulo | Descripción |
|------|--------|-------------|
| `/dashboard` | Dashboard | Panel principal con KPIs y alertas |
| `/patients` | Pacientes | CRUD completo, formulario 6 pasos, vista 360° |
| `/prescriptions` | Prescripciones | Órdenes médicas por paciente |
| `/consultas` | Consultas médicas | Registro de visitas médicas |
| `/applications` | Aplicaciones | Registro de infusiones y aplicaciones |
| `/deliveries` | Entregas | Control de entregas de medicamentos |
| `/diagnostics` | Paraclínicos | Laboratorios y resultados |
| `/followups` | Seguimientos | Seguimiento con prioridad automática |
| `/barriers` | Barreras | Gestión de barreras de acceso |
| `/tasks` | Tareas | Tareas para educadoras |
| `/inventory` | Inventario | Stock por paciente |
| `/consents` | Consentimientos | Consentimientos informados |
| `/transport` | Transportes | Logística de transporte |
| `/admin` | Administración | Catálogos, usuarios, auditoría |

---

## Instalación y Desarrollo Local

### Prerrequisitos

- Node.js 20+ (o usar el Node portable incluido en `frontend/web/node-portable/`)
- Cuenta en [Supabase](https://supabase.com) con proyecto configurado

### Variables de entorno

```bash
# En frontend/web/
cp .env.example .env
# Editar .env con los valores reales de tu proyecto Supabase
```

Las únicas variables requeridas son:

```
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

### Ejecutar en desarrollo

```bash
cd frontend/web
npm install
npm run dev
# App disponible en http://localhost:3000
```

### Build de producción

```bash
cd frontend/web
npm run build
npm run preview
```

### Verificación de tipos TypeScript

```bash
cd frontend/web
npx tsc --noEmit
# (o usando Node portable: .\node-portable\node-v20.11.0-win-x64\npx.cmd tsc --noEmit)
```

---

## Base de Datos (Supabase)

Los archivos SQL se encuentran en `supabase/`:

| Archivo | Propósito |
|---------|-----------|
| `schema.sql` | Esquema completo de la base de datos |
| `seed.sql` | Datos de prueba iniciales |
| `fix_rls_policies.pgsql` | Políticas de Row Level Security |
| `migration_v4_campos_nuevos.pgsql` | Última migración aplicada |

Para aplicar el schema en un proyecto Supabase nuevo:

1. Entrar al SQL Editor en `app.supabase.com`
2. Ejecutar `schema.sql`
3. Ejecutar `fix_rls_policies.pgsql`
4. Ejecutar `seed.sql` (opcional, para datos de prueba)

---

## Seguridad

- Autenticación manejada por Supabase Auth (JWT)
- Row Level Security (RLS) activo en todas las tablas sensibles
- Variables de entorno nunca versionadas (`.env` en `.gitignore`)
- Anon key de Supabase solo tiene permisos de lectura/escritura restringidos por RLS
- Drop Out de pacientes activa anonimización automática (cumplimiento Ley Habeas Data — Colombia)

---

## Despliegue en Vercel

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Directorio raíz: `frontend/web`
3. Framework preset: **Vite**
4. Variables de entorno en Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy automático en cada push a `master`

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [docs/prd/psp-prd.md](docs/prd/psp-prd.md) | Requerimientos completos del producto |
| [docs/prd/psp-mvp.md](docs/prd/psp-mvp.md) | Fases del MVP |
| [docs/USER_STORIES_PSP.md](docs/USER_STORIES_PSP.md) | Historias de usuario |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Procedimientos operacionales |
| [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md) | Checklist pre-producción |

---

## Licencia

Propietario — BTS Integral / ValenTech Solutions
