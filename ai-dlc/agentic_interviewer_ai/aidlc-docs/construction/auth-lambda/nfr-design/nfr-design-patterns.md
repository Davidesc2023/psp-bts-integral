# Patrones de Diseño NFR — auth-lambda (Unidad 6)

**Unidad**: Unidad 6 — auth-lambda (`entrevista-auth`)
**Generado**: 2026-04-06
**Arquitectura base**: Supabase Auth + Supabase RLS + Vercel

---

## Decisiones de diseño aplicadas

| Decisión | Selección |
|----------|-----------|
| Brute force hook (GAP-01) | PostgreSQL Function Hook (`before_sign_in`) |
| Retry MongoDB | Driver built-in (`retryWrites`/`retryReads`) + manual ligero |
| JWT algorithm (GAP-03) | HS256 mantenido; procedimiento de rotación documentado |
| Token revocation (GAP-02) | Reducir TTL access token a 15 min en Supabase |
| Audit events (GAP-04) | Database Webhook → compliance-lambda |
| JWKS cache | Variable global en módulo Lambda (in-memory) |
| Observabilidad | AWS X-Ray subsegments por operación |

---

## Patrón 1 — Brute Force Progresivo (GAP-01)

**Problema**: Supabase Auth no implementa lockout progresivo nativo.
**Patrón**: PostgreSQL Function Hook ejecutado como `before_sign_in` en cada intento de login.

### Tabla de estado

```sql
-- public.auth_login_attempts
CREATE TABLE public.auth_login_attempts (
    user_id      UUID        NOT NULL,
    ip_address   INET,
    attempt_count INTEGER    NOT NULL DEFAULT 0,
    last_attempt TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_until TIMESTAMPTZ,
    CONSTRAINT pk_auth_login_attempts PRIMARY KEY (user_id)
);

CREATE INDEX idx_auth_login_attempts_ip ON public.auth_login_attempts (ip_address);
CREATE INDEX idx_auth_login_attempts_locked ON public.auth_login_attempts (locked_until)
    WHERE locked_until IS NOT NULL;
```

### Lógica de lockout progresivo

| Intentos fallidos | Duración del bloqueo | Regla |
|-------------------|----------------------|-------|
| 3–4              | 15 minutos           | BR-02 |
| 5–9              | 30 minutos           | BR-02 |
| ≥ 10             | 60 minutos           | BR-02 |

### PostgreSQL Function Hook

```sql
CREATE OR REPLACE FUNCTION public.hook_before_sign_in(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id    UUID;
    v_ip         INET;
    v_rec        public.auth_login_attempts%ROWTYPE;
    v_lock_mins  INTEGER;
BEGIN
    v_user_id := (event->>'user_id')::UUID;
    v_ip      := (event->'request'->'headers'->>'x-forwarded-for')::INET;

    -- Obtener o crear registro de intentos
    SELECT * INTO v_rec
    FROM public.auth_login_attempts
    WHERE user_id = v_user_id;

    IF v_rec.user_id IS NULL THEN
        INSERT INTO public.auth_login_attempts (user_id, ip_address, attempt_count)
        VALUES (v_user_id, v_ip, 0);
        RETURN event;
    END IF;

    -- Verificar bloqueo activo
    IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until > now() THEN
        RETURN jsonb_build_object(
            'error', jsonb_build_object(
                'http_code', 429,
                'message',   'Cuenta temporalmente bloqueada por múltiples intentos fallidos.'
            )
        );
    END IF;

    -- Resetear si bloqueo expiró
    IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until <= now() THEN
        UPDATE public.auth_login_attempts
        SET attempt_count = 0, locked_until = NULL, last_attempt = now()
        WHERE user_id = v_user_id;
    END IF;

    RETURN event;
END;
$$;
```

> **Nota**: el incremento de `attempt_count` y la aplicación del lockout se gestiona en `hook_after_sign_in_failure` (hook complementario). Este hook solo bloquea si el operador ya está locked.

