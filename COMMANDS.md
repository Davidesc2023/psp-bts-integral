# Comandos Útiles - PSP Web Frontend

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Usando yarn
yarn install

# Usando pnpm
pnpm install
```

## 🚀 Desarrollo

```bash
# Iniciar servidor de desarrollo (puerto 3000)
npm run dev

# El servidor recargará automáticamente cuando hagas cambios
# Disponible en: http://localhost:3000
```

## 🏗️ Build

```bash
# Build de producción
npm run build

# El output estará en /dist

# Preview del build de producción
npm run preview
```

## 🧹 Code Quality

```bash
# Linting con ESLint
npm run lint

# Formatear código con Prettier
npm run format

# Type checking (sin generar archivos)
npm run type-check

# Ejecutar todos antes de commit
npm run lint && npm run type-check && npm run format
```

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch

# E2E tests (cuando estén configurados)
npm run test:e2e
```

## 📊 Análisis

```bash
# Analizar tamaño del bundle
npm run build -- --analyze

# Ver estadísticas de Vite
npm run build -- --debug
```

## 🔧 Troubleshooting

```bash
# Limpiar cache de Vite
rm -rf node_modules/.vite

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Limpiar build anterior
rm -rf dist

# Build limpio
npm run build --clean
```

## 🌐 Variables de Entorno

```bash
# Desarrollo local
cp .env.example .env

# Editar variables
# VITE_API_BASE_URL=http://localhost:8080

# Las variables deben empezar con VITE_ para estar disponibles en el código
```

## 📱 Desarrollo Mobile

```bash
# Acceder desde dispositivo móvil en la misma red
# 1. Encuentra tu IP local: ipconfig (Windows) o ifconfig (Mac/Linux)
# 2. Accede desde el móvil: http://<tu-ip>:3000

# Vite muestra la URL de red automáticamente al ejecutar npm run dev
```

## 🐳 Docker (Opcional)

```bash
# Build imagen Docker
docker build -t psp-web .

# Ejecutar contenedor
docker run -p 3000:80 psp-web

# Con docker-compose
docker-compose up -d
```

## 🔍 Debugging

### VS Code Launch Config

Crea `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

### React DevTools

```bash
# Instalar extensión de navegador
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools/
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/
```

### React Query DevTools

Ya está incluido en modo desarrollo. Aparecerá un botón flotante en la esquina inferior derecha.

## 📦 Dependencias

```bash
# Agregar nueva dependencia
npm install <paquete>

# Agregar dependencia de desarrollo
npm install -D <paquete>

# Actualizar dependencias
npm update

# Verificar dependencias desactualizadas
npm outdated

# Auditoría de seguridad
npm audit

# Arreglar vulnerabilidades
npm audit fix
```

## 🔀 Git Workflow

```bash
# Antes de hacer commit
npm run lint
npm run type-check
git add .
git commit -m "feat: descripción del cambio"

# Convención de commits
# feat: Nueva funcionalidad
# fix: Corrección de bug
# docs: Documentación
# style: Formato (no afecta código)
# refactor: Refactorización
# test: Tests
# chore: Mantenimiento
```

## 🚢 Deploy

### Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy a producción
vercel --prod
```

### Netlify

```bash
# Instalar Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy

# Deploy a producción
netlify deploy --prod
```

### Azure Static Web Apps

```bash
# Instalar Azure Static Web Apps CLI
npm i -g @azure/static-web-apps-cli

# Deploy
swa deploy
```

## 💡 Tips de Desarrollo

### Hot Module Replacement (HMR)

Vite recarga automáticamente los cambios. Si falla:

```bash
# Reiniciar servidor dev
# Ctrl+C y luego npm run dev
```

### Path Aliases

Usa los aliases configurados:

```typescript
import { Component } from '@modules/patients/Component';
import { apiClient } from '@services/api.client';
import { usePatients } from '@hooks/usePatients';
```

### TypeScript Autocomplete

Asegúrate de que VS Code use la versión de TypeScript del proyecto:

1. Cmd/Ctrl + Shift + P
2. "TypeScript: Select TypeScript Version"
3. "Use Workspace Version"

## 📚 Recursos

- [Vite Docs](https://vitejs.dev/)
- [React Docs](https://react.dev/)
- [Material-UI](https://mui.com/)
- [React Query](https://tanstack.com/query/latest)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Última actualización**: Marzo 2026
