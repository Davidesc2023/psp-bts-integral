# entrevista-auth

Componente de autenticación de EntreVista AI. Implementado sobre **Supabase Auth** — no es un servicio Python independiente.

## Responsabilidades

- Autenticación de operadores (login, logout, refresh token) vía Supabase Auth
- Protección contra fuerza bruta con lockout progresivo (BR-02) usando PostgreSQL Hooks
- Emisión de JWT HS256 con TTL de 15 minutos
- Auditoría de eventos de autenticación → compliance-lambda (Ley 1581/2012)

## Story cubierta

| Story | Descripción |
|-------|-------------|
| **US-18** | Authenticate Into Dashboard — operadores se autentican con email/contraseña y obtienen JWT |

## Estructura

```
services/entrevista-auth/
├── migrations/
│   ├── 001_create_auth_login_attempts.sql   # Tabla de seguimiento de intentos
│   ├── 002_create_hook_before_sign_in.sql   # Hook que bloquea si locked
│   └── 003_create_hook_after_failure.sql    # Hook que incrementa contador
└── docs/
    └── supabase-config-checklist.md         # Guía paso a paso de configuración
```

## Cómo aplicar las migraciones

### Prerequisito

```bash
npm install -g supabase
supabase login
```

### Aplicar en staging

```bash
supabase db push --project-ref <STAGING_PROJECT_REF>
```

### Aplicar en producción

```bash
supabase db push --project-ref <PROD_PROJECT_REF>
```

> Ver `docs/supabase-config-checklist.md` para la guía completa incluyendo configuración de hooks, JWT settings, SMTP y Secrets Manager.

## Variables de entorno requeridas

Los lambdas Python que consumen JWT de Supabase necesitan:

| Variable | Descripción | Almacenamiento |
|----------|-------------|----------------|
| `SUPABASE_JWT_SECRET` | Secret HS256 para verificación JWT | AWS Secrets Manager |
| `SUPABASE_URL` | URL del proyecto Supabase | Env var |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (admin ops) | AWS Secrets Manager |

El dashboard (Vercel) necesita:

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima pública |

## Paquete Python compartido

Los módulos de verificación JWT y utilidades están en:

```
packages/entrevista-shared/entrevista_shared/
├── auth/supabase_jwt_verifier.py   # verify_supabase_token()
├── db/mongodb_client.py            # get_mongo_client()
├── db/retry.py                     # with_db_retry()
└── observability/xray_utils.py     # xray_subsegment()
```

Para usar en otro lambda:

```toml
# services/mi-lambda/pyproject.toml
[tool.uv.sources]
entrevista-shared = { workspace = true }
```

```python
from entrevista_shared.auth import verify_supabase_token

payload = verify_supabase_token(request.headers["Authorization"].removeprefix("Bearer "))
```