### Hook de fallo de login

```sql
CREATE OR REPLACE FUNCTION public.hook_after_sign_in_failure(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_count   INTEGER;
    v_until   TIMESTAMPTZ;
BEGIN
    v_user_id := (event->>'user_id')::UUID;

    UPDATE public.auth_login_attempts
    SET attempt_count = attempt_count + 1,
        last_attempt  = now()
    WHERE user_id = v_user_id
    RETURNING attempt_count INTO v_count;

    -- Aplicar lockout progresivo (BR-02)
    IF v_count >= 10 THEN
        v_until := now() + INTERVAL '60 minutes';
    ELSIF v_count >= 5 THEN
        v_until := now() + INTERVAL '30 minutes';
    ELSIF v_count >= 3 THEN
        v_until := now() + INTERVAL '15 minutes';
    END IF;

    IF v_until IS NOT NULL THEN
        UPDATE public.auth_login_attempts
        SET locked_until = v_until
        WHERE user_id = v_user_id;
    END IF;

    RETURN event;
END;
$$;
```

### Registro del hook en Supabase

```sql
-- Configurar en Supabase Dashboard > Authentication > Hooks
-- Type: Before Sign In
-- Schema: public
-- Function: hook_before_sign_in
```

---

## Patrón 2 — Token Revocation por TTL Corto (GAP-02)

**Problema**: Supabase no soporta revocación inmediata de access tokens activos.
**Patrón**: Reducir TTL del access token a 15 minutos — ventana máxima de exposición acotada.

### Configuración Supabase

| Parámetro | Valor | Ubicación |
|-----------|-------|-----------|
| `JWT Expiry` | 900 seg (15 min) | Auth > Settings > JWT Expiry |
| `Refresh Token Duration` | 604800 seg (7 días) | Auth > Settings > Refresh Token |
| `Refresh Token Rotation` | Habilitado | Auth > Settings |
| `Detect Reuse` | Habilitado | Auth > Settings |

### Implicación de diseño para dashboards

El cliente React debe llamar `supabase.auth.refreshSession()` antes de expiración. El SDK maneja esto automáticamente con `autoRefreshToken: true` (default). No se requiere lógica adicional en el cliente.

---

## Patrón 3 — JWT Verification para Lambdas Python (GAP-03)

**Problema**: Los lambdas Python (compliance-lambda, etc.) deben verificar tokens emitidos por Supabase usando HS256 + JWT_SECRET.

**Patrón**: Módulo compartido con cache in-memory del secreto y verificación con PyJWT.

```python
# shared/auth/supabase_jwt_verifier.py
import os
import time
from typing import Any
import jwt  # PyJWT

_SUPABASE_JWT_SECRET: str | None = None
_SECRET_LOADED_AT: float = 0.0
_SECRET_TTL_SECONDS: float = 900.0  # 15 min — igual que JWT expiry

def _get_jwt_secret() -> str:
    global _SUPABASE_JWT_SECRET, _SECRET_LOADED_AT
    now = time.monotonic()
    if _SUPABASE_JWT_SECRET is None or (now - _SECRET_LOADED_AT) > _SECRET_TTL_SECONDS:
        secret = os.environ.get("SUPABASE_JWT_SECRET")
        if not secret:
            raise RuntimeError("SUPABASE_JWT_SECRET env var no configurada")
        _SUPABASE_JWT_SECRET = secret
        _SECRET_LOADED_AT = now
    return _SUPABASE_JWT_SECRET


def verify_supabase_token(token: str) -> dict[str, Any]:
    """
    Verifica un access token de Supabase con HS256.
    Lanza jwt.InvalidTokenError si el token es inválido o expirado.
    """
    secret = _get_jwt_secret()
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"require": ["sub", "exp", "role"]},
        )
    except jwt.ExpiredSignatureError:
        raise jwt.InvalidTokenError("Token expirado")
    except jwt.InvalidTokenError as exc:
        raise jwt.InvalidTokenError(f"Token inválido: {exc}") from exc

    # Solo aceptar tokens de tipo service_role o authenticated
    allowed_roles = {"service_role", "authenticated"}
    if payload.get("role") not in allowed_roles:
        raise jwt.InvalidTokenError(f"Role no autorizado: {payload.get('role')}")

    return payload
```

