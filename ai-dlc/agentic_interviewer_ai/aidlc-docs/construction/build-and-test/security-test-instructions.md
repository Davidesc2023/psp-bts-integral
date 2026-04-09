# Security Test Instructions - auth-lambda (Unit 6)

**Scope**: Validar que el paquete `entrevista-shared` y las SQL migrations no introducen vulnerabilidades de seguridad.

**Relevancia**: Esta unidad es critica — maneja autenticacion JWT y proteccion contra brute force. Las pruebas de seguridad son OBLIGATORIAS antes de ir a produccion.

---

## 1. Dependency Security Scan

### 1.1 Scan con pip-audit (OWASP dependency check)

```bash
# Instalar pip-audit
uv add --dev pip-audit --directory packages/entrevista-shared

# Ejecutar scan de dependencias
uv run pip-audit --directory packages/entrevista-shared/

# Alternativa: scan del entorno completo
uv run pip-audit
```

**Resultado esperado**: `No known vulnerabilities found`

**Si hay vulnerabilidades**:
```
Found X known vulnerabilities in Y packages:
Name          Version  ID             Fix Versions
PyJWT         2.x.x    GHSA-xxxx-xxx  3.x.x
```
- Actualizar la dependencia en `packages/entrevista-shared/pyproject.toml` a la version con fix
- Re-ejecutar el scan hasta limpieza
- Nunca ignorar vulnerabilidades HIGH o CRITICAL

### 1.2 Scan con Safety (alternativa)

```bash
pip install safety
safety check --file packages/entrevista-shared/pyproject.toml
```

---

## 2. Static Code Analysis (Bandit)

Bandit detecta patrones inseguros en codigo Python.

```bash
# Instalar bandit
uv add --dev bandit --directory packages/entrevista-shared

# Scan de los modulos del paquete
uv run bandit -r packages/entrevista-shared/entrevista_shared/ -ll

# Con reporte detallado
uv run bandit -r packages/entrevista-shared/entrevista_shared/ -f txt -o bandit-report.txt
```

**Resultado esperado**: 0 issues de severidad HIGH o MEDIUM

**Issues conocidos / aceptables**:
| Issue | Modulo | Razon de aceptacion |
|-------|--------|---------------------|
| B105 (hardcoded password) | tests/ | Solo en tests con valores mock |

**Issues que NO son aceptables**:
- B101 (assert used as security check) en codigo de produccion
- B106 (hardcoded password) en modulos de `entrevista_shared/`
- B501/B502 (weak cryptographic algorithms)
- B608 (SQL injection)

---

## 3. JWT Security Validation

Verificar que el `supabase_jwt_verifier` rechaza todos los ataques JWT conocidos.

### 3.1 Algorithm confusion attack (alg=none)

```bash
SUPABASE_JWT_SECRET="test-secret-32-chars-minimum-here" \
uv run python3 -c "
from entrevista_shared.auth.supabase_jwt_verifier import verify_supabase_token
import jwt, time

# Construir token con alg=none
header = {'alg': 'none', 'typ': 'JWT'}
payload = {'sub': 'fake-user', 'role': 'service_role', 'exp': int(time.time()) + 3600}

# Firmar con algoritmo none (no requiere clave)
fake_token = jwt.encode(payload, '', algorithm='none')
print('Token alg=none:', fake_token[:50])

try:
    result = verify_supabase_token(fake_token)
    print('ERROR: Token debio ser rechazado!')
    exit(1)
except Exception as e:
    print('OK: Token rechazado -', type(e).__name__)
"
```

**Resultado esperado**: `OK: Token rechazado - InvalidTokenError`

### 3.2 RS256 algorithm confusion attack

```bash
SUPABASE_JWT_SECRET="test-secret-32-chars-minimum-here" \
uv run python3 -c "
from entrevista_shared.auth.supabase_jwt_verifier import verify_supabase_token
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
import jwt, time

# Generar par de claves RSA para el ataque
private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend())
payload = {'sub': 'attacker', 'role': 'service_role', 'exp': int(time.time()) + 3600}
fake_token = jwt.encode(payload, private_key, algorithm='RS256')

try:
    result = verify_supabase_token(fake_token)
    print('ERROR: Token RS256 debio ser rechazado!')
    exit(1)
except Exception as e:
    print('OK: Token RS256 rechazado -', type(e).__name__)
"
```

**Resultado esperado**: `OK: Token RS256 rechazado - InvalidTokenError`

### 3.3 Privilege escalation via role manipulation

