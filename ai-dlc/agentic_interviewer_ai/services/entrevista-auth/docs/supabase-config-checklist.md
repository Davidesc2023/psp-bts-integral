# Checklist de Configuración Supabase — auth-lambda (Unidad 6)

**Fecha**: 2026-04-08
**Proyecto producción**: `entrevista-prod`
**Proyecto staging**: `entrevista-staging`

Ejecutar este checklist para **cada entorno** (staging primero, luego producción).

---

## Paso 1 — Migraciones SQL

```bash
# Clonar repo y posicionarse en la raíz
cd /ruta/al/repo/entrevista-ai

# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Aplicar migraciones en staging
supabase db push --project-ref <STAGING_PROJECT_REF>

# Verificar en staging, luego aplicar en producción
supabase db push --project-ref <PROD_PROJECT_REF>
```

Migraciones a aplicar (en orden):
- [ ] `001_create_auth_login_attempts.sql` — tabla + índices + RLS
- [ ] `002_create_hook_before_sign_in.sql` — función PL/pgSQL
- [ ] `003_create_hook_after_failure.sql` — función PL/pgSQL

**Verificación**:
```sql
-- Confirmar que la tabla existe
SELECT COUNT(*) FROM public.auth_login_attempts;

-- Confirmar que las funciones existen
SELECT proname FROM pg_proc WHERE proname IN (
    'hook_before_sign_in',
    'hook_after_sign_in_failure'
);
```

---

## Paso 2 — Registrar hooks en Supabase Auth

Ir a: **Supabase Dashboard > Authentication > Hooks**

- [ ] Crear hook tipo **Before Sign In**:
  - Schema: `public`
  - Function: `hook_before_sign_in`
  - ✅ Guardar y verificar que aparece como "Active"

- [ ] Crear hook tipo **After Sign In Failure** *(si disponible en la versión del proyecto)*:
  - Schema: `public`
  - Function: `hook_after_sign_in_failure`
  - ✅ Guardar y verificar

> **Si "After Sign In Failure" no está disponible**: habilitar el trigger comentado en `003_create_hook_after_failure.sql` manualmente en el SQL Editor.

---

## Paso 3 — Configurar JWT y tokens

Ir a: **Supabase Dashboard > Authentication > Settings > JWT**

- [ ] `JWT Expiry`: **900** segundos (15 minutos)
- [ ] `Refresh Token Duration`: **604800** segundos (7 días)
- [ ] `Refresh Token Rotation`: **Habilitado** ✅
- [ ] `Detect Reuse`: **Habilitado** ✅

> ⚠️ **Atención**: cambiar `JWT Expiry` invalida todos los tokens activos al instante. Ejecutar durante horario de bajo uso.

---

## Paso 4 — Configurar URLs de autenticación

Ir a: **Supabase Dashboard > Authentication > URL Configuration**

- [ ] `Site URL`:
  - Staging: `https://staging.entrevista.ai`
  - Producción: `https://app.entrevista.ai`
- [ ] `Additional Redirect URLs` (si aplica):
  - `http://localhost:5173` (desarrollo local)

---

## Paso 5 — Configurar SMTP (solo producción)

Ir a: **Supabase Dashboard > Authentication > Settings > SMTP**

- [ ] Habilitar SMTP personalizado
- [ ] `From email`: `no-reply@entrevista.ai`
- [ ] `From name`: `EntreVista AI`
- [ ] Configurar credenciales SMTP del proveedor (SendGrid / Resend / SES)
- [ ] Enviar email de prueba y verificar entrega

---

## Paso 6 — Configurar Database Webhook (después de deploy de compliance-lambda)

> Este paso requiere que **compliance-lambda (Unit 5)** esté desplegado y su URL disponible.

Ir a: **Supabase Dashboard > Database > Webhooks**

- [ ] Crear webhook:
  - Name: `audit-to-compliance`
  - Table: `auth.audit_log_entries`
  - Events: `INSERT`
  - HTTP URL: `{COMPLIANCE_LAMBDA_URL}/webhook/auth-event`
  - Method: `POST`
  - Headers:
    - `x-webhook-secret`: valor de `WEBHOOK_SECRET` en Secrets Manager
  - Timeout: `5000` ms
- [ ] Verificar que el webhook aparece como activo
- [ ] Realizar un login de prueba y verificar que compliance-lambda recibe el evento

---

## Paso 7 — Configurar AWS Secrets Manager

En la consola de AWS o con CLI:

```bash
# Staging
aws secretsmanager create-secret \
  --name entrevista/staging/supabase-jwt-secret \
  --secret-string "{\"SUPABASE_JWT_SECRET\":\"<valor-desde-supabase-dashboard>\"}"

aws secretsmanager create-secret \
  --name entrevista/staging/mongodb-uri \
  --secret-string "{\"MONGODB_URI\":\"<uri-atlas-staging>\"}"

aws secretsmanager create-secret \
  --name entrevista/staging/webhook-secret \
  --secret-string "{\"WEBHOOK_SECRET\":\"<valor-generado>\"}"

# Producción (reemplazar "staging" por "prod")
```

- [ ] Secreto `entrevista/staging/supabase-jwt-secret` creado
- [ ] Secreto `entrevista/staging/mongodb-uri` creado
- [ ] Secreto `entrevista/staging/webhook-secret` creado
- [ ] Secreto `entrevista/prod/supabase-jwt-secret` creado
- [ ] Secreto `entrevista/prod/mongodb-uri` creado
- [ ] Secreto `entrevista/prod/webhook-secret` creado

**Obtener `SUPABASE_JWT_SECRET`**:
Supabase Dashboard > Settings > API > JWT Settings > JWT Secret

---

## Paso 8 — Configurar Vercel

En el Dashboard de Vercel del proyecto `entrevista-dashboard`:

- [ ] Variable `VITE_SUPABASE_URL`: `https://<ref>.supabase.co`
- [ ] Variable `VITE_SUPABASE_ANON_KEY`: valor de "anon key" en Supabase Dashboard > Settings > API
- [ ] (Staging) Variables equivalentes en el entorno Preview de Vercel

---

## Paso 9 — Verificación end-to-end

Realizar prueba completa de login en staging:

- [ ] Abrir la URL de staging del dashboard
- [ ] Intentar login con credenciales correctas → debe obtener JWT con `exp` en ~15 min
- [ ] Intentar 3 logins incorrectos → debe recibir error 429 a partir del 3er intento
- [ ] Verificar en tabla `auth_login_attempts` que el registro fue creado:
  ```sql
  SELECT * FROM public.auth_login_attempts WHERE user_id = '<id-del-operador>';
  ```
- [ ] Esperar 15 minutos → verifica que el bloqueo se libera automáticamente
- [ ] Verificar en compliance-lambda que llegó el evento de auditoría de login

---

## Contacto

En caso de problemas con la configuración:
- Documentación Supabase Auth Hooks: https://supabase.com/docs/guides/auth/auth-hooks
- Documentación Supabase Webhooks: https://supabase.com/docs/guides/database/webhooks