### Procedimiento de rotación de JWT_SECRET

1. Generar nuevo secreto: `openssl rand -base64 64`
2. Actualizar en Supabase Dashboard > Settings > API > JWT Secret
3. Actualizar variable de entorno `SUPABASE_JWT_SECRET` en todos los lambdas (AWS Secrets Manager o env var)
4. Reiniciar lambdas (o esperar siguiente cold start) — el cache se invalida en 15 min automáticamente
5. **Ventana de doble-secreto**: no aplica con HS256 en Supabase — el cambio invalida todos los tokens activos inmediatamente; planificar rotación en mantenimiento nocturno

---

## Patrón 4 — Audit Events por Database Webhook (GAP-04)

**Problema**: compliance-lambda necesita recibir eventos de autenticación (login, logout, cambio de contraseña) para auditoría según Ley 1581/2012.

**Patrón**: Supabase Database Webhook sobre inserciones en `auth.audit_log_entries` → HTTP POST a compliance-lambda.

### Configuración del webhook

```
Tipo:           Database Webhook
Tabla:          auth.audit_log_entries
Evento:         INSERT
URL destino:    https://{compliance-lambda-url}/webhook/auth-event
Headers:        x-webhook-secret: {WEBHOOK_SECRET}
Timeout:        5000 ms
```

### Patrones de resiliencia del webhook

**Fire-and-forget con fallback a tabla de dead-letter**:

```sql
-- Tabla dead-letter para webhooks fallidos
CREATE TABLE public.audit_webhook_dlq (
    id           BIGSERIAL    PRIMARY KEY,
    event_data   JSONB        NOT NULL,
    failed_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    retry_count  INTEGER      NOT NULL DEFAULT 0,
    last_error   TEXT,
    delivered    BOOLEAN      NOT NULL DEFAULT false
);

-- Supabase reintenta automáticamente 3 veces con backoff
-- Si falla → la tabla compliance debe tolerar pérdida eventual
-- Reconciliación manual vía audit.audit_log_entries (fuente de verdad en Supabase)
```

### Contrato del endpoint receptor (compliance-lambda)

```
POST /webhook/auth-event
Authorization: x-webhook-secret: {valor}
Content-Type: application/json

{
  "type":       "INSERT",
  "table":      "audit_log_entries",
  "record": {
    "id":           "uuid",
    "payload":      { "action": "login", "actor_id": "uuid", ... },
    "ip_address":   "192.168.1.1",
    "created_at":   "2026-04-06T12:00:00Z"
  }
}
```

> Compliance-lambda debe responder en < 5s o Supabase marcará el webhook como fallido.

---

## Patrón 5 — Retry de Conexión MongoDB (MVP)

**Problema**: MongoDB Atlas puede tener fallos transitorios de conectividad desde Lambda.

**Patrón**: Driver Motor built-in + reintentos manuales ligeros para errores de aplicación.

### Configuración del driver

```python
# shared/db/mongodb_client.py
import os
from motor.motor_asyncio import AsyncIOMotorClient

_client: AsyncIOMotorClient | None = None

def get_mongo_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            os.environ["MONGODB_URI"],
            # Driver retry config
            retryWrites=True,
            retryReads=True,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=3000,
            socketTimeoutMS=10000,
        )
    return _client
```

### Retry manual ligero para errores de aplicación

