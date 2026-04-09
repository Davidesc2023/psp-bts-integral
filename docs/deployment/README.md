# Guía de Despliegue — PSP

El sistema PSP se despliega con **Vercel** (frontend) + **Supabase Cloud** (base de datos y autenticación). No requiere servidores, contenedores ni infraestructura cloud propia.

---

## Prerrequisitos

- Cuenta en [Vercel](https://vercel.com) con acceso al repositorio
- Proyecto en [Supabase](https://app.supabase.com) creado
- Node.js 20+ instalado localmente (o usar el Node portable incluido)

---

## Variables de Entorno Requeridas

| Variable | Dónde obtenerla |
|----------|----------------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |

---

## Despliegue en Vercel (Producción)

1. En [vercel.com](https://vercel.com), importar el repositorio `psp-bts-integral`
2. Configurar:
   - **Root Directory**: `frontend/web`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Agregar las variables de entorno (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`)
4. Deploy
5. Cada push a `master` dispara un deploy automático

---

## Base de Datos (Supabase)

### Schema inicial

Ejecutar en el SQL Editor de Supabase en este orden:

```sql
-- 1. Schema base
-- Pegar contenido de supabase/schema.sql

-- 2. Migraciones
-- supabase/migration_v4_campos_nuevos.pgsql

-- 3. Políticas RLS
-- supabase/fix_rls_policies.pgsql

-- 4. Datos de prueba (opcional)
-- supabase/seed.sql
```

### Crear usuario administrador

```javascript
// Ejecutar supabase/create-users.mjs con las credenciales del admin
node supabase/create-users.mjs
```

---

## Desarrollo Local

```bash
cd frontend/web
npm install
cp .env.example .env
# Editar .env con los valores de tu proyecto Supabase de desarrollo
npm run dev
# App en http://localhost:3000
```

---

## Checklist Pre-Producción

Ver [`GO_LIVE_CHECKLIST.md`](../GO_LIVE_CHECKLIST.md) para el checklist completo.

---

## Rollback

En Vercel, ir a la pestaña **Deployments** y hacer clic en **Promote to Production** sobre cualquier deploy anterior. El rollback es instantáneo (< 30 segundos).
