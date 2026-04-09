# Checklist Pre-Producción — PSP

Lista de verificación antes de hacer go-live del sistema PSP en producción.

**Responsable**: Tech Lead / Coordinador de Proyecto  
**Plataforma**: Vercel (frontend) + Supabase Cloud (backend)

---

## 1. Supabase (Base de Datos)

### Schema y Migraciones
- [ ] Schema base ejecutado (`supabase/schema.sql`)
- [ ] Migraciones aplicadas en orden hasta `migration_v4_campos_nuevos.pgsql`
- [ ] Políticas RLS aplicadas (`supabase/fix_rls_policies.pgsql`)
- [ ] RLS habilitado en todas las tablas sensibles

```sql
-- Verificar tablas con RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

### Usuarios y Roles
- [ ] Usuario administrador creado en Supabase Auth
- [ ] Perfil de admin en tabla `user_profiles` con `role = 'ADMIN'`
- [ ] Al menos 1 coordinador de prueba creado y validado
- [ ] Al menos 1 educador de prueba creado y validado con laboratorio asignado

### Seguridad
- [ ] Service role key NO está expuesta en el frontend
- [ ] Anon key configurada correctamente (solo permisos RLS)
- [ ] Email templates de Supabase Auth configurados en español

### Datos Iniciales
- [ ] Catálogos cargados: EPS, IPS, departamentos, ciudades
- [ ] Al menos 1 laboratorio/programa configurado
- [ ] Tipos de paraclínicos configurados
- [ ] Medicamentos del programa cargados

---

## 2. Vercel (Frontend)

### Variables de Entorno
- [ ] `VITE_SUPABASE_URL` configurada en Vercel (entorno Production)
- [ ] `VITE_SUPABASE_ANON_KEY` configurada en Vercel (entorno Production)
- [ ] Variables también configuradas para entorno Preview (staging)

### Build y Deploy
- [ ] Build de producción sin errores (`npm run build` local)
- [ ] TypeScript sin errores (`tsc --noEmit` → 0 errores)
- [ ] Deploy en Vercel exitoso (indicador verde)
- [ ] URL de producción accesible desde browser
- [ ] HTTPS activo (automático en Vercel)

### Configuración Vercel
- [ ] Root directory: `frontend/web`
- [ ] Framework preset: Vite
- [ ] Branch de producción: `master`
- [ ] Dominio personalizado configurado (si aplica)

---

## 3. Funcionalidades Críticas

### Autenticación
- [ ] Login con usuario admin funciona
- [ ] Login con educador funciona
- [ ] Logout funciona
- [ ] Rutas protegidas redirigen a /login sin sesión
- [ ] Refresh de página mantiene la sesión

### Pacientes
- [ ] Crear paciente con formulario de 6 pasos
- [ ] Validación tipo de documento vs edad funciona (Step 1)
- [ ] Código de paciente se genera automáticamente
- [ ] Editar paciente funciona
- [ ] Cambio de estado funciona
- [ ] Drop Out muestra aviso y anonimiza datos

### Módulos Operativos
- [ ] Prescripciones: crear y listar por paciente
- [ ] Seguimientos: crear con prioridad calculada
- [ ] Barreras: solo 1 activa por paciente
- [ ] Tareas: crear con prioridad ALTA/MEDIA/BAJA
- [ ] Consentimientos: registrar y listar

### Multi-tenancy
- [ ] Educador A no puede ver pacientes de laboratorio B
- [ ] Coordinador ve todos sus programas
- [ ] Admin ve todo el sistema

---

## 4. Seguridad

- [ ] `.env` no está commiteado en el repositorio
- [ ] `.gitignore` incluye `.env` y `node_modules`
- [ ] No hay credenciales hardcodeadas en el código fuente
- [ ] No hay `console.log` con datos sensibles

```bash
# Verificar que no hay secrets en el repo
git log --all --full-history -- .env
git grep -i "supabase_service" -- "*.ts" "*.tsx" "*.js"
```

---

## 5. Rendimiento

- [ ] Build de producción < 2MB (revisar con `npm run build`)
- [ ] Lazy loading activo en todas las rutas (AppRoutes.tsx)
- [ ] Sin imports de módulos completos innecesarios (`import * from ...`)

---

## 6. Post-Despliegue (primeras 24h)

- [ ] Crear 2-3 pacientes de prueba completos
- [ ] Hacer un seguimiento completo de un paciente piloto
- [ ] Verificar que las notificaciones aparecen en el dashboard
- [ ] Verificar que el filtro por laboratorio funciona correctamente
- [ ] Revisar la consola del browser: 0 errores críticos

---

## Rollback

Si algo falla después del deploy:

1. Ir a Vercel → Deployments
2. Encontrar el último deploy estable
3. Clic en "Promote to Production" → instantáneo
4. Si el problema está en la BD → ejecutar SQL inverso en Supabase SQL Editor
