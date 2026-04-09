# Runbook Operacional — PSP

Procedimientos para situaciones operacionales en el sistema PSP (Vercel + Supabase).

---

## Índice

1. [App no carga en producción](#app-no-carga-en-producción)
2. [Error de autenticación masivo](#error-de-autenticación-masivo)
3. [Base de datos lenta o no responde](#base-de-datos-lenta-o-no-responde)
4. [RLS bloquea acceso incorrecto](#rls-bloquea-acceso-incorrecto)
5. [Rollback de despliegue](#rollback-de-despliegue)
6. [Usuario no puede iniciar sesión](#usuario-no-puede-iniciar-sesión)
7. [Migraciones de base de datos](#migraciones-de-base-de-datos)

---

## App no carga en producción

**Síntomas**: Pantalla en blanco, error 404 o error de build.

**Diagnóstico**:
1. Ir a [vercel.com](https://vercel.com) → proyecto PSP → pestaña **Deployments**
2. Verificar el estado del último deploy (indicador rojo = fallido)
3. Ver logs de build para identificar el error

**Solución**:
```bash
# Local: replicar el build de producción
cd frontend/web
npm install
npm run build
# Si hay errores, corregirlos y hacer push
```

Si el build local funciona pero Vercel falla → revisar variables de entorno en Vercel.

---

## Error de autenticación masivo

**Síntomas**: Todos los usuarios son redirigidos a /login sin poder entrar.

**Diagnóstico**:
1. Ir a [app.supabase.com](https://app.supabase.com) → proyecto PSP → **Authentication**
2. Verificar que el proveedor Email esté habilitado
3. Verificar que las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel sean correctas

**Solución**:
- Si cambiaron las keys de Supabase: actualizar en Vercel → Environment Variables → redeploy
- Si el dominio cambió: actualizar en Supabase → Authentication → URL Configuration → Site URL

---

## Base de datos lenta o no responde

**Diagnóstico**:
1. Ir a Supabase → proyecto → **Reports** → latencia de queries
2. Verificar tabla `pg_stat_activity` en el SQL Editor:
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
   FROM pg_stat_activity
   WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds';
   ```

**Acciones**:
- Queries lentos: agregar índices a las columnas filtradas frecuentemente
- Conexiones bloqueadas: `SELECT pg_terminate_backend(pid)` para terminar queries colgados
- Escalar el plan de Supabase si el problema es de capacidad

---

## RLS bloquea acceso incorrecto

**Síntomas**: Un usuario no puede ver datos que debería ver, o puede ver datos que no debería.

**Diagnóstico**:
```sql
-- Verificar las políticas activas en una tabla
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'pacientes';
```

**Solución**:
1. Revisar `supabase/fix_rls_policies.pgsql`
2. Actualizar la política incorrecta en el SQL Editor de Supabase
3. Verificar que `user_profiles` tenga el `laboratorio_id` correcto para el usuario

---

## Rollback de despliegue

**Para volver a una versión anterior en Vercel**:
1. Ir a [vercel.com](https://vercel.com) → proyecto PSP → pestaña **Deployments**
2. Ubicar el deploy estable anterior
3. Clic en los tres puntos → **Promote to Production**

El rollback es **instantáneo** (< 30 segundos), sin downtime.

**Para volver un cambio en la BD**:
- Supabase no hace rollback automático de migraciones SQL
- Ejecutar manualmente el SQL inverso en el SQL Editor
- Por esto, SIEMPRE hacer backup antes de migraciones en producción:

```sql
-- Backup de una tabla antes de migrar
CREATE TABLE pacientes_backup_YYYYMMDD AS SELECT * FROM pacientes;
```

---

## Usuario no puede iniciar sesión

**Pasos de diagnóstico**:
1. Verificar que el usuario existe en Supabase → **Authentication** → **Users**
2. Verificar que el correo esté confirmado
3. Si el usuario existe pero no puede entrar: **Send password reset**
4. Si el rol es incorrecto: verificar la tabla `user_profiles`

```sql
-- Verificar perfil de usuario
SELECT u.email, p.role, p.laboratorio_id, p.nombre
FROM auth.users u
JOIN user_profiles p ON u.id = p.id
WHERE u.email = 'usuario@ejemplo.com';
```

---

## Migraciones de base de datos

**Proceso seguro**:

```sql
-- 1. Crear backup preventivo
CREATE TABLE <tabla>_backup_<fecha> AS SELECT * FROM <tabla>;

-- 2. Ejecutar la migración
-- (pegar el SQL de la migración)

-- 3. Verificar que no se perdieron datos
SELECT COUNT(*) FROM <tabla>;
SELECT COUNT(*) FROM <tabla>_backup_<fecha>;

-- 4. Si todo ok, limpiar el backup (después de 24h)
DROP TABLE <tabla>_backup_<fecha>;
```

**Migraciones aplicadas** (ver `supabase/`):
- `schema.sql` — Schema inicial
- `migration_pacientes_v2.sql`
- `migration_patients_sociodemographic_columns.pgsql`
- `migration_transportes_servicios_v2.pgsql`
- `migration_v3_completar_modulos.pgsql`
- `migration_v4_campos_nuevos.pgsql` — Última migración aplicada
