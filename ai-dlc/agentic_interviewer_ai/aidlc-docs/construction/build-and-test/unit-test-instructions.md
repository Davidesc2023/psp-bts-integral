# Unit Test Execution - auth-lambda (Unit 6)

**Suite**: `packages/entrevista-shared/`
**Framework**: pytest + pytest-asyncio
**Total tests esperados**: 12 (7 + 5)

---

## Tests disponibles

### Suite 1: `tests/auth/test_supabase_jwt_verifier.py` — 7 tests

| Test class | Test | Que valida |
|------------|------|------------|
| `TestVerifySupabaseTokenSuccess` | `test_valid_authenticated_token` | Token HS256 valido con role=authenticated retorna payload |
| `TestVerifySupabaseTokenSuccess` | `test_valid_service_role_token` | Token HS256 valido con role=service_role retorna payload |
| `TestVerifySupabaseTokenInvalidToken` | `test_expired_token` | Token expirado lanza `jwt.InvalidTokenError` |
| `TestVerifySupabaseTokenInvalidToken` | `test_wrong_algorithm` | Token RS256 lanza `jwt.InvalidTokenError` |
| `TestVerifySupabaseTokenInvalidToken` | `test_disallowed_role` | Role "anon" lanza `jwt.InvalidTokenError` |
| `TestVerifySupabaseTokenInvalidToken` | `test_tampered_token` | Token con firma invalida lanza `jwt.InvalidTokenError` |
| `TestVerifySupabaseTokenConfig` | `test_missing_env_var` | Sin `SUPABASE_JWT_SECRET` lanza `RuntimeError` |

### Suite 2: `tests/db/test_retry.py` — 5 tests

| Test class | Test | Que valida |
|------------|------|------------|
| `TestWithDbRetrySuccess` | `test_success_first_attempt` | Exito en primer intento — 0 sleeps |
| `TestWithDbRetrySuccess` | `test_success_second_attempt` | Fallo + exito en 2do intento — 1 sleep de 100ms |
| `TestWithDbRetryExhausted` | `test_all_three_fail` | 3 fallos consecutivos — relanza `PyMongoError` |
| `TestWithDbRetryExhausted` | `test_retry_delays` | Verifica delays exactos: [0.1, 0.3] segundos |
| `TestWithDbRetryNonMongoError` | `test_non_mongo_error_propagates` | `ValueError` se propaga sin reintentos |

---

## Como ejecutar los tests

### 1. Prerequisito: build completado

```bash
# Desde la raiz del workspace
cd agentic_interviewer_ai/
uv sync
```

### 2. Configurar variable de entorno para tests JWT

```bash
# macOS / Linux
export SUPABASE_JWT_SECRET="test-secret-key-at-least-32-characters-long"

# Windows (PowerShell)
$env:SUPABASE_JWT_SECRET = "test-secret-key-at-least-32-characters-long"
```

> **Nota**: El valor debe tener al menos 32 caracteres para que PyJWT lo acepte con HS256.

### 3. Ejecutar TODOS los tests

```bash
# Desde la raiz del workspace (uv run asegura el .venv correcto)
uv run pytest packages/entrevista-shared/ -v
```

