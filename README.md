# PSP Web - Frontend Application

Aplicación web frontend para el Sistema de Seguimiento a Pacientes (PSP) - Sistema de salud para seguimiento de pacientes crónicos.

## 🚀 Stack Tecnológico

- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server ultrarrápido
- **Material-UI (MUI)** - Componentes de UI
- **React Router DOM** - Enrutamiento
- **TanStack Query (React Query)** - Server state management
- **Zustand** - Client state management
- **Axios** - Cliente HTTP
- **React Hook Form + Zod** - Validación de formularios
- **date-fns** - Manejo de fechas
- **React Hot Toast** - Notificaciones

## 📁 Estructura del Proyecto

```
src/
├── modules/             # Módulos de la aplicación
│   ├── auth/           # Autenticación y login
│   ├── dashboard/      # Dashboard principal
│   ├── patients/       # Gestión de pacientes
│   │   ├── pages/      # Páginas del módulo
│   │   └── components/ # Componentes específicos
│   └── shared/         # Componentes compartidos
│       ├── layout/     # Layouts (MainLayout)
│       └── components/ # Componentes reutilizables
├── services/           # API clients y servicios
│   ├── api.client.ts   # Cliente Axios configurado
│   ├── auth.service.ts # Servicio de autenticación
│   └── patient.service.ts
├── stores/             # Zustand stores
│   └── auth.store.ts   # Estado de autenticación
├── hooks/              # Custom React hooks
│   └── usePatients.ts  # Hooks de React Query
├── types/              # TypeScript types/interfaces
│   └── index.ts        # Tipos compartidos
├── config/             # Configuraciones
│   └── app.config.ts   # Config de la app
├── routes/             # Configuración de rutas
│   └── AppRoutes.tsx   # Routes con lazy loading
├── utils/              # Funciones utilitarias
├── theme.ts            # Tema de Material-UI
├── App.tsx             # Componente raíz
└── main.tsx            # Entry point
```

## 🛠️ Instalación y Configuración

### Prerrequisitos

- Node.js 18+ y npm/yarn/pnpm
- Backend API Gateway corriendo en `http://localhost:8080`

### Instalación

```bash
# Instalar dependencias
npm install

# Copiar archivo de variables de entorno
cp .env.example .env

# Editar .env con la URL del API Gateway
# VITE_API_BASE_URL=http://localhost:8080
```

### Desarrollo

```bash
# Iniciar servidor de desarrollo (puerto 3000)
npm run dev

# Build para producción
npm run build

# Preview del build de producción
npm run preview

# Linting
npm run lint

# Formatear código
npm run format

# Type checking
npm run type-check
```

La aplicación estará disponible en: `http://localhost:3000`

## 🔐 Autenticación

El sistema utiliza JWT tokens para autenticación:

1. **Login**: El usuario ingresa credenciales en `/login`
2. **Token Storage**: JWT se almacena en Zustand persist storage
3. **Axios Interceptor**: Añade automáticamente `Authorization: Bearer <token>` a cada request
4. **Token Refresh**: Interceptor detecta 401 y refresca el token automáticamente
5. **Protected Routes**: `ProtectedRoute` component valida autenticación antes de renderizar

### Mock de Login (Desarrollo)

Actualmente el login usa datos simulados mientras el Auth Service está en desarrollo:

```typescript
// Cualquier email/password funcionará
Email: admin@psp.com
Password: cualquier_cosa
```

## 🔌 Consumo de APIs

### React Query

Usamos TanStack Query para manejo eficiente de server state:

```typescript
// Hook de ejemplo
const { data, isLoading, error } = usePatients({
  institucionId: 'INST-001',
  nombre: 'Juan',
  page: 0,
  size: 20,
});

// Mutations
const createPatient = useCreatePatient();
createPatient.mutate(patientData);
```

**Beneficios:**
- Cache automático (5 minutos por defecto)
- Re-fetch en background
- Optimistic updates
- Loading y error states
- Invalidación automática de cache

### Servicios

```typescript
// services/patient.service.ts
export const patientService = {
  getPatients: (filters) => apiClient.get('/api/v1/patients', { params: filters }),
  getPatientById: (id) => apiClient.get(`/api/v1/patients/${id}`),
  createPatient: (data) => apiClient.post('/api/v1/patients', data),
  // ...
};
```

## 🎨 UI Components (Material-UI)

### Temas

Tema personalizado definido en `src/theme.ts`:

```typescript
- Primary: #1976d2 (Azul)
- Secondary: #9c27b0 (Púrpura)
- Success: #2e7d32 (Verde)
- Error: #d32f2f (Rojo)
```

### Componentes Principales

- **DataGrid** (MUI X): Tablas con paginación server-side
- **Cards**: Contenedores de información
- **Tabs**: Navegación por pestañas (ej: PatientDetail)
- **Drawer + AppBar**: Layout principal con sidebar responsive

