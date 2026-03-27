# Arquitectura Frontend - PSP Web Application

## 📋 Descripción General

Aplicación web SPA (Single Page Application) construida con React 18, TypeScript y Vite para el Sistema de Seguimiento a Pacientes (PSP). Diseñada con arquitectura modular, escalable y mantenible siguiendo las mejores prácticas de desarrollo frontend.

## 🏗️ Stack Tecnológico

### Core Framework
- **React 18.2** - Biblioteca de UI con hooks y concurrent features
- **TypeScript 5.3** - Tipado estático en modo strict
- **Vite 5.1** - Build tool y dev server (HMR ultra-rápido)

### State Management
- **TanStack Query v5** - Server state management (cache, mutations, refetch)
- **Zustand 4.5** - Client state management (auth, UI state)

### Routing & Navigation
- **React Router DOM v6** - Routing con lazy loading y protected routes

### UI Framework
- **Material-UI v5** - Component library
- **MUI X Data Grid v6** - Tablas avanzadas con paginación server-side
- **Emotion** - CSS-in-JS styling

### Form Management
- **React Hook Form** - Performant form library
- **Zod** - Schema validation
- **@hookform/resolvers** - Integración RHF + Zod

### HTTP & API
- **Axios 1.6** - HTTP client con interceptores
- **JWT Decode** - Decodificación de tokens JWT

### Utilities
- **date-fns** - Manipulación de fechas (lightweight alternative a Moment.js)
- **React Hot Toast** - Toast notifications

### Developer Experience
- **ESLint** - Linting con reglas de React y TypeScript
- **Prettier** - Code formatting
- **TypeScript Compiler** - Type checking en modo strict

## 📁 Arquitectura de Carpetas

```
frontend/web/
├── public/                     # Archivos estáticos
├── src/
│   ├── modules/               # Módulos de negocio (feature-based)
│   │   ├── auth/             # Autenticación y autorización
│   │   │   ├── LoginPage.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   │
│   │   ├── dashboard/        # Dashboard principal
│   │   │   └── DashboardPage.tsx
│   │   │
│   │   ├── patients/         # Módulo de pacientes
│   │   │   ├── pages/
│   │   │   │   ├── PatientListPage.tsx
│   │   │   │   └── PatientDetailPage.tsx
│   │   │   └── components/   # Componentes específicos del módulo
│   │   │
│   │   └── shared/           # Componentes compartidos
│   │       ├── layout/
│   │       │   └── MainLayout.tsx
│   │       └── components/
│   │           └── LoadingFallback.tsx
│   │
│   ├── services/             # API clients y lógica de servicios
│   │   ├── api.client.ts     # Axios instance con interceptores
│   │   ├── auth.service.ts   # Servicio de autenticación
│   │   └── patient.service.ts
│   │
│   ├── stores/               # Zustand stores (client state)
│   │   └── auth.store.ts
│   │
│   ├── hooks/                # Custom React hooks
│   │   └── usePatients.ts    # React Query hooks
│   │
│   ├── types/                # TypeScript types e interfaces
│   │   └── index.ts
│   │
│   ├── config/               # Configuraciones
│   │   └── app.config.ts
│   │
│   ├── routes/               # Configuración de routing
│   │   └── AppRoutes.tsx
│   │
│   ├── utils/                # Funciones utilitarias
│   ├── theme.ts              # MUI theme customization
│   ├── App.tsx               # Root component
│   └── main.tsx              # Entry point
│
├── .vscode/                  # VS Code settings
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Orquestación de contenedores
├── nginx.conf                # Configuración Nginx para producción
├── vite.config.ts            # Configuración de Vite
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies y scripts
```

## 🔄 Flujo de Datos

### Arquitectura de Capas

```
┌─────────────────────────────────────────────────┐
│              UI LAYER (Components)              │
│  - Pages, Components, Forms, Tables             │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         BUSINESS LOGIC LAYER (Hooks)            │
│  - React Query hooks (usePatients, etc.)        │
│  - Custom hooks                                 │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          SERVICE LAYER (Services)               │
│  - patient.service.ts                           │
│  - auth.service.ts                              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         HTTP CLIENT (API Client)                │
│  - Axios instance                               │
│  - Request/Response interceptors                │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│              API GATEWAY                        │
│         (http://localhost:8080)                 │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
       ┌─────────────────────┐
       │   Microservicios    │
       │  - Pacientes (8001) │
       │  - Inventario (8002)│
       │  - etc.             │
       └─────────────────────┘
```

### State Management Strategy

**Server State** (React Query):
- Datos de API (pacientes, prescripciones, entregas)
- Cache automático con TTL de 5 minutos
- Background refetch
- Optimistic updates
- Automatic garbage collection

**Client State** (Zustand):
- Autenticación (user, tokens)
- UI state (sidebar open/close, theme)
- Preferencias del usuario

