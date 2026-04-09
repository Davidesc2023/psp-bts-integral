# Diseño de Infraestructura — auth-lambda (Unidad 6)

**Unidad**: Unidad 6 — auth-lambda (`entrevista-auth`)
**Generado**: 2026-04-07
**Arquitectura de producción**: Supabase Auth + PostgreSQL (Supabase) + Vercel

---

## Resumen ejecutivo

`auth-lambda` no es un servicio Python desplegado independientemente. Es un conjunto de:
1. **Configuración de plataforma Supabase** — hooks, JWT, webhooks
2. **Módulos Python compartidos** (`packages/entrevista-shared/`) — usados por todos los lambdas Python receptores de JWT
3. **Scripts SQL de migración** — tabla `auth_login_attempts`, funciones PL/pgSQL

No hay Lambda function de AWS, no hay contenedor, no hay API Gateway propia para este componente.

---

## Mapa de Componentes → Servicios de Infraestructura

| Componente Lógico | Servicio de Infraestructura | Tipo | Entorno |
|-------------------|---------------------------|------|---------|
| COMP-01 `auth_login_attempts` | **Supabase PostgreSQL** — tabla `public.auth_login_attempts` | Base de datos gestionada | Producción / Staging |
| COMP-02 `hook_before_sign_in` | **Supabase Auth Hook** (PostgreSQL Function) | Función PL/pgSQL | Producción / Staging |
| COMP-03 `hook_after_sign_in_failure` | **Supabase Auth Hook** (PostgreSQL Function) | Función PL/pgSQL | Producción / Staging |
| COMP-04 Config JWT 15 min | **Supabase Dashboard** — Authentication Settings | Configuración de plataforma | Producción / Staging |
| COMP-05 Database Webhook | **Supabase Database Webhooks** → compliance-lambda | Webhook HTTP | Producción / Staging |
| COMP-06 `supabase_jwt_verifier` | **`packages/entrevista-shared/`** (paquete Python local) | Código compartido | Build time |
| COMP-07 `mongodb_client` | **`packages/entrevista-shared/`** | Código compartido | Build time |
| COMP-08 `with_db_retry` | **`packages/entrevista-shared/`** | Código compartido | Build time |
| COMP-09 `xray_utils` | **`packages/entrevista-shared/`** | Código compartido | Build time |

---

## Infraestructura Supabase

### Proyecto Supabase

| Atributo | Valor |
|----------|-------|
| **Provider** | Supabase Cloud (supabase.com) |
| **Plan mínimo** | Pro (para Database Webhooks + Auth Hooks en producción) |
| **Región** | `sa-east-1` (São Paulo) — más cercana a Colombia |
| **Instancias** | 2: `entrevista-prod` + `entrevista-staging` |
| **PostgreSQL version** | 15 (gestionado por Supabase) |

### Configuración de autenticación

```
Authentication > Settings > JWT:
  JWT Expiry:                  900 (15 min)
  Refresh Token Duration:      604800 (7 días)
  Refresh Token Rotation:      true
  Detect Reuse:                true

Authentication > Settings > SMTP:
  Custom SMTP server:          sí (para emails de reset de contraseña en producción)
  From email:                  no-reply@entrevista.ai
  From name:                   EntreVista AI

Authentication > URL Configuration:
  Site URL:                    https://app.entrevista.ai
  Additional Redirect URLs:    https://staging.entrevista.ai
```

### Hooks de autenticación

```
Authentication > Hooks:
  Hook type:    Before Sign In
  Schema:       public
  Function:     hook_before_sign_in

  Hook type:    After Sign In Failure  (si disponible en versión de Supabase)
  Schema:       public
  Function:     hook_after_sign_in_failure
```

> **Nota**: Si Supabase Auth no expone un hook `after_sign_in_failure` nativo, el incremento de contador se implementa vía trigger PostgreSQL en `auth.audit_log_entries` WHERE `payload->>'action' = 'login_failed'`.

### Database Webhook

```
Supabase Dashboard > Database > Webhooks:
  Name:          audit-to-compliance
  Table:         auth.audit_log_entries
  Events:        INSERT
  HTTP URL:      {COMPLIANCE_LAMBDA_URL}/webhook/auth-event
  HTTP Method:   POST
  Headers:
    x-webhook-secret: {WEBHOOK_SECRET}
  Timeout:       5000 ms
```

---

## Paquete Python Compartido

### Estructura en el polyrepo

