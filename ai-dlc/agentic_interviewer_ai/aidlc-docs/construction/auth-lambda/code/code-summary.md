# Resumen de Code Generation — auth-lambda (Unidad 6)

**Generado**: 2026-04-08
**Stories implementadas**: US-18 — Authenticate Into Dashboard ✅

---

## Archivos generados

### SQL Migrations — `services/entrevista-auth/migrations/`

| Archivo | Descripción |
|---------|-------------|
| `001_create_auth_login_attempts.sql` | Tabla `public.auth_login_attempts` + índices + RLS (COMP-01) |
| `002_create_hook_before_sign_in.sql` | PL/pgSQL `hook_before_sign_in` — bloquea si locked (COMP-02) |
| `003_create_hook_after_failure.sql` | PL/pgSQL `hook_after_sign_in_failure` — lockout progresivo BR-02 (COMP-03) |

### Paquete Python — `packages/entrevista-shared/`

| Archivo | Descripción |
|---------|-------------|
| `pyproject.toml` | Definición del paquete, dependencias, build (hatchling) |
| `pytest.ini` | Configuración pytest con `asyncio_mode = auto` |
| `entrevista_shared/__init__.py` | Raíz del paquete |
| `entrevista_shared/auth/__init__.py` | Re-export de `verify_supabase_token` |
| `entrevista_shared/auth/supabase_jwt_verifier.py` | Verificación JWT HS256 + cache in-memory (COMP-06) |
| `entrevista_shared/db/__init__.py` | Re-exports de `get_mongo_client`, `with_db_retry` |
| `entrevista_shared/db/mongodb_client.py` | Cliente Motor singleton con retry driver-level (COMP-07) |
| `entrevista_shared/db/retry.py` | Retry manual ligero 3 intentos, 100ms/300ms (COMP-08) |
| `entrevista_shared/observability/__init__.py` | Re-export de `xray_subsegment` |
| `entrevista_shared/observability/xray_utils.py` | Context manager async para X-Ray (COMP-09) |

### Tests — `packages/entrevista-shared/tests/`

| Archivo | Tests | Descripción |
|---------|-------|-------------|
| `tests/auth/test_supabase_jwt_verifier.py` | 7 | Token válido, expirado, RS256, role no permitido, env var faltante, cache hit |
| `tests/db/test_retry.py` | 5 | Éxito primer intento, éxito 2do intento, agotamiento, delays, error no-PyMongo |

**Total tests generados**: 12

### Workspace y configuración raíz

| Archivo | Descripción |
|---------|-------------|
| `pyproject.toml` (raíz) | `[tool.uv.workspace]` con `packages/entrevista-shared` |

### Documentación — `services/entrevista-auth/`

| Archivo | Descripción |
|---------|-------------|
| `docs/supabase-config-checklist.md` | 9 pasos de configuración (migraciones, hooks, JWT, SMTP, webhook, Secrets Manager, Vercel, verificación E2E) |
| `README.md` | Descripción del componente, estructura, uso del paquete compartido |

---

## Story traceability

| Story | Componentes | Estado |
|-------|-------------|--------|
| US-18 — Authenticate Into Dashboard | SQL migrations 001–003 (brute force) + `supabase_jwt_verifier` (verificación JWT en receptores) + checklist Supabase configuración | ✅ Implementada |

---

## Cobertura de tests esperada

| Módulo | Tests | Escenarios clave cubiertos |
|--------|-------|---------------------------|
| `supabase_jwt_verifier` | 7 | Token válido/inválido/expirado, roles, config, cache |
| `retry` | 5 | Éxito, retries, agotamiento, delays, error propagation |

> Los tests de integración (requieren conexión real a Supabase/MongoDB) serán ejecutados en la etapa Build & Test.