## 🔐 Autenticación y Seguridad

### Flow de Autenticación

```
1. Usuario → LoginPage → Credenciales
2. LoginPage → authService.login() → POST /api/v1/auth/login
3. API Gateway → Auth Service → Validación
4. Auth Service → Response { accessToken, refreshToken, user }
5. authStore.setTokens() → Persiste en localStorage via Zustand persist
6. authStore.setUser() → Almacena información del usuario
7. Redirect → /dashboard
```

### Request Flow con JWT

```
1. Component → usePatients() → React Query
2. React Query → patientService.getPatients()
3. patientService → apiClient.get('/api/v1/patients')
4. Axios Request Interceptor:
   - Lee token de authStore
   - Añade header: Authorization: Bearer <token>
5. Request → API Gateway
6. Response ← API Gateway
7. Axios Response Interceptor:
   - Si 401 (token expirado):
     * Intenta refresh token
     * Si falla: logout() y redirect /login
   - Si 4xx/5xx: muestra toast error
8. Data → React Query cache
9. Component re-render con nueva data
```

### Protected Routes

```typescript
<Route element={<ProtectedRoute />}>
  <Route element={<MainLayout />}>
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/patients" element={<PatientListPage />} />
    // ...
  </Route>
</Route>
```

`ProtectedRoute` valida:
- `isAuthenticated === true`
- `!isTokenExpired()`
- Si falla: `<Navigate to="/login" />`

## 🎣 React Query Architecture

### Query Keys Pattern

```typescript
export const patientKeys = {
  all: ['patients'],
  lists: () => [...patientKeys.all, 'list'],
  list: (filters) => [...patientKeys.lists(), filters],
  details: () => [...patientKeys.all, 'detail'],
  detail: (id) => [...patientKeys.details(), id],
  prescriptions: (id) => [...patientKeys.detail(id), 'prescriptions'],
};
```

