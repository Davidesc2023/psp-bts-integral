# Arquitectura del Sistema PSP

## Stack Tecnológico

### Frontend
| Tecnología | Versión | Uso |
|-----------|---------|-----|
| React | 18 | Framework de UI |
| TypeScript | 5 | Tipado estático |
| Vite | 5 | Build tool y dev server |
| Material-UI | v5 | Componentes de UI |
| React Router | v6 | Enrutamiento con lazy loading |
| TanStack Query | v5 | Cache y estado del servidor |
| Zustand | v4 | Estado global del cliente |
| Recharts | v2 | Gráficas y visualizaciones |
| React Hot Toast | v2 | Notificaciones UI |

### Backend (BaaS)
| Tecnología | Uso |
|-----------|-----|
| Supabase Auth | Autenticación JWT con refresh tokens |
| Supabase PostgreSQL | Base de datos relacional |
| Supabase RLS | Seguridad a nivel de fila por rol/laboratorio |
| Supabase Storage | Archivos adjuntos (resultados, comprobantes) |

---

## Arquitectura General

```
┌────────────────────────────────────┐
│         Usuario (Browser)          │
└──────────────┬─────────────────────┘
               │ HTTPS
               ▼
┌────────────────────────────────────┐
│    Vercel CDN (frontend estático)  │
│    React App — Puerto 443          │
└──────────────┬─────────────────────┘
               │ HTTPS + JWT
               ▼
┌────────────────────────────────────┐
│         Supabase Cloud             │
│  ┌────────────┐  ┌──────────────┐  │
│  │ Auth (JWT) │  │  Storage     │  │
│  └────────────┘  └──────────────┘  │
│  ┌────────────────────────────────┐ │
│  │  PostgreSQL + RLS (por rol)    │ │
│  └────────────────────────────────┘ │
└────────────────────────────────────┘
```

---

## Estructura del Código Frontend

```
src/
├── modules/            # Módulos por dominio de negocio
│   ├── auth/           # Login, guards de rutas
│   ├── admin/          # Catálogos, usuarios, auditoría
│   ├── patients/       # Gestión de pacientes (módulo principal)
│   │   ├── components/forms/  # Wizard 6 pasos
│   │   └── pages/
│   ├── prescripciones/ # Órdenes médicas
│   ├── aplicaciones/   # Aplicaciones e infusiones
│   ├── entregas/       # Entregas de medicamentos
│   ├── diagnostics/    # Paraclínicos
│   ├── followups/      # Seguimientos
│   ├── barriers/       # Barreras de acceso
│   ├── tasks/          # Tareas para educadoras
│   ├── inventario/     # Inventario por paciente
│   ├── consentimientos/# Consentimientos informados
│   ├── consultas/      # Consultas médicas
│   ├── dashboard/      # Panel principal
│   └── shared/         # Layout, componentes reutilizables
├── services/           # Clientes Supabase por módulo
├── stores/             # Zustand stores (auth, etc.)
├── types/              # Interfaces TypeScript
├── routes/             # AppRoutes con lazy loading
├── config/             # Configuración de la app
├── theme/              # Tema MUI (color primario: #0e7490)
└── utils/              # Funciones utilitarias
```

---

## Seguridad

### Row Level Security (RLS)
Cada tabla en Supabase tiene políticas que restringen acceso según el rol del usuario:

- `EDUCADOR`: Solo ve los pacientes de su laboratorio/programa asignado
- `COORDINADOR`: Ve todos los pacientes de sus programas
- `ADMIN`: Acceso global

### Autenticación
- Supabase Auth maneja el ciclo completo: login, refresh token, logout
- El JWT incluye el rol del usuario en los claims
- Las rutas sensibles están protegidas por `ProtectedRoute` y `AdminRoute`

### Validaciones de Negocio
- Tipo de documento vs. edad validado en tiempo real (formulario Step1)
- Drop Out con anonimización automática (cumplimiento Ley Habeas Data — Colombia)
- 1 barrera activa por paciente (regla de negocio)

---

## Multi-Tenancy

El sistema soporta múltiples laboratorios y programas:
- Los registros en BD tienen `laboratorio_id` y `programa_id`
- Las políticas RLS filtran automáticamente por el laboratorio asignado al usuario
- La parametrización (estados, tratamientos, etc.) es por laboratorio/programa
