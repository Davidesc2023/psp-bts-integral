# PSP Web — Frontend

Aplicación React para el Sistema de Seguimiento a Pacientes (PSP).

## Stack

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| React | 18 | Framework de UI |
| TypeScript | 5 | Tipado estático |
| Vite | 5 | Build tool / dev server |
| Material-UI | v5 | Componentes (color primario: `#0e7490`) |
| React Router | v6 | Rutas con lazy loading |
| TanStack Query | v5 | Estado del servidor / cache |
| Zustand | v4 | Estado global cliente |
| Supabase JS | v2 | Autenticación + queries a PostgreSQL |
| Recharts | v2 | Gráficas del dashboard |
| React Hot Toast | v2 | Notificaciones UI |

---

## Instalación

```bash
npm install
```

O usando el Node portable incluido:

```bash
.\node-portable\node-v20.11.0-win-x64\npm.cmd install
```

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Dev server en `http://localhost:3000` |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Preview del build de producción |

### Type checking

```bash
npx tsc --noEmit
# O con Node portable:
.\node-portable\node-v20.11.0-win-x64\npx.cmd tsc --noEmit
```

---

## Variables de Entorno

Crear un archivo `.env` en `frontend/web/` (copiar desde `.env.example`):

```bash
cp .env.example .env
```

Variables necesarias:

```
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

El archivo `.env` está en `.gitignore` — nunca subir credenciales al repositorio.

---

## Estructura del Código

```
src/
├── modules/            # Módulos por dominio (patients, prescripciones, etc.)
│   └── patients/
│       ├── components/
│       │   └── forms/  # Wizard 6 pasos para crear/editar pacientes
│       └── pages/
├── services/           # Clientes Supabase por entidad
├── stores/             # Zustand (auth.store.ts)
├── routes/             # AppRoutes.tsx (lazy loading)
├── types/              # Interfaces TypeScript
├── theme/              # Tema MUI
├── config/             # app.config.ts
└── utils/              # Helpers
```

### Alias de paths (tsconfig + vite.config.ts)

| Alias | Resuelve a |
|-------|-----------|
| `@modules/` | `src/modules/` |
| `@services/` | `src/services/` |
| `@stores/` | `src/stores/` |
| `@config/` | `src/config/` |
| `@/types` | `src/types/` |
| `@/` | `src/` |

---

## Autenticación

Manejada por Supabase Auth. El flujo completo está en `src/services/auth.service.ts`.

- Login: `supabase.auth.signInWithPassword()`
- El JWT se adjunta automáticamente en cada query
- `ProtectedRoute` y `AdminRoute` en `src/modules/auth/` protegen las rutas
- El perfil extendido (rol, laboratorio) se obtiene de la tabla `user_profiles`

---

## Módulos Disponibles

| Ruta | Componente principal | Estado |
|------|---------------------|--------|
| `/dashboard` | `DashboardPageEnriched` | Implementado |
| `/patients` | `PacientesPage` | Implementado |
| `/patients/new` | `PacienteFormPage` | Implementado |
| `/patients/:id` | `PatientDetailPage` | Implementado |
| `/prescriptions` | `PrescripcionesPage` | Implementado |
| `/consultas` | `ConsultasPage` | Implementado |
| `/applications` | `AplicacionesPage` | Implementado |
| `/deliveries` | `EntregasPage` | Implementado |
| `/diagnostics` | `ParaclinicosPage` | Implementado |
| `/followups` | `FollowupsPage` | Implementado |
| `/barriers` | `BarriersPage` | Implementado |
| `/tasks` | `TasksPage` | Implementado |
| `/inventory` | `InventarioPage` | Implementado |
| `/consents` | `ConsentimientosPage` | Implementado |
| `/transport` | `TransportesPage` | Implementado |
| `/reports` | `ReportesPage` | Implementado |
| `/settings` | `ConfiguracionPage` | Implementado |
| `/admin` | `AdminDashboardPage` | Implementado |

---

## Reglas de Calidad

- TypeScript estricto: `tsc --noEmit` debe dar **0 errores**
- Lazy loading en todas las rutas (AppRoutes.tsx con `Suspense`)
- RLS de Supabase como única capa de autorización de datos
- Sin credenciales en el código fuente
