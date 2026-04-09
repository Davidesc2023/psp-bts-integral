# Integration Test Instructions - auth-lambda (Unit 6)

**Scope**: Verificar que las SQL migrations y el paquete `entrevista-shared` funcionan con Supabase real en entorno staging.

**Nota arquitectonica**: Los tests de integracion para auth-lambda son principalmente **manuales con Supabase CLI**, ya que no hay un servicio HTTP independiente que testear. El paquete `entrevista-shared` sera testado de forma integrada cuando los otros lambdas (Units 2-5) lo consuman.

---

## Escenario 1: Aplicar SQL migrations a Supabase staging

### Prerequisitos
- Supabase CLI instalado: `npm install -g supabase` o `brew install supabase/tap/supabase`
- Proyecto Supabase staging creado y linked
- Variables de entorno: `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`

### Setup
```bash
# Verificar que Supabase CLI esta instalado
supabase --version

# Login en Supabase (solo la primera vez)
supabase login

# Verificar que el proyecto esta linked
supabase status
```

### Pasos de ejecucion

#### 1. Aplicar Migration 001 — tabla auth_login_attempts
```bash
# Desde la raiz del proyecto
supabase db push --db-url "$DATABASE_URL" < services/entrevista-auth/migrations/001_create_auth_login_attempts.sql

# Verificar que la tabla fue creada
supabase db query "SELECT table_name FROM information_schema.tables WHERE table_name = 'auth_login_attempts';"
```

**Resultado esperado**: 1 fila con `auth_login_attempts`

#### 2. Aplicar Migration 002 — hook_before_sign_in
```bash
supabase db push --db-url "$DATABASE_URL" < services/entrevista-auth/migrations/002_create_hook_before_sign_in.sql

# Verificar que la funcion fue creada
supabase db query "SELECT proname FROM pg_proc WHERE proname = 'hook_before_sign_in';"
```

**Resultado esperado**: 1 fila con `hook_before_sign_in`

#### 3. Aplicar Migration 003 — hook_after_sign_in_failure
```bash
supabase db push --db-url "$DATABASE_URL" < services/entrevista-auth/migrations/003_create_hook_after_failure.sql

# Verificar que la funcion fue creada
supabase db query "SELECT proname FROM pg_proc WHERE proname = 'hook_after_sign_in_failure';"
```

**Resultado esperado**: 1 fila con `hook_after_sign_in_failure`

#### 4. Configurar hooks en el Dashboard de Supabase
Seguir `services/entrevista-auth/docs/supabase-config-checklist.md`, items 4-6:
- Auth > Hooks > Enable Hook: `Before sign-in` → `public.hook_before_sign_in`
- Auth > Hooks > Enable Hook: `After sign-in failure` → `public.hook_after_sign_in_failure`

---

## Escenario 2: Verificar brute force protection end-to-end

**Prerequisito**: Migraciones aplicadas + hooks configurados en Supabase staging

### Test 2.1 — Login normal (sin bloqueo)
```bash
# Intento de login con credenciales validas
curl -X POST "https://<project-ref>.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "correct-password"}'
```
**Resultado esperado**: HTTP 200 con `access_token` en respuesta

### Test 2.2 — 3 intentos fallidos consecutivos
```bash
# Ejecutar 3 veces con contrasena incorrecta
for i in 1 2 3; do
  curl -s -o /dev/null -w "Attempt $i: HTTP %{http_code}\n" \
    -X POST "https://<project-ref>.supabase.co/auth/v1/token?grant_type=password" \
    -H "apikey: <SUPABASE_ANON_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong-password"}'
done
```
**Resultado esperado**: Los 3 intentos retornan HTTP 400

### Test 2.3 — 4to intento activa lockout de 15 minutos
```bash
# 4to intento fallido
curl -X POST "https://<project-ref>.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrong-password"}'
```
**Resultado esperado**: HTTP 429 (Too Many Requests)

### Test 2.4 — Intento con credenciales correctas durante lockout
```bash
# Incluso la contrasena correcta debe retornar 429 si esta bloqueado
curl -X POST "https://<project-ref>.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "correct-password"}'
```
**Resultado esperado**: HTTP 429 (el hook_before_sign_in bloquea antes de verificar contrasena)

### Verificar estado en base de datos
```bash
supabase db query "
SELECT user_id, attempt_count, locked_until 
FROM public.auth_login_attempts 
WHERE locked_until > now();"
```
**Resultado esperado**: 1 fila con `locked_until` ~15 minutos en el futuro

### Limpiar estado para proximos tests
```bash
supabase db query "DELETE FROM public.auth_login_attempts WHERE TRUE;"
```

---

## Escenario 3: Verificar JWT verifier contra Supabase real

**Prerequisito**: Un usuario real creado en Supabase staging con un JWT valido

```bash
# 1. Obtener JWT de usuario real
JWT=$(curl -s -X POST "https://<project-ref>.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "correct-password"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "JWT obtenido: ${JWT:0:50}..."

# 2. Verificar con el modulo Python
SUPABASE_JWT_SECRET="<project-jwt-secret>" uv run python3 -c "
from entrevista_shared.auth.supabase_jwt_verifier import verify_supabase_token
import os
payload = verify_supabase_token('$JWT')
print('Verificacion exitosa!')
print('User ID:', payload.get('sub'))
print('Role:', payload.get('role'))
"
```

**Resultado esperado**:
```
Verificacion exitosa!
User ID: <uuid>
Role: authenticated
```

---

## Criterios de aceptacion

| Escenario | Criterio | Status |
|-----------|---------|--------|
| Migraciones aplican sin error | 3/3 migraciones exitosas | [ ] Pendiente |
| Hooks configurados en Dashboard | Ambos hooks activos | [ ] Pendiente |
| Login normal funciona | HTTP 200 con JWT | [ ] Pendiente |
| Brute force activa 429 en intento 4 | HTTP 429 | [ ] Pendiente |
| Lockout bloquea incluso credenciales correctas | HTTP 429 | [ ] Pendiente |
| JWT verifier valida token real de Supabase | Sin excepciones | [ ] Pendiente |

---

## Nota: integracion con otros lambdas (Units 2-5)

El paquete `entrevista-shared` sera testado de forma integrada **cuando se buildeen las unidades que lo consumen**. Los tests de integracion completos (p.ej., `conversation-lambda` usando `verify_supabase_token`) se documentaran en sus respectivos `integration-test-instructions.md`.

Los escenarios de este documento son especificos a la capa de autenticacion (Unit 6).