```
entrevista-ai/                          ← raíz del polyrepo
├── packages/
│   └── entrevista-shared/              ← COMP-06, 07, 08, 09
│       ├── pyproject.toml
│       ├── README.md
│       └── entrevista_shared/
│           ├── __init__.py
│           ├── auth/
│           │   ├── __init__.py
│           │   └── supabase_jwt_verifier.py    ← COMP-06
│           ├── db/
│           │   ├── __init__.py
│           │   ├── mongodb_client.py           ← COMP-07
│           │   └── retry.py                    ← COMP-08
│           └── observability/
│               ├── __init__.py
│               └── xray_utils.py               ← COMP-09
├── services/
│   ├── entrevista-auth/                ← Unit 6 (scripts SQL + docs)
│   ├── compliance-lambda/              ← Unit 5
│   ├── campaign-lambda/                ← Unit 4
│   ├── evaluation-lambda/              ← Unit 3
│   ├── conversation-lambda/            ← Unit 2
│   └── telegram-bot/                   ← Unit 1
└── dashboard/                          ← Unit 7
```

### `pyproject.toml` del paquete compartido

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "entrevista-shared"
version = "0.1.0"
description = "Módulos compartidos para lambdas de EntreVista AI"
requires-python = ">=3.12"
dependencies = [
    "PyJWT>=2.8.0",
    "cryptography>=42.0.0",
    "motor>=3.3.0",
    "pymongo>=4.6.0",
    "aws-xray-sdk>=2.12.0",
    "httpx>=0.27.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
]
```

### Instalación en cada lambda

```toml
# services/compliance-lambda/pyproject.toml
[project]
dependencies = [
    "entrevista-shared",
    # ... otras dependencias del lambda
]

[tool.uv.sources]
entrevista-shared = { workspace = true }
```

> **Gestión de dependencias**: `uv` soporta workspaces nativamente — la raíz `pyproject.toml` declara los miembros del workspace y `uv` resuelve `entrevista-shared` como dependencia local sin necesidad de PyPI privado.

### Workspace root

```toml
# entrevista-ai/pyproject.toml  (raíz del polyrepo)
[tool.uv.workspace]
members = [
    "packages/entrevista-shared",
    "services/compliance-lambda",
    "services/campaign-lambda",
    "services/evaluation-lambda",
    "services/conversation-lambda",
]
```

---

## Migraciones SQL

Los scripts de migración para los componentes de base de datos se almacenan en:

```
services/entrevista-auth/
├── migrations/
│   ├── 001_create_auth_login_attempts.sql      ← tabla + índices (COMP-01)
│   ├── 002_create_hook_before_sign_in.sql      ← function PL/pgSQL (COMP-02)
│   └── 003_create_hook_after_failure.sql       ← function PL/pgSQL (COMP-03)
└── docs/
    └── supabase-config-checklist.md            ← guía para configurar Dashboard
```

**Herramienta de ejecución**: Supabase CLI (`supabase db push`) o Supabase Dashboard SQL Editor.

---

## Variables de Entorno por Servicio

### `packages/entrevista-shared` (en tiempo de ejecución del lambda que lo importa)

| Variable | Descripción | Secreto |
|----------|-------------|---------|
| `SUPABASE_JWT_SECRET` | Secret HS256 para verificación JWT | ✅ (AWS Secrets Manager) |
| `MONGODB_URI` | URI con credenciales de MongoDB Atlas | ✅ (AWS Secrets Manager) |
| `COMPLIANCE_LAMBDA_URL` | URL HTTP del endpoint de compliance | ⬜ (env var estándar) |

### Supabase (base de datos)

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL del proyecto (`https://{ref}.supabase.co`) |
| `SUPABASE_ANON_KEY` | Clave pública para clientes (dashboard) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio para admin operations (lambdas) |

---

## Entornos

| Entorno | Proyecto Supabase | Dashboard URL | Rama Git |
|---------|-------------------|---------------|----------|
| **Producción** | `entrevista-prod` | `https://app.entrevista.ai` | `main` |
| **Staging** | `entrevista-staging` | `https://staging.entrevista.ai` | `staging` |
| **Desarrollo local** | Supabase local (CLI) | `http://localhost:54323` | cualquiera |

### Supabase local (desarrollo)

```bash
# Iniciar instancia local
supabase start

# Aplicar migraciones
supabase db push

# URL local: http://localhost:54321
# JWT Secret local: super-secret-jwt-token-with-at-least-32-characters-long
```

---

## Infraestructura excluida de esta unidad

| Item | Razón |
|------|-------|
| AWS Lambda (Python) | auth-lambda no es un servicio Python deployado |
| AWS API Gateway | No aplica — Supabase expone sus propios endpoints |
| AWS ECR / ECS / Fargate | No aplica para esta unidad |
| Redis / ElastiCache | Descartado en NFR Design — in-memory cache es suficiente para MVP |
| CDN / CloudFront | Gestionado por Vercel para el dashboard |