```bash
SUPABASE_JWT_SECRET="test-secret-32-chars-minimum-here" \
uv run python3 -c "
from entrevista_shared.auth.supabase_jwt_verifier import verify_supabase_token
import jwt, time, os

secret = os.environ['SUPABASE_JWT_SECRET']

# Intentar usar role=anon (no permitido)
payload = {'sub': 'user123', 'role': 'anon', 'exp': int(time.time()) + 3600}
anon_token = jwt.encode(payload, secret, algorithm='HS256')

try:
    result = verify_supabase_token(anon_token)
    print('ERROR: Role anon debio ser rechazado!')
    exit(1)
except Exception as e:
    print('OK: Role anon rechazado -', type(e).__name__)

# Intentar role=admin (no permitido)
payload['role'] = 'admin'
admin_token = jwt.encode(payload, secret, algorithm='HS256')
try:
    result = verify_supabase_token(admin_token)
    print('ERROR: Role admin debio ser rechazado!')
    exit(1)
except Exception as e:
    print('OK: Role admin rechazado -', type(e).__name__)
"
```

**Resultado esperado**:
```
OK: Role anon rechazado - InvalidTokenError
OK: Role admin rechazado - InvalidTokenError
```

### 3.4 Expired token no debe ser aceptado

```bash
SUPABASE_JWT_SECRET="test-secret-32-chars-minimum-here" \
uv run python3 -c "
from entrevista_shared.auth.supabase_jwt_verifier import verify_supabase_token
import jwt, time, os

secret = os.environ['SUPABASE_JWT_SECRET']
payload = {'sub': 'user123', 'role': 'authenticated', 'exp': int(time.time()) - 3600}  # ya expiro
expired_token = jwt.encode(payload, secret, algorithm='HS256')

try:
    result = verify_supabase_token(expired_token)
    print('ERROR: Token expirado debio ser rechazado!')
    exit(1)
except Exception as e:
    print('OK: Token expirado rechazado -', type(e).__name__)
"
```

**Resultado esperado**: `OK: Token expirado rechazado - ExpiredSignatureError` o `InvalidTokenError`

---

## 4. SQL Injection en PL/pgSQL

Revisar manualmente las migrations para confirmar que no hay interpolacion directa de strings de input del usuario.

### Checklist de revision de SQL

Archivo `001_create_auth_login_attempts.sql`:
- [ ] No usa `EXECUTE format(...)` con input del usuario sin sanitizar
- [ ] RLS configurado — service_role ONLY
- [ ] No expone datos a `authenticated` ni `anon`

Archivo `002_create_hook_before_sign_in.sql`:
- [ ] Extrae `user_id` del JSON con `->>'user_id'` (tipo-seguro)
- [ ] Usa queries parametrizadas o variables PL/pgSQL (no concatenacion)
- [ ] `SECURITY DEFINER` solo ejecuta queries predefinidos

Archivo `003_create_hook_after_failure.sql`:
- [ ] Mismo analisis — no concatena input del evento en SQL
- [ ] `ON CONFLICT DO UPDATE` es seguro (solo actualiza columnas especificas)

**Comando de revision rapida**:
```bash
# Buscar patrones inseguros: EXECUTE con || (concatenacion de strings)
grep -n "EXECUTE.*||" services/entrevista-auth/migrations/*.sql
# Resultado esperado: sin salida (0 matches)

# Buscar format() sin %L o %I (podria ser inseguro)
grep -n "format(" services/entrevista-auth/migrations/*.sql
# Revisar manualmente cualquier match
```

---

## 5. Secrets Management Verification

```bash
# Verificar que NO hay secrets hardcodeados en el codigo
grep -r "supabase_jwt_secret\|mongodb_uri\|webhook_secret" \
  packages/entrevista-shared/entrevista_shared/ \
  --include="*.py" -i
# Resultado esperado: sin matches en variables hardcodeadas

# Verificar que .env no esta siendo commitido
cat .gitignore | grep -E "\.env|secrets"
# Si no aparece, agregar .env a .gitignore ANTES de hacer commit
```

---

## 6. Resumen de criterios de seguridad

| Check | Herramienta | Criterio de aprobacion |
|-------|-------------|----------------------|
| CVEs en dependencias | pip-audit | 0 HIGH/CRITICAL |
| Static analysis Python | bandit | 0 HIGH, 0 MEDIUM |
| alg=none attack | pytest manual | Rechazado correctamente |
| RS256 confusion | pytest manual | Rechazado correctamente |
| Role privilege escalation | pytest manual | anon/admin rechazados |
| Token expirado | pytest manual | Rechazado correctamente |
| SQL injection en PL/pgSQL | Revision manual | 0 concatenaciones inseguras |
| Secrets en codigo | grep | 0 hardcoded secrets |

**Todos los checks deben pasar antes del go-live en produccion.**