**Beneficios:**
- Invalidación granular de cache
- Tipado fuerte
- DRY (Don't Repeat Yourself)

### Cache Invalidation Strategy

```typescript
// Crear paciente
useCreatePatient.onSuccess(() => {
  queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
  // Invalida TODAS las listas de pacientes (diferentes filtros)
});

// Actualizar paciente
useUpdatePatient.onSuccess((_, variables) => {
  queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
  queryClient.invalidateQueries({ queryKey: patientKeys.detail(variables.id) });
  // Invalida listas Y detalle específico
});
```

## 🧩 Component Patterns

### Atomic Design Principles

**Atoms**: Componentes básicos reutilizables
- Buttons, Inputs, Badges, Chips (de MUI)

**Molecules**: Combinación de atoms
- `<LoadingFallback />`, `<SearchField />`, `<StatCard />`

**Organisms**: Componentes complejos
- `<PatientTable />`, `<MainLayout />`, `<PatientForm />`

**Templates**: Layouts de página
- `<MainLayout />` con Drawer + AppBar

**Pages**: Páginas completas
- `<PatientListPage />`, `<PatientDetailPage />`

### Code Splitting & Lazy Loading

```typescript
// AppRoutes.tsx
const DashboardPage = lazy(() => import('@modules/dashboard/DashboardPage'));
const PatientListPage = lazy(() => import('@modules/patients/pages/PatientListPage'));

<Route
  path="/dashboard"
  element={
    <Suspense fallback={<LoadingFallback />}>
      <DashboardPage />
    </Suspense>
  }
/>
```

**Resultado:**
- Chunks separados: `dashboard.chunk.js`, `patients.chunk.js`
- Carga bajo demanda
- Menor tiempo de carga inicial

## 📱 Responsive Design

### Breakpoints (MUI)

```typescript
xs: 0px      // Extra small (móviles)
sm: 600px    // Small (tablets pequeñas)
md: 900px    // Medium (tablets)
lg: 1200px   // Large (desktop)
xl: 1536px   // Extra large (pantallas grandes)
```

### Mobile-First Strategy

```typescript
// MainLayout.tsx
<Drawer
  variant="temporary"
  sx={{ display: { xs: 'block', md: 'none' } }}  // Móvil
/>
<Drawer
  variant="permanent"
  sx={{ display: { xs: 'none', md: 'block' } }}  // Desktop
/>
```

### Grid System

```typescript
<Grid container spacing={3}>
  <Grid item xs={12} sm={6} md={4} lg={3}>
    {/* 
      xs=12: Full width en móviles
      sm=6:  2 columnas en tablets
      md=4:  3 columnas en tablets grandes
      lg=3:  4 columnas en desktop
    */}
  </Grid>
</Grid>
```

## 🎨 Theming & Styling

### Material-UI Theme

```typescript
// theme.ts
export const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },       // Azul
    secondary: { main: '#9c27b0' },     // Púrpura
    success: { main: '#2e7d32' },       // Verde
    error: { main: '#d32f2f' },         // Rojo
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
  },
});
```

### Styling Approaches

1. **MUI sx prop** (CSS-in-JS):
```typescript
<Box sx={{ p: 3, bgcolor: 'grey.50' }}>
```

2. **MUI styled components**:
```typescript
const StyledCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
}));
```

3. **Global CSS** (index.css):
```css
::-webkit-scrollbar { width: 8px; }
```

## 🚀 Performance Optimization

### Techniques Applied

1. **Code Splitting**: Lazy loading de rutas
2. **Tree Shaking**: Vite elimina código no usado
3. **Bundle Optimization**:
   ```typescript
   manualChunks: {
     'react-vendor': ['react', 'react-dom', 'react-router-dom'],
     'mui-vendor': ['@mui/material'],
     'query-vendor': ['@tanstack/react-query'],
   }
   ```

4. **Memoization** (cuando sea necesario):
   ```typescript
   const expensiveValue = useMemo(() => computeExpensive(data), [data]);
   ```

5. **React Query Cache**: Reduce requests innecesarios

6. **Image Optimization**: Lazy loading nativo
   ```html
   <img loading="lazy" />
   ```

### Core Web Vitals Targets

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **INP (Interaction to Next Paint)**: < 200ms

## 🧪 Testing Strategy (Futuro)

### Unit Tests
- **Framework**: Vitest
- **Target**: Hooks, utils, services
- **Coverage**: > 80%

### Component Tests
- **Framework**: React Testing Library
- **Target**: Componentes aislados
- **Coverage**: > 70%

### E2E Tests
- **Framework**: Playwright
- **Target**: Flujos críticos (login, crear paciente, etc.)

## 🐳 Docker & Deployment

### Multi-Stage Build

```dockerfile
# Stage 1: Build
FROM node:18-alpine as build
RUN npm ci && npm run build

# Stage 2: Production (Nginx)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

### Nginx Configuration

- **SPA Routing**: `try_files $uri /index.html`
- **Gzip Compression**: Reduce payload
- **Cache Headers**: Static assets cacheados 1 año
- **Security Headers**: X-Frame-Options, X-Content-Type-Options
- **API Proxy**: `/api/*` → API Gateway

### Environment Variables

```bash
VITE_API_BASE_URL=http://localhost:8080  # Dev
VITE_API_BASE_URL=https://api.psp.com    # Prod
```

## 📊 Monitoring & Observability (Futuro)

### Error Tracking
- **Sentry**: Captura de errores en producción
- **React Error Boundaries**: Fallback UI

### Analytics
- **Google Analytics 4**: User behavior
- **Hotjar**: Heatmaps y session recordings

### Performance Monitoring
- **Web Vitals API**: Métricas de rendimiento
- **Lighthouse CI**: Auditorías automáticas en CI/CD

## 🔮 Roadmap Técnico

### Fase 1 (Completado) ✅
- [x] Setup de proyecto con Vite + React + TypeScript
- [x] Configuración de React Query y Zustand
- [x] Auth flow con JWT (mock)
- [x] MainLayout responsive
- [x] Módulo de pacientes (List + Detail)
- [x] Docker multi-stage build

### Fase 2 (En progreso)
- [ ] Implementar Auth Service real
- [ ] Formularios con React Hook Form + Zod
- [ ] Módulo de Prescripciones
- [ ] Módulo de Entregas
- [ ] Notificaciones en tiempo real (WebSockets/Server-Sent Events)

### Fase 3 (Futuro)
- [ ] Tests unitarios y E2E
- [ ] PWA (Service Workers, offline mode)
- [ ] Dark mode
- [ ] Internacionalización (i18n)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (lazy images, virtual scrolling)

## 🔗 Integración con Backend

### Microservicios Consumidos

| Microservicio | Puerto | Endpoints Consumidos |
|---------------|--------|---------------------|
| **API Gateway** | 8080 | Punto de entrada único |
| **Pacientes** | 8001 | GET/POST/PUT/DELETE /api/v1/patients |
| **Prescripciones** | (TBD) | /api/v1/prescriptions |
| **Inventario** | (TBD) | /api/v1/inventory |
| **Entregas** | (TBD) | /api/v1/deliveries |
| **Auth** | (TBD) | /api/v1/auth/* |

### API Contract

Todos los DTOs TypeScript en `src/types/index.ts` deben coincidir con los DTOs del backend:

```typescript
// Frontend DTO
interface Patient {
  id: number;
  nombre: string;
  apellido: string;
  documentoIdentidad: string;
  // ... debe coincidir con PatientResponse.java
}
```

## 📚 Referencias

- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Material-UI](https://mui.com/)
- [Vite Guide](https://vitejs.dev/guide/)

---

**Última actualización**: Marzo 2026 | Versión 1.0.0
