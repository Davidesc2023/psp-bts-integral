# Plan de Code Generation - auth-lambda (Unidad 6)

**Unidad**: Unidad 6 - auth-lambda (`entrevista-auth`)
**Etapa**: CONSTRUCTION - Code Generation
**Creado**: 2026-04-08
**Estado**: COMPLETO

---

## Contexto de la unidad

| Atributo | Valor |
|----------|-------|
| **Stories cubiertas** | US-18 - Authenticate Into Dashboard (2 SP, Must-Have) |
| **Arquitectura** | Supabase Auth + PostgreSQL + Vercel - NO Python Lambda independiente |
| **Dependencias de otras unidades** | COMP-05 (Database Webhook) requiere compliance-lambda - Unit 5 |
| **Que produce esta unidad** | SQL migrations + paquete `packages/entrevista-shared/` (usado por Units 2-5) |

---

## Ubicaciones de codigo

| Tipo | Ruta |
|------|------|
| SQL migrations | `services/entrevista-auth/migrations/` |
| Paquete Python compartido | `packages/entrevista-shared/` |
| Config docs | `services/entrevista-auth/docs/` |
| uv Workspace root | `pyproject.toml` (raiz del polyrepo) |
| Documentacion aidlc | `aidlc-docs/construction/auth-lambda/code/` |

> **Regla**: codigo de aplicacion NUNCA en `aidlc-docs/`. Documentacion NUNCA en rutas de codigo.

---

## Rastreo de stories

| Story | Implementada en paso |
|-------|----------------------|
| US-18 - Authenticate Into Dashboard | Paso 1 (SQL), Paso 6-12 (Python shared modules) |

---

## Pasos de ejecucion

### Paso 1 - Estructura de directorios y archivos vacios
- [x] Crear estructura `packages/entrevista-shared/entrevista_shared/auth/`
- [x] Crear estructura `packages/entrevista-shared/entrevista_shared/db/`
- [x] Crear estructura `packages/entrevista-shared/entrevista_shared/observability/`
- [x] Crear estructura `packages/entrevista-shared/tests/auth/`
- [x] Crear estructura `packages/entrevista-shared/tests/db/`
- [x] Crear estructura `services/entrevista-auth/migrations/`
- [x] Crear estructura `services/entrevista-auth/docs/`

### Paso 2 - SQL Migration 001: tabla `auth_login_attempts`
- [x] Archivo: `services/entrevista-auth/migrations/001_create_auth_login_attempts.sql`
- [x] Tabla `public.auth_login_attempts` con columnas: `user_id`, `ip_address`, `attempt_count`, `last_attempt`, `locked_until`
- [x] Indices: `idx_auth_login_attempts_ip`, `idx_auth_login_attempts_locked` (partial)
- [x] RLS: habilitar RLS + politica para service_role unicamente

### Paso 3 - SQL Migration 002: `hook_before_sign_in`
- [x] Archivo: `services/entrevista-auth/migrations/002_create_hook_before_sign_in.sql`
- [x] Funcion PL/pgSQL `public.hook_before_sign_in(event JSONB)` - SECURITY DEFINER
- [x] Logica: leer `auth_login_attempts`, retornar error 429 si `locked_until > now()`
- [x] Resetear contador si bloqueo expiro

### Paso 4 - SQL Migration 003: `hook_after_sign_in_failure`
- [x] Archivo: `services/entrevista-auth/migrations/003_create_hook_after_failure.sql`
- [x] Funcion PL/pgSQL `public.hook_after_sign_in_failure(event JSONB)` - SECURITY DEFINER
- [x] Logica: incrementar `attempt_count` + aplicar lockout progresivo BR-02
- [x] Tiers: 3-4 -> 15 min, 5-9 -> 30 min, >=10 -> 60 min

### Paso 5 - pyproject.toml del paquete `entrevista-shared`
- [x] Archivo: `packages/entrevista-shared/pyproject.toml`
- [x] Nombre: `entrevista-shared`, version `0.1.0`, Python >= 3.12
- [x] Dependencias: `PyJWT`, `cryptography`, `motor`, `pymongo`, `aws-xray-sdk`, `httpx`
- [x] Build backend: `hatchling`
- [x] Dev extras: `pytest`, `pytest-asyncio`

### Paso 6 - Modulo `supabase_jwt_verifier.py` (COMP-06)
- [x] Archivo: `packages/entrevista-shared/entrevista_shared/auth/supabase_jwt_verifier.py`
- [x] Funcion `verify_supabase_token(token: str) -> dict[str, Any]`
- [x] Cache in-memory del secret con TTL 900s
- [x] Validacion: HS256, claims `sub`+`exp`+`role`, roles `service_role`/`authenticated`