## 📱 Responsive Design

Mobile-first approach con breakpoints:

- **xs**: < 600px (móviles)
- **sm**: 600px+ (tablets pequeñas)
- **md**: 900px+ (tablets)
- **lg**: 1200px+ (desktop)
- **xl**: 1536px+ (pantallas grandes)

### Ejemplos:

```typescript
// Sidebar colapsable en móviles
<Drawer variant="temporary" sx={{ display: { xs: 'block', md: 'none' } }} />
<Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' } }} />

// Grid responsive
<Grid item xs={12} sm={6} md={4} lg={3}>
```

## 🔄 Estado Global (Zustand)

### Auth Store

```typescript
import { authStore } from '@stores/auth.store';

// Obtener estado
const { user, isAuthenticated, token } = authStore();

// Actions
const { setUser, setTokens, logout, isTokenExpired } = authStore();

// Uso
logout(); // Limpia el estado y localStorage
```

**Persist**: Se guarda automáticamente en `localStorage` como `psp-auth-storage`.

## 🧪 Testing

```bash
# Ejecutar tests unitarios
npm run test

# Tests con coverage
npm run test:coverage

# Tests E2E (cuando estén configurados)
npm run test:e2e
```

### Estrategia de Testing:

- **Unit Tests**: Hooks, utils, services (Jest/Vitest)
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright/Cypress (próximamente)

## 📦 Build y Deploy

### Build de Producción

```bash
npm run build
# Genera carpeta /dist optimizada
```

**Optimizaciones automáticas:**
- Code splitting (chunks por vendor)
- Tree shaking
- Minificación
- Source maps deshabilitados

### Chunks Generados:

- `react-vendor.js`: React, React DOM, React Router
- `mui-vendor.js`: Material-UI
- `query-vendor.js`: TanStack Query

### Deploy

```bash
# Server estático simple
npm run preview

# O usar servicios como:
# - Vercel
# - Netlify
# - Azure Static Web Apps
# - AWS S3 + CloudFront
```

## 🚦 Rutas de la Aplicación

| Ruta | Componente | Descripción | Protegida |
|------|-----------|-------------|-----------|
| `/login` | LoginPage | Inicio de sesión | No |
| `/dashboard` | DashboardPage | Dashboard principal | Sí |
| `/patients` | PatientListPage | Lista de pacientes | Sí |
| `/patients/:id` | PatientDetailPage | Detalle del paciente | Sí |
| `/prescriptions` | - | Prescripciones (TBD) | Sí |
| `/deliveries` | - | Entregas (TBD) | Sí |

## 🔧 Configuración Avanzada

### Path Aliases

Configurados en `vite.config.ts` y `tsconfig.json`:

```typescript
import { Component } from '@modules/patients/Component';
import { apiClient } from '@services/api.client';
import { usePatients } from '@hooks/usePatients';
import { Patient } from '@types/index';
```

### Proxy de Desarrollo

`vite.config.ts` incluye proxy para evitar CORS:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
}
```

## 📊 Arquitectura de Datos

### Flow de Datos:

```
Usuario → Componente → Custom Hook (React Query)
                           ↓
                    Service Layer
                           ↓
                    API Client (Axios)
                           ↓
                    API Gateway → Microservicio
```

### Separación de Responsabilidades:

1. **Components**: UI y UX
2. **Hooks**: Lógica de negocio y server state
3. **Services**: Llamadas HTTP
4. **Stores**: Client state (auth, preferencias)
5. **Types**: Contratos de datos

## 🎯 Próximos Pasos

### Módulos Pendientes:

- [ ] **Prescripciones**: CRUD de prescripciones médicas
- [ ] **Entregas**: Gestión de logística y tracking
- [ ] **Seguimientos**: Notas de evolución y encuestas
- [ ] **Reportes**: Dashboard avanzado con gráficos
- [ ] **Notificaciones**: Centro de notificaciones en tiempo real

### Mejoras Técnicas:

- [ ] Implementar Auth Service real (JWT refresh)
- [ ] Formularios con React Hook Form + Zod
- [ ] Tests unitarios y E2E
- [ ] PWA (Service Workers, offline mode)
- [ ] Dark mode
- [ ] Internacionalización (i18n)
- [ ] Analytics y monitoreo (Sentry, GA4)

## 📚 Documentación Adicional

- [React Query Docs](https://tanstack.com/query/latest)
- [Material-UI Docs](https://mui.com/material-ui/)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)
- [Vite Docs](https://vitejs.dev/)
- [React Router Docs](https://reactrouter.com/)

## 👥 Equipo

- **Frontend Developer**: Implementación de UI/UX
- **Backend Developer**: Microservicios y APIs
- **Architect**: Diseño del sistema

---

**PSP v1.0.0** | Built with ❤️ using React & TypeScript
