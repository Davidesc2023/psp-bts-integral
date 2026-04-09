# Arquitectura de Deployment — auth-lambda (Unidad 6)

**Unidad**: Unidad 6 — auth-lambda (`entrevista-auth`)
**Generado**: 2026-04-07

---

## Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCCIÓN                                         │
│                                                                                 │
│  ┌──────────────┐     HTTPS      ┌─────────────────────────────────────────┐   │
│  │   Operadora  │ ─────────────► │           Vercel (SPA)                  │   │
│  │  (browser)   │                │   dashboard.entrevista.ai               │   │
│  └──────────────┘                │   React 18 + Supabase JS SDK            │   │
│                                  └────────────┬────────────────────────────┘   │
│                                               │ supabase.auth.*()              │
│                                               ▼                                │
│                           ┌──────────────────────────────────┐                 │
│                           │        Supabase Auth             │                 │
│                           │   entrevista-prod.supabase.co    │                 │
│                           │                                  │                 │
│                           │  signInWithPassword() ──────────►│                 │
│                           │      │                           │                 │
│                           │      ▼ hook_before_sign_in       │                 │
│                           │  ┌─────────────────────────┐    │                 │
│                           │  │  public.auth_login_      │    │                 │
│                           │  │  attempts (PostgreSQL)   │    │                 │
│                           │  │                         │    │                 │
│                           │  │  Lockout progresivo:    │    │                 │
│                           │  │  3-4 intentos → 15 min  │    │                 │
│                           │  │  5-9 intentos → 30 min  │    │                 │
│                           │  │  ≥10 intentos → 60 min  │    │                 │
│                           │  └─────────────────────────┘    │                 │
│                           │                                  │                 │
│                           │  JWT (HS256, 15 min TTL) ◄───── │                 │
│                           │  Refresh Token (7 días)          │                 │
│                           └──────────┬───────────────────────┘                │
│                                      │                                         │
│                           ┌──────────▼───────────────────────┐                 │
│                           │    auth.audit_log_entries         │                 │
│                           │    (INSERT trigger)               │                 │
│                           └──────────┬───────────────────────┘                 │
│                                      │ Database Webhook (HTTP POST)            │
│                                      ▼                                         │
│                           ┌──────────────────────────────────┐                 │
│                           │      compliance-lambda           │                 │
│                           │      (Unit 5 — AWS Lambda)       │                 │
│                           │   POST /webhook/auth-event       │                 │
│                           └──────────────────────────────────┘                 │
│                                                                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                     Python Lambdas (Units 2–5) que consumen JWT              │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │              packages/entrevista-shared  (instalado como dep)            │  │
│  │                                                                          │  │
│  │  ┌──────────────────────┐   ┌──────────────────────┐                    │  │
│  │  │ supabase_jwt_verifier│   │   mongodb_client     │                    │  │
│  │  │ verify_supabase_     │   │   + with_db_retry    │                    │  │
│  │  │ token(token) → dict  │   │   Motor async        │                    │  │
│  │  └──────────────────────┘   └──────────────────────┘                    │  │
│  │                                                                          │  │
│  │  ┌──────────────────────┐                                                │  │
│  │  │    xray_utils        │                                                │  │
│  │  │ xray_subsegment(name)│ ──► AWS X-Ray                                 │  │
│  │  └──────────────────────┘                                                │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Flujo de deployment

### 1. Migraciones Supabase (one-time + per-change)

```
Desarrollador
    │
    ├── Edita services/entrevista-auth/migrations/*.sql
    │
    └── Ejecuta: supabase db push --project-ref {ref}
                    │
                    ▼
               Supabase PostgreSQL
               (tabla auth_login_attempts + hooks PL/pgSQL)
```

### 2. Configuración del Dashboard Supabase (one-time)

```
Admin
    │
    ├── Authentication > Settings: JWT Expiry, Rotation, Reuse Detection
    ├── Authentication > Hooks: hook_before_sign_in, hook_after_failure
    └── Database > Webhooks: audit-to-compliance (POST a compliance-lambda)
```

### 3. Paquete Python compartido (por lambda, en CI/CD)

```
CI/CD (GitHub Actions)
    │
    ├── uv sync --all-packages              ← resuelve workspace deps
    ├── uv build packages/entrevista-shared
    │
    ├── Por cada lambda (ej: compliance-lambda):
    │       ├── uv run pytest services/compliance-lambda/tests/
    │       └── sam build / zip deploy
    │
    └── Deploy a AWS Lambda
```

### 4. Dashboard (Vercel)

```
Git push → Vercel build automático
    │
    └── Variables de entorno en Vercel:
            VITE_SUPABASE_URL
            VITE_SUPABASE_ANON_KEY
```

---

## Gestión de secretos

| Secreto | Almacenamiento | Accedido por |
|---------|---------------|--------------|
| `SUPABASE_JWT_SECRET` | AWS Secrets Manager | Python Lambdas en runtime |
| `MONGODB_URI` | AWS Secrets Manager | Python Lambdas en runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | AWS Secrets Manager | Python Lambdas (admin ops) |
| `WEBHOOK_SECRET` | AWS Secrets Manager + Supabase env | compliance-lambda + Supabase webhook config |
| `VITE_SUPABASE_ANON_KEY` | Vercel environment variables | Build time (TypeScript bundle) |
| `VITE_SUPABASE_URL` | Vercel environment variables | Build time (TypeScript bundle) |

---

## Checklist de configuración (pre-producción)

### Supabase
- [ ] Crear proyecto `entrevista-prod` en región `sa-east-1`
- [ ] Crear proyecto `entrevista-staging` en región `sa-east-1`
- [ ] Ejecutar migraciones SQL (001, 002, 003) en ambos proyectos
- [ ] Configurar JWT Expiry = 900s, Rotation = ON, Detect Reuse = ON
- [ ] Registrar hook `hook_before_sign_in` en Auth Hooks
- [ ] Registrar hook `hook_after_sign_in_failure` (o trigger alternativo)
- [ ] Configurar Database Webhook `audit-to-compliance`
- [ ] Configurar SMTP custom para emails de reset de contraseña (producción)
- [ ] Verificar DPA de Supabase para cumplimiento Ley 1581/2012 (GAP-04)

### AWS Secrets Manager
- [ ] Crear secreto `entrevista/prod/supabase-jwt-secret`
- [ ] Crear secreto `entrevista/prod/mongodb-uri`
- [ ] Crear secreto `entrevista/prod/webhook-secret`
- [ ] Replicar para staging: `entrevista/staging/*`

### Repositorio
- [ ] Crear `packages/entrevista-shared/` con estructura definida
- [ ] Configurar `uv` workspace en `pyproject.toml` raíz
- [ ] Verificar que cada lambda tiene `entrevista-shared` como dependencia de workspace

### Vercel
- [ ] Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en variables de entorno
- [ ] Configurar dominio `app.entrevista.ai` apuntando al proyecto Vercel

---

## Sizing y costos estimados (MVP)

| Servicio | Plan | Costo mensual est. |
|----------|------|--------------------|
| Supabase (prod) | Pro | ~$25 USD |
| Supabase (staging) | Free tier | $0 |
| Vercel (dashboard) | Hobby/Pro | $0–$20 USD |
| MongoDB Atlas (compartido con otros lambdas) | M10 Shared | ~$57 USD |
| AWS Secrets Manager | Por secreto | < $5 USD |
| AWS X-Ray | Por traza | < $5 USD para MVP |

> **Total estimado**: ~$90–$110 USD/mes para MVP con < 200 operadoras.