**Output esperado**:
```
========================= test session starts ==========================
platform linux -- Python 3.12.x, pytest-8.x.x
asyncio_mode: auto
collected 12 items

packages/entrevista-shared/tests/auth/test_supabase_jwt_verifier.py::TestVerifySupabaseTokenSuccess::test_valid_authenticated_token PASSED
packages/entrevista-shared/tests/auth/test_supabase_jwt_verifier.py::TestVerifySupabaseTokenSuccess::test_valid_service_role_token PASSED
packages/entrevista-shared/tests/auth/test_supabase_jwt_verifier.py::TestVerifySupabaseTokenInvalidToken::test_expired_token PASSED
packages/entrevista-shared/tests/auth/test_supabase_jwt_verifier.py::TestVerifySupabaseTokenInvalidToken::test_wrong_algorithm PASSED
packages/entrevista-shared/tests/auth/test_supabase_jwt_verifier.py::TestVerifySupabaseTokenInvalidToken::test_disallowed_role PASSED
packages/entrevista-shared/tests/auth/test_supabase_jwt_verifier.py::TestVerifySupabaseTokenInvalidToken::test_tampered_token PASSED
packages/entrevista-shared/tests/auth/test_supabase_jwt_verifier.py::TestVerifySupabaseTokenConfig::test_missing_env_var PASSED
packages/entrevista-shared/tests/db/test_retry.py::TestWithDbRetrySuccess::test_success_first_attempt PASSED
packages/entrevista-shared/tests/db/test_retry.py::TestWithDbRetrySuccess::test_success_second_attempt PASSED
packages/entrevista-shared/tests/db/test_retry.py::TestWithDbRetryExhausted::test_all_three_fail PASSED
packages/entrevista-shared/tests/db/test_retry.py::TestWithDbRetryExhausted::test_retry_delays PASSED
packages/entrevista-shared/tests/db/test_retry.py::TestWithDbRetryNonMongoError::test_non_mongo_error_propagates PASSED

========================= 12 passed in [X.Xs] ==========================
```

### 4. Ejecutar solo una suite

```bash
# Solo tests de auth
uv run pytest packages/entrevista-shared/tests/auth/ -v

# Solo tests de db/retry
uv run pytest packages/entrevista-shared/tests/db/ -v
```

### 5. Ejecutar con coverage report

```bash
# Instalar coverage si no esta
uv add --dev pytest-cov --directory packages/entrevista-shared

# Ejecutar con coverage
uv run pytest packages/entrevista-shared/ -v --cov=entrevista_shared --cov-report=term-missing

# Output adicional esperado:
# ---------- coverage: platform ... -----------
# Name                                                           Stmts   Miss  Cover
# packages/entrevista-shared/entrevista_shared/auth/supabase_jwt_verifier.py   XX    X    >85%
# packages/entrevista-shared/entrevista_shared/db/retry.py                     XX    X    >90%
```

**Cobertura objetivo**: >= 80% en los modulos criticos (supabase_jwt_verifier, retry)

---

## Interpretar resultados

### Todos los tests pasan ✅
- Continuar a Integration Tests y Security Tests
- Registrar resultado en build-and-test-summary.md

### Tests fallan con `RuntimeError: SUPABASE_JWT_SECRET not set`
```bash
# Verificar que la variable esta seteada
echo $SUPABASE_JWT_SECRET   # macOS/Linux
echo $env:SUPABASE_JWT_SECRET  # Windows PowerShell
```

### Tests fallan con `asyncio` errors
```bash
# Verificar pytest.ini esta presente y tiene asyncio_mode=auto
cat packages/entrevista-shared/pytest.ini
# Debe mostrar: asyncio_mode = auto
```

### Tests de retry fallan por timing
```bash
# Si el test de delays falla por precision, puede ser problema de sistema lento
# Verificar: test usa mock de asyncio.sleep, no sleep real
# El test NUNCA deberia ser flaky si usa mock correctamente
```

### Test de cache hit falla
```bash
# El modulo supabase_jwt_verifier tiene cache global _SUPABASE_JWT_SECRET
# Si los tests se ejecutan en orden diferente, el cache puede estar caliente
# Solucion: asegurar que test_missing_env_var use monkeypatch.delenv
```

---

## Metricas objetivo

| Metrica | Objetivo | Critico |
|---------|---------|---------|
| Tests pasando | 12/12 (100%) | >= 11/12 |
| Cobertura `auth/` | >= 85% | >= 70% |
| Cobertura `db/` | >= 90% | >= 75% |
| Tiempo de ejecucion | < 5s | < 30s |
| Tests flaky | 0 | 0 |