### Paso 7 - Modulo `mongodb_client.py` (COMP-07)
- [x] Archivo: `packages/entrevista-shared/entrevista_shared/db/mongodb_client.py`
- [x] Funcion `get_mongo_client() -> AsyncIOMotorClient`
- [x] Singleton, `retryWrites=True`, `retryReads=True`, timeouts configurados

### Paso 8 - Modulo `retry.py` (COMP-08)
- [x] Archivo: `packages/entrevista-shared/entrevista_shared/db/retry.py`
- [x] Funcion `async with_db_retry(operation) -> T`
- [x] 2 reintentos: 100ms / 300ms, solo `PyMongoError`

### Paso 9 - Modulo `xray_utils.py` (COMP-09)
- [x] Archivo: `packages/entrevista-shared/entrevista_shared/observability/xray_utils.py`
- [x] Context manager async `xray_subsegment(name: str)`
- [x] Captura excepcion y llama `xray_recorder.end_subsegment()` en finally

### Paso 10 - Archivos `__init__.py` del paquete
- [x] `packages/entrevista-shared/entrevista_shared/__init__.py`
- [x] `packages/entrevista-shared/entrevista_shared/auth/__init__.py`
- [x] `packages/entrevista-shared/entrevista_shared/db/__init__.py`
- [x] `packages/entrevista-shared/entrevista_shared/observability/__init__.py`
- [x] `packages/entrevista-shared/tests/__init__.py`
- [x] `packages/entrevista-shared/tests/auth/__init__.py`
- [x] `packages/entrevista-shared/tests/db/__init__.py`

### Paso 11 - Tests unitarios: `test_supabase_jwt_verifier.py`
- [x] Archivo: `packages/entrevista-shared/tests/auth/test_supabase_jwt_verifier.py`
- [x] Test: token valido retorna payload correcto
- [x] Test: token expirado lanza `InvalidTokenError`
- [x] Test: token con algoritmo incorrecto (RS256) lanza `InvalidTokenError`
- [x] Test: token con role no permitido lanza `InvalidTokenError`
- [x] Test: `SUPABASE_JWT_SECRET` no configurada lanza `RuntimeError`
- [x] Test: cache hit - segundo call no re-lee env var (mock de `os.environ.get`)

### Paso 12 - Tests unitarios: `test_retry.py`
- [x] Archivo: `packages/entrevista-shared/tests/db/test_retry.py`
- [x] Test: operacion exitosa al primer intento - sin reintentos
- [x] Test: falla 1 vez -> exito en 2do intento
- [x] Test: falla 3 veces -> lanza `PyMongoError` al final
- [x] Test: error no-PyMongo (ValueError) - se propaga inmediatamente sin reintentos

### Paso 13 - `pytest.ini` / configuracion de tests
- [x] Archivo: `packages/entrevista-shared/pytest.ini`
- [x] `asyncio_mode = auto` para pytest-asyncio
- [x] `testpaths = tests`

### Paso 14 - `pyproject.toml` raiz del polyrepo (uv workspace)
- [x] Archivo: `pyproject.toml` (en raiz: `agentic_interviewer_ai/`)
- [x] Seccion `[tool.uv.workspace]` con members: `packages/entrevista-shared`
- [x] Nota: se iran agregando `services/*` a medida que se generen otras unidades

### Paso 15 - Checklist de configuracion Supabase
- [x] Archivo: `services/entrevista-auth/docs/supabase-config-checklist.md`
- [x] Checklist de 15 items para prod y staging
- [x] Incluir comandos Supabase CLI donde aplique

### Paso 16 - README de `services/entrevista-auth/`
- [x] Archivo: `services/entrevista-auth/README.md`
- [x] Descripcion del componente, estructura de archivos, como ejecutar migraciones
- [x] Variables de entorno requeridas

### Paso 17 - Documentacion de codigo en aidlc-docs
- [x] Archivo: `aidlc-docs/construction/auth-lambda/code/code-summary.md`
- [x] Indice de archivos generados con rutas y descripcion
- [x] Story traceability (US-18)
- [x] Cobertura de tests esperada

---

## Nota arquitectonica recordatorio

Auth-lambda **no es un servicio Python deployado**. El codigo generado es:
1. Scripts SQL para ejecutar con Supabase CLI -> habilitar brute force protection (GAP-01)
2. Modulos Python en `packages/entrevista-shared/` -> consumidos como libreria por otros lambdas

US-18 se implementa mediante la **configuracion de Supabase Auth** (JWT, hooks) documentada en el checklist + los modulos `supabase_jwt_verifier` que los lambdas receptores usan para verificar tokens.
