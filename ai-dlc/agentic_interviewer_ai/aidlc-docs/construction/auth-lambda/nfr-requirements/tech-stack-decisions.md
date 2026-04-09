# Decisiones de Stack Tecnológico — auth-lambda (Unidad 6)

**Generado**: 2026-04-06  
**Etapa**: CONSTRUCTION — NFR Requirements  
**Basis**: Respuestas P11–P14 + Note Arquitectónica Supabase

---

## ⚠️ Decisión Arquitectónica de Alto Nivel: Supabase Auth como Implementación de Producción

### Contexto

El diseño de `auth-lambda` fue elaborado como una **referencia arquitectónica completa** (custom Python/FastAPI/JWT/MongoDB). Sin embargo, el proyecto ya opera con:

| Componente | Implementación Real |
|---|---|
| Autenticación de operadores | **Supabase Auth** (email/password, JWT, refresh tokens) |
| Autorización / aislamiento de datos | **Supabase RLS** (Row Level Security con `auth.uid()`) |
| Deployment del dashboard | **Vercel** (SPA estática) |
| Base de datos | **PostgreSQL via Supabase** (no MongoDB) |

### Decisión

> **auth-lambda NO se implementa como un servicio Python independiente en producción.**  
> El diseño funcional y NFR sirven como:
> 1. **Auditoría de seguridad**: verificar que Supabase Auth cubre todos los controles definidos en BR-01 a BR-16
> 2. **Referencia de diseño**: guiar la configuración de Supabase, políticas RLS, y extensiones de seguridad
> 3. **Gap analysis**: identificar qué controles NO cubre Supabase nativamente y deben implementarse en capas adicionales

---

## Mapa de Componentes Diseñados → Supabase

| Componente Diseñado | Equivalente Supabase | Estado |
|---|---|---|
| `AuthService` — login/logout/refresh | `supabase.auth.signInWithPassword()` / `signOut()` / `refreshSession()` | ✅ Cubierto nativamente |
| `TokenManager` — JWT RS256 | Supabase emite JWT HMAC-SHA256 firmados con `JWT_SECRET` del proyecto | ⚠️ Diferencia: HS256 vs RS256 (ver abajo) |
| `BruteForceProtector` — progressive lockout | Supabase Auth no tiene lockout progresivo nativo | ❌ Gap — requiere implementación custom |
| `OperatorManager` — CRUD de operadores | `supabase.auth.admin.*` + tabla `profiles` en Postgres | ✅ Cubierto con configuración |
| `PasswordResetFlow` — forgot/reset | `supabase.auth.resetPasswordForEmail()` | ✅ Cubierto nativamente |
| `ChangePassword` — self-service | `supabase.auth.updateUser({ password })` | ✅ Cubierto nativamente |
| `JWKS endpoint` | Supabase expone `{project}.supabase.co/auth/v1/.well-known/jwks.json` | ✅ Cubierto nativamente (JWKS disponible) |
| `RevokedJWTs` — blacklist | Supabase no tiene JTI blacklist; logout invalida el refresh token | ⚠️ Parcial — access token no revocable hasta expirar |
| Multi-tenancy (tenant_id en JWT) | Supabase claims customizados via `app_metadata.tenant_id` | ✅ Cubierto con configuración |
| Roles ADMIN / RECRUITER | `app_metadata.role` en Supabase + RLS policies | ✅ Cubierto con configuración |
| Ley 1581/2012 compliance | Supabase DPA + configuración de retención de datos | ⚠️ Requiere verificación del DPA |

---

## Análisis de Gaps (lo que Supabase NO cubre nativamente)

### GAP-01: Brute Force Protection Progresiva (BR-02)

**Supabase nativo**: limita intentos de login pero no tiene lockout progresivo por tiers.  
**Solución recomendada**: Implementar un Edge Function de Supabase (o tabla `login_attempts` en Postgres + trigger/RLS) que:
1. Registre intentos fallidos en tabla `auth_login_attempts`
2. Bloquee el intento si se supera el umbral (devolver 429 antes de llamar a `signInWithPassword`)
3. Escalar tiers (15min → 30min → 60min)

```sql
-- Tabla a crear en Supabase (schema: auth o public)
CREATE TABLE auth_login_attempts (
  email         TEXT NOT NULL,
  tenant_id     UUID NOT NULL,
  failure_count INT DEFAULT 0,
  lockout_tier  INT DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  last_failure  TIMESTAMPTZ,
  window_start  TIMESTAMPTZ,
  PRIMARY KEY (email, tenant_id)
);
```

---

### GAP-02: Revocación Inmediata de Access Tokens (BR-07 — deactivación de operador)

**Supabase nativo**: `signOut()` revoca el refresh token pero el access token sigue válido hasta su expiración natural (por defecto 1 hora en Supabase).  
**Solución recomendada**:
- Reducir TTL del access token en Supabase a **15 minutos** (configurable en Dashboard > Auth > Settings)
- El riesgo residual de 15 minutos es aceptable para el perfil de riesgo del MVP (SLA 99.5%)

---

### GAP-03: Algoritmo JWT (HS256 vs RS256)

