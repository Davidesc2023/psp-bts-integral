# PSP — Runbook de Producción

## Índice
1. [Estructura del repositorio](#estructura)
2. [Migraciones Supabase](#migraciones)
3. [Variables de entorno](#variables)
4. [Despliegue en Vercel](#vercel)
5. [Commit inicial limpio](#git)
6. [Checklist de validación final](#checklist)

---

## 1. Estructura del repositorio {#estructura}

```
.
├── .gitignore                        # Ignore raíz (NO subir .env)
├── frontend/
│   └── web/
│       ├── .env.example              # Plantilla — copiar como .env.local
│       ├── vercel.json               # Config SPA + headers de seguridad
│       └── src/
│           └── services/
│               └── supabaseClient.ts # Lee VITE_SUPABASE_URL / ANON_KEY
├── backend/
│   └── supabase/
│       └── migrations/
│           ├── 005_security_hardening.sql   # RLS real por tenant
│           └── 006_fix_consentimientos.sql  # UNIQUE(patient_id)
└── supabase/
    ├── schema.sql                    # Schema base (referencia)
    └── migration_v4_campos_nuevos.pgsql  # Migraciones legacy
```

---

## 2. Migraciones Supabase {#migraciones}

### Orden de ejecución

| # | Archivo | Estado |
|---|---------|--------|
| 001 | `supabase/schema.sql` | Aplicado |
| 002 | `supabase/migration_pacientes_v2.sql` | Aplicado |
| 003 | `supabase/migration_v3_completar_modulos.pgsql` | Aplicado |
| 004 | `supabase/migration_v4_campos_nuevos.pgsql` | Aplicado |
| **005** | `backend/supabase/migrations/005_security_hardening.sql` | **Pendiente** |
| **006** | `backend/supabase/migrations/006_fix_consentimientos.sql` | **Pendiente** |

### Cómo ejecutar en Supabase SQL Editor

1. Abrir **[app.supabase.com](https://app.supabase.com)** → tu proyecto
2. Ir a **SQL Editor** → botón **New query**
3. Pegar el contenido completo de `005_security_hardening.sql`
4. Click **Run** (▶)
5. Verificar en el panel de resultados que no hay errores rojos
6. Abrir **New query** nuevamente → pegar `006_fix_consentimientos.sql` → **Run**

### Verificación post-migración (ejecutar en SQL Editor)

```sql
-- 1. Confirmar que auth_tenant_id() existe
SELECT proname FROM pg_proc WHERE proname = 'auth_tenant_id';

-- 2. Confirmar RLS por tenant en tablas operativas
--    tenant_policies debe ser 4, open_policies debe ser 0
SELECT tablename,
       SUM(CASE WHEN qual LIKE '%auth_tenant_id%' THEN 1 ELSE 0 END) AS tenant_policies,
       SUM(CASE WHEN qual = 'true' THEN 1 ELSE 0 END) AS open_policies
  FROM pg_policies
 WHERE tablename IN (
   'patients','barriers','seguimientos','tareas','prescripciones',
   'aplicaciones','entregas','paraclinicos','transportes',
   'consentimientos','servicios_complementarios','consultas_medicas'
 )
 GROUP BY tablename
 ORDER BY tablename;

-- 3. Confirmar UNIQUE constraint en consentimientos
SELECT constraint_name FROM information_schema.table_constraints
 WHERE table_name = 'consentimientos' AND constraint_type = 'UNIQUE';

-- 4. CRÍTICO: verificar que el usuario tiene tenant_id asignado
SELECT id, role, tenant_id FROM user_profiles WHERE id = auth.uid();
```

> **Si `tenant_id` es NULL**: todos los inserts fallarán con RLS violation.
> Ejecutar (reemplazar el UUID con el ID real del tenant):
> ```sql
> UPDATE user_profiles
>    SET tenant_id = '<UUID-tenant>'
>  WHERE tenant_id IS NULL;
> ```

---

## 3. Variables de entorno {#variables}

### Dónde obtenerlas

| Variable | Ubicación en Supabase |
|---|---|
| `VITE_SUPABASE_URL` | Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Project Settings → API → anon / public |

> **La Service Role Key NO debe usarse en el frontend nunca.**

### .env.local (desarrollo — NO subir a git)

```bash
cp frontend/web/.env.example frontend/web/.env.local
# Editar .env.local con valores reales del dashboard
```

Contenido de `.env.local`:
```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_APP_ENV=development
VITE_APP_NAME=PSP Pacientes
```

---

## 4. Despliegue en Vercel {#vercel}

### Pasos

1. Ir a **[vercel.com](https://vercel.com)** → **Add New Project**
2. Importar el repositorio de GitHub
3. Configurar:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. En **Environment Variables** agregar:

| Name | Value | Environments |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `<anon-key>` | Production, Preview, Development |
| `VITE_APP_ENV` | `production` | Production |
| `VITE_APP_ENV` | `development` | Development |

5. Click **Deploy**

### Verificar que el deploy fue exitoso

```bash
# Build local (antes de hacer push)
cd frontend/web
npm install
npm run build
# Debe terminar sin errores TypeScript
```

---

## 5. Commit inicial limpio {#git}

```bash
# Desde la raíz del proyecto

# 1. Inicializar git si aún no existe
git init

# 2. Verificar qué se va a subir (IMPORTANTE: confirmar que .env no aparece)
git status

# 3. Stage de archivos seguros
git add .gitignore
git add README.md
git add frontend/web/.env.example
git add frontend/web/src/
git add frontend/web/package.json
git add frontend/web/vite.config.ts
git add frontend/web/tsconfig.json
git add frontend/web/vercel.json
git add backend/supabase/migrations/005_security_hardening.sql
git add backend/supabase/migrations/006_fix_consentimientos.sql
git add supabase/schema.sql
git add supabase/migration_v4_campos_nuevos.pgsql
git add docs/

# 4. NUNCA hacer: git add .env* o git add *.env

# 5. Verificar que no hay credenciales en el staging
git diff --staged | grep -i "supabase.co\|eyJ\|password\|secret\|key"
# Debe retornar vacío

# 6. Commit limpio
git commit -m "feat: PSP multi-tenant production setup

- RLS real por tenant (005_security_hardening)
- UNIQUE constraint consentimientos (006_fix_consentimientos)
- withTenant() helper — 12 services refactorizados
- Storage paths con prefijo tenantId/
- .gitignore raíz — credenciales protegidas"

# 7. Conectar remote y push
git remote add origin https://github.com/<ORG>/<REPO>.git
git push -u origin main
```

---

## 6. Checklist de validación final {#checklist}

### Pre-validación DB

- [ ] `005_security_hardening.sql` ejecutado sin errores
- [ ] `006_fix_consentimientos.sql` ejecutado sin errores
- [ ] `auth_tenant_id()` existe en `pg_proc`
- [ ] `user_profiles.tenant_id` NO es NULL para los usuarios de prueba
- [ ] `pg_policies` muestra `tenant_policies=4`, `open_policies=0` para todas las tablas

### Prueba 1 — Crear paciente

1. Login con usuario de tenant A
2. Crear nuevo paciente con todos los campos requeridos
3. **Esperado**: paciente aparece en lista, sin error en consola
4. Verificar en SQL Editor:
   ```sql
   SELECT id, first_name, tenant_id FROM patients ORDER BY created_at DESC LIMIT 1;
   -- tenant_id debe coincidir con el tenant del usuario logueado
   ```

### Prueba 2 — Guardar consentimiento

1. Abrir ficha del paciente → pestaña Consentimiento
2. Marcar checkboxes y subir documento PDF
3. **Esperado**: consentimiento guardado, URL de storage devuelta
4. Verificar path en Supabase Storage:
   - Debe ser `<tenant-id>/consentimientos/<patient-id>/...`
   - NO debe ser `consentimientos/<patient-id>/...`

### Prueba 3 — Barreras

1. Crear barrera para el paciente
2. **Esperado**: barrera guardada, aparece en lista
3. Verificar:
   ```sql
   SELECT id, tenant_id FROM barriers ORDER BY created_at DESC LIMIT 1;
   ```

### Prueba 4 — Aplicaciones masivas

1. Crear prescripción para un paciente (registrar el ID)
2. Generar aplicaciones masivas con ese paciente y prescripción
3. **Esperado**: N aplicaciones creadas según rango de fechas
4. Verificar:
   ```sql
   SELECT COUNT(*), tenant_id, paciente_id
     FROM aplicaciones
    WHERE prescripcion_id = <ID>
    GROUP BY tenant_id, paciente_id;
   -- paciente_id NO debe ser NULL
   ```

### Prueba 5 — Aislamiento multi-tenant (si hay 2 tenants)

1. Login con usuario de tenant B
2. Abrir lista de pacientes
3. **Esperado**: NO aparecen los pacientes del tenant A
4. Verificar RLS en SQL Editor (ejecutar como usuario B):
   ```sql
   SELECT COUNT(*) FROM patients;
   -- Debe retornar solo los pacientes de tenant B
   ```

### Prueba 6 — Dashboard

1. Abrir dashboard
2. **Esperado**: KPIs muestran datos reales, sin error 500
3. Si falla: verificar que `user_profiles.tenant_id` NO es NULL

### Estado final

| Prueba | Resultado |
|---|---|
| 1 — Crear paciente | ⬜ PENDIENTE |
| 2 — Guardar consentimiento | ⬜ PENDIENTE |
| 3 — Barreras | ⬜ PENDIENTE |
| 4 — Aplicaciones masivas | ⬜ PENDIENTE |
| 5 — Aislamiento multi-tenant | ⬜ PENDIENTE |
| 6 — Dashboard | ⬜ PENDIENTE |

**Sistema: `BLOQUEADO` → ejecutar migraciones → `OPERATIVO`**