```python
# shared/db/retry.py
import asyncio
import logging
from typing import TypeVar, Callable, Awaitable

from pymongo.errors import PyMongoError

T = TypeVar("T")
log = logging.getLogger(__name__)

_RETRY_DELAYS = (0.1, 0.3)  # segundos: 100ms, 300ms (2 reintentos)


async def with_db_retry(operation: Callable[[], Awaitable[T]]) -> T:
    """
    Ejecuta `operation` con hasta 2 reintentos ante errores de PyMongo.
    No usa tenacity — implementación mínima para MVP.
    """
    last_exc: Exception | None = None
    for attempt, delay in enumerate(
        [None] + list(_RETRY_DELAYS), start=1
    ):
        if delay is not None:
            await asyncio.sleep(delay)
        try:
            return await operation()
        except PyMongoError as exc:
            last_exc = exc
            log.warning(
                "MongoDB retry",
                extra={"attempt": attempt, "error": str(exc)},
            )
    raise last_exc  # type: ignore[misc]
```

---

## Patrón 6 — JWKS / Secret Cache In-Memory

**Problema**: Cada invocación Lambda no debe pagar la latencia de obtener el secreto JWT desde el entorno.

**Patrón**: Variable global de módulo cacheada con TTL de 15 minutos (igual al JWT TTL).

```python
# El patrón ya está integrado en supabase_jwt_verifier.py (Patrón 3)
# _SUPABASE_JWT_SECRET se cachea en el módulo
# TTL = 900s (15 min) — invalidación automática por tiempo
# En instancias warm: una sola lectura de env var por cada ventana de 15 min
```

> **Lambda warm vs cold start**: en cold start se lee el env var. En warm instances, se reutiliza el valor cacheado. Con escala < 200 ops/sprint este patrón es suficiente — no se requiere ElastiCache.

---

## Patrón 7 — Observabilidad con AWS X-Ray

**Patrón**: Subsegmentos X-Ray envolviendo operaciones MongoDB y calls a compliance-lambda.

```python
# shared/observability/xray_utils.py
from contextlib import asynccontextmanager
from aws_xray_sdk.core import xray_recorder

@asynccontextmanager
async def xray_subsegment(name: str):
    """Context manager para subsegmentos X-Ray en código async."""
    subsegment = xray_recorder.begin_subsegment(name)
    try:
        yield subsegment
    except Exception as exc:
        if subsegment:
            subsegment.add_exception(exc, True)
        raise
    finally:
        xray_recorder.end_subsegment()
```

**Uso en operaciones MongoDB**:

```python
async def find_operator(user_id: str) -> dict | None:
    async with xray_subsegment("MongoDB.find_operator"):
        return await with_db_retry(
            lambda: db["operators"].find_one({"_id": user_id})
        )
```

**Uso en call a compliance-lambda** (fire-and-forget):

```python
async def notify_compliance(event: dict) -> None:
    async with xray_subsegment("HTTP.compliance_lambda"):
        # timeout explícito de 2s — no bloquea flujo principal
        async with httpx.AsyncClient(timeout=2.0) as client:
            try:
                await client.post(COMPLIANCE_LAMBDA_URL, json=event)
            except Exception:
                # Swallow — el webhook de Supabase es la fuente de verdad
                pass
```

---

## Matriz de patrones vs. SLAs

| NFR | Patrón aplicado | SLA cubierto |
|-----|----------------|--------------|
| Brute force progresivo (BR-02) | Patrón 1 — PostgreSQL Hook | ✅ |
| Ventana de exposición de tokens | Patrón 2 — TTL 15 min | ✅ GAP-02 |
| Verificación JWT en lambdas | Patrón 3 — PyJWT + cache | ✅ GAP-03 |
| Auditoría Ley 1581/2012 | Patrón 4 — Database Webhook | ✅ GAP-04 |
| Resiliencia MongoDB | Patrón 5 — Driver + manual | ✅ |
| Latencia cold start < 2s p99 | Patrón 6 — In-memory cache | ✅ |
| Trazabilidad distribuida | Patrón 7 — X-Ray subsegments | ✅ |