**Supabase nativo**: firma tokens con **HMAC-SHA256** (HS256) usando `JWT_SECRET` compartido.  
**Diseño auth-lambda**: especificaba RS256 con par de claves asimétricas.  
**Decisión**:
- **Mantener HS256 de Supabase** para MVP — es seguro si `JWT_SECRET` (mínimo 256 bits) se gestiona como secreto en producción
- Los otros lambdas verificarán tokens usando el `JWT_SECRET` del proyecto Supabase (compartido via Secrets Manager / env var)
- **Impacto en JWKS**: el endpoint `/.well-known/jwks.json` de Supabase devuelve la clave pública para HS256 — compatible con `python-jose` en los lambdas receptores
- **Migración futura**: si se requiere RS256, Supabase soporta custom JWT con clave RSA propia (configuración avanzada)

---

### GAP-04: Auditoría de Eventos de Auth para compliance-lambda (BR-13)

**Supabase nativo**: registra eventos de auth en `auth.audit_log_entries` (tabla interna de Supabase).  
**Solución recomendada**: Configurar un **Database Webhook** de Supabase en `auth.audit_log_entries` → POST a compliance-lambda para los eventos requeridos:
- INSERT con payload `action IN ('login', 'logout', 'token_refreshed', 'password_updated', 'password_recovery_requested')`

---

## Stack Tecnológico Definitivo

### Para la implementación con Supabase (producción)

| Capa | Tecnología | Decisión |
|---|---|---|
| Auth | **Supabase Auth** | Reemplaza AuthService + TokenManager + PasswordResetFlow |
| Base de datos auth | **Supabase (PostgreSQL)** | Reemplaza MongoDB para datos de operadores |
| Brute force | Custom tabla + Supabase Edge Function | Implementación requerida (GAP-01) |
| JWT | **HS256 via Supabase** | Reemplaza RS256 custom (ver GAP-03) |
| Frontend auth | **Supabase JS SDK v2** (`@supabase/supabase-js`) | `supabase.auth.*` — ya instalado en PSP frontend |
| Deployment | **Vercel** (dashboard) | SPA estática con `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |

### Para los lambdas Python receptores (conversation, evaluation, compliance, campaign)

| Necesidad | Librería | Fuente |
|---|---|---|
| Verificación JWT | **`PyJWT` + `cryptography`** | P14-B |
| Package manager | **`uv`** (Python 3.12) | P11-A |
| Testing | **`pytest` + `pytest-asyncio` + `testcontainers`** | P12-B |
| Argon2id (si se usa para otros hashes) | **`argon2-cffi`** | P13-A |
| Structured logging | **`structlog`** + AWS X-Ray | P15-B |

### Verificación JWT en lambdas Python con Supabase HS256

```python
import jwt  # PyJWT

def verify_supabase_token(token: str, jwt_secret: str) -> dict:
    """
    Verifica un JWT emitido por Supabase Auth (HS256).
    jwt_secret: SUPABASE_JWT_SECRET (desde Secrets Manager)
    """
    payload = jwt.decode(
        token,
        jwt_secret,
        algorithms=["HS256"],
        audience="authenticated",  # Supabase usa este audience
    )
    # payload contiene: sub, email, role, app_metadata.tenant_id, exp, iat
    return payload
```

---

## Configuración de Supabase Requerida (checklist)

Estas configuraciones deben aplicarse en el Supabase Dashboard del proyecto para alinearse con el diseño funcional:

- [ ] **Auth > Settings > JWT Expiry**: Reducir de 3600s a **900s** (15 minutos) — mitiga GAP-02
- [ ] **Auth > Settings > Refresh Token Rotation**: Habilitar `Detect and Revoke` — implementa BR-05 (rotation + reuse detection)
- [ ] **Auth > Settings > Site URL**: Configurar con URL de producción de Vercel
- [ ] **Auth > Email Templates**: Personalizar template de reset password con branding EntreVista AI
- [ ] **Auth > Providers > Email**: Verificar SMTP configurado (SES o SMTP de Supabase)  
- [ ] **Database > Extensions**: Habilitar `pgcrypto` (para SHA-256 en tabla `auth_login_attempts`)
- [ ] **Database**: Crear tabla `auth_login_attempts` + funciones para brute force (GAP-01)
- [ ] **Auth > Hooks (Auth Hook)**: Configurar `before_sign_in` hook para llamar lógica de brute force
- [ ] **Database Webhooks**: Configurar trigger en `auth.audit_log_entries` → compliance-lambda (GAP-04)
- [ ] **App Metadata**: Confirmar que `tenant_id` y `role` están en `app_metadata` de cada usuario (set al crear cuenta)
- [ ] **RLS Policies**: Verificar que todas las tablas usan `auth.uid()` y `auth.jwt() ->> 'tenant_id'` para aislamiento

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| JWT_SECRET comprometido (HS256) | Baja | Alto | Rotar via Supabase Dashboard + invalidar todas las sesiones activas |
| Brute force antes de implementar GAP-01 | Media | Alto | Priorizar implementación de GAP-01 antes del primer cliente de producción |
| Supabase DPA no cubre Ley 1581/2012 | Media | Medio | Verificar DPA con equipo legal; considerar región AWS más cercana (us-east-1 → São Paulo si requerido) |
| Refresh token no rotado (config default) | Baja | Medio | Habilitar Rotation en Supabase Dashboard (tarea de configuración, no de código) |
