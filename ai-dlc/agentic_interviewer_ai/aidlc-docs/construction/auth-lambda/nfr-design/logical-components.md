# Componentes Lógicos — auth-lambda (Unidad 6)

**Unidad**: Unidad 6 — auth-lambda (`entrevista-auth`)
**Generado**: 2026-04-06
**Arquitectura base**: Supabase Auth + Supabase RLS + Vercel

---

## Visión general

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Supabase Auth (producción)                          │
│                                                                             │
│  sign_in_with_password()  ──►  [hook_before_sign_in]  ──►  [hook_fail]    │
│                                   (brute force check)     (increment count) │
│  JWT (HS256, 15 min TTL)                                                    │
│  refresh_token (7 días, rotation + detect_reuse)                            │
│                                                                             │
│  auth.audit_log_entries  ──►  [Database Webhook]  ──►  compliance-lambda  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                       Python Lambdas (receptores de JWT)                    │
│                                                                             │
│  [supabase_jwt_verifier]  ──►  [with_db_retry + mongodb_client]            │
│        (PyJWT + HS256)          (Motor, retryWrites/retryReads)             │
│                                                                             │
│  [xray_utils]  ──► X-Ray subsegments en MongoDB + compliance calls         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes Supabase (infraestructura de autenticación)

### COMP-01 — `public.auth_login_attempts` (tabla PostgreSQL)

| Atributo | Valor |
|----------|-------|
| **Tipo** | Tabla PostgreSQL en Supabase |
| **Propósito** | Estado de intentos fallidos y lockout por operador |
| **Gap cubierto** | GAP-01 |
| **Patrón de diseño** | Patrón 1 — Brute Force Progresivo |

**Schema**:
```
user_id      UUID        PK — referencia a auth.users
ip_address   INET        — IP del último intento fallido
attempt_count INTEGER    — contador de intentos fallidos consecutivos
last_attempt TIMESTAMPTZ — timestamp del último intento
locked_until TIMESTAMPTZ — NULL si no está bloqueado
```

**Índices**:
```
idx_auth_login_attempts_ip     ON (ip_address)
idx_auth_login_attempts_locked ON (locked_until) WHERE locked_until IS NOT NULL
```

**Responsabilidades**:
- Mantener el estado de intentos fallidos por operador
- Soportar queries del hook `before_sign_in` en < 5ms
- Indexar por IP para detección de ataques de red distribuidos (futuro)

**Dependencias**: ninguna (tabla autónoma en Supabase)

---

### COMP-02 — `hook_before_sign_in` (PL/pgSQL Function)

| Atributo | Valor |
|----------|-------|
| **Tipo** | PostgreSQL Function, `SECURITY DEFINER` |
| **Propósito** | Bloquear login si el operador está en estado locked |
| **Se ejecuta** | Antes de cada intento de login (Supabase Auth Hook) |
| **Gap cubierto** | GAP-01 |
| **Patrón de diseño** | Patrón 1 — Brute Force Progresivo |

**Interfaz**:
- **Input**: `event JSONB` — payload de Supabase (`user_id`, `request.headers`)
- **Output**: `event JSONB` (sin modificaciones si OK) | `error JSONB` (si locked, HTTP 429)

**Lógica**:
1. Leer registro en `auth_login_attempts` para `user_id`
2. Si no existe: crear registro vacío y retornar evento (primer intento, OK)
3. Si `locked_until > now()`: retornar error 429 "Cuenta temporalmente bloqueada"
4. Si `locked_until <= now()`: resetear `attempt_count = 0`, `locked_until = NULL`

**Dependencias**: `public.auth_login_attempts` (COMP-01)

---

### COMP-03 — `hook_after_sign_in_failure` (PL/pgSQL Function)

| Atributo | Valor |
|----------|-------|
| **Tipo** | PostgreSQL Function, `SECURITY DEFINER` |
| **Propósito** | Incrementar contador y aplicar lockout progresivo tras login fallido |
| **Se ejecuta** | Tras cada login fallido (Supabase Auth Hook) |
| **Gap cubierto** | GAP-01 |
| **Patrón de diseño** | Patrón 1 — Brute Force Progresivo |

**Lógica de lockout** (BR-02):

| `attempt_count` resultante | `locked_until` |
|---------------------------|----------------|
| 3–4 | `now() + 15 min` |
| 5–9 | `now() + 30 min` |
| ≥ 10 | `now() + 60 min` |
| 1–2 | NULL (sin lockout) |

**Dependencias**: `public.auth_login_attempts` (COMP-01)

---

### COMP-04 — Configuración JWT Supabase

| Atributo | Valor |
|----------|-------|
| **Tipo** | Configuración de plataforma (Supabase Dashboard) |
| **Propósito** | Acotar ventana de exposición de access tokens a 15 minutos |
| **Gap cubierto** | GAP-02 |
| **Patrón de diseño** | Patrón 2 — Token Revocation por TTL Corto |

**Parámetros a configurar**:

| Parámetro | Valor | Justificación |
|-----------|-------|---------------|
| `JWT Expiry` | 900 seg | Ventana máxima de exposición = 15 min |
| `Refresh Token Duration` | 604800 seg | 7 días — sesión larga con rotación |
| `Refresh Token Rotation` | Habilitado | BR-05 — rotación obligatoria |
| `Detect Reuse` | Habilitado | BR-05 — reuse detection activo |

**Notas de operación**:
- No se requiere código adicional en el cliente (SDK maneja `autoRefreshToken`)
- El cambio de `JWT Expiry` invalida todos los tokens existentes — ejecutar en mantenimiento

---

### COMP-05 — Database Webhook → compliance-lambda

| Atributo | Valor |
|----------|-------|
| **Tipo** | Configuración de plataforma (Supabase Database Webhooks) |
| **Propósito** | Enviar eventos de auditoría de autenticación a compliance-lambda |
| **Gap cubierto** | GAP-04 |
| **Patrón de diseño** | Patrón 4 — Audit Events |

**Configuración**:
```
Tabla fuente:    auth.audit_log_entries
Evento:          INSERT
URL destino:     https://{compliance-lambda-url}/webhook/auth-event
Header:          x-webhook-secret: {WEBHOOK_SECRET}
Timeout:         5000 ms
Reintentos:      3 (automático por Supabase)
```

**Tipos de eventos capturados**:
- `login` — login exitoso
- `logout` — cierre de sesión
- `password_change` — cambio de contraseña
- `token_refresh` — renovación de token
- `user_modified` — modificación de operador

**Dependencias**: compliance-lambda debe estar desplegado y disponible (Unidad 5)

---

## Componentes Python Compartidos

### COMP-06 — `supabase_jwt_verifier` (Módulo Python)

| Atributo | Valor |
|----------|-------|
| **Tipo** | Módulo Python compartido (`shared/auth/supabase_jwt_verifier.py`) |
| **Propósito** | Verificar access tokens Supabase en lambdas Python receptores |
| **Gap cubierto** | GAP-03 |
| **Patrón de diseño** | Patrón 3 — JWT Verification + Patrón 6 — Cache In-Memory |
| **Dependencias externas** | `PyJWT`, `cryptography` |

**Interfaz pública**:

```python
def verify_supabase_token(token: str) -> dict[str, Any]
# Retorna payload del JWT si válido
# Lanza jwt.InvalidTokenError si inválido, expirado, o role no autorizado
```

**Estado interno**:
```
_SUPABASE_JWT_SECRET: str | None   — secreto JWT cacheado
_SECRET_LOADED_AT:   float         — timestamp de carga (monotonic)
_SECRET_TTL_SECONDS: float = 900   — TTL del cache = 15 min
```

**Validaciones aplicadas**:
1. Algoritmo: `HS256` únicamente
2. Claims requeridos: `sub`, `exp`, `role`
3. Roles permitidos: `service_role`, `authenticated`
4. Expiración: verificada por PyJWT automáticamente

**Variables de entorno requeridas**:
- `SUPABASE_JWT_SECRET` — secret del JWT de Supabase

---

### COMP-07 — `mongodb_client` (Módulo Python)

| Atributo | Valor |
|----------|-------|
| **Tipo** | Módulo Python compartido (`shared/db/mongodb_client.py`) |
| **Propósito** | Cliente Motor singleton con retry driver-level configurado |
| **Patrón de diseño** | Patrón 5 — Retry MongoDB (driver built-in) |
| **Dependencias externas** | `motor`, `pymongo` |

**Interfaz pública**:
```python
def get_mongo_client() -> AsyncIOMotorClient
# Retorna cliente singleton; crea nueva conexión solo en cold start
```

**Configuración del driver**:
```
retryWrites=True              — reintentos automáticos en escrituras
retryReads=True               — reintentos automáticos en lecturas
serverSelectionTimeoutMS=5000 — 5s para seleccionar servidor
connectTimeoutMS=3000         — 3s para establecer conexión
socketTimeoutMS=10000         — 10s por operación
```

**Variables de entorno requeridas**:
- `MONGODB_URI` — URI de conexión a MongoDB Atlas

---

### COMP-08 — `with_db_retry` (Función de utilidad Python)

| Atributo | Valor |
|----------|-------|
| **Tipo** | Función async (`shared/db/retry.py`) |
| **Propósito** | Retry manual ligero a nivel de aplicación (sin `tenacity`) |
| **Patrón de diseño** | Patrón 5 — Retry MongoDB (manual ligero) |
| **Intentos** | Máximo 3 (1 original + 2 reintentos) |
| **Delays** | 100ms, 300ms entre reintentos |

**Interfaz pública**:
```python
async def with_db_retry(operation: Callable[[], Awaitable[T]]) -> T
# Ejecuta `operation`. Si lanza PyMongoError, reintenta 2 veces.
# Relanza el último error si todos los intentos fallan.
```

**Errores manejados**: `PyMongoError` y subclases
**Errores NO manejados** (se propagan inmediatamente): `ValueError`, `KeyError`, errores de negocio

---

### COMP-09 — `xray_utils` (Módulo Python)

| Atributo | Valor |
|----------|-------|
| **Tipo** | Módulo Python compartido (`shared/observability/xray_utils.py`) |
| **Propósito** | Context manager async para subsegmentos X-Ray |
| **Patrón de diseño** | Patrón 7 — Observabilidad con X-Ray |
| **Dependencias externas** | `aws-xray-sdk` |

**Interfaz pública**:
```python
@asynccontextmanager
async def xray_subsegment(name: str)
# Abre subsegmento X-Ray; cierra y registra excepción si la hay.
```

**Puntos de instrumentación**:

| Operación | Nombre del subsegmento |
|-----------|------------------------|
| MongoDB find_one | `MongoDB.find_{collection}` |
| MongoDB insert_one | `MongoDB.insert_{collection}` |
| MongoDB update_one | `MongoDB.update_{collection}` |
| HTTP a compliance-lambda | `HTTP.compliance_lambda` |

---

## Tabla de dependencias entre componentes

```
COMP-01 (tabla auth_login_attempts)
    ▲
    ├── COMP-02 (hook_before_sign_in)   ← ejecutado por Supabase Auth
    └── COMP-03 (hook_failure)          ← ejecutado por Supabase Auth

COMP-04 (config JWT 15min)             ← cambio en Supabase Dashboard
    └── COMP-06 (jwt_verifier)          ← usa JWT_SECRET del mismo namespace

COMP-05 (Database Webhook)             ← depende de compliance-lambda (Unidad 5)

COMP-07 (mongodb_client)               ← singleton, sin dependencias externas
    └── COMP-08 (with_db_retry)         ← envuelve operaciones de COMP-07

COMP-09 (xray_utils)                   ← decorador transversal, sin dependencias de negocio
```

---

## Variables de entorno requeridas (auth-lambda)

| Variable | Componente | Descripción |
|----------|------------|-------------|
| `SUPABASE_JWT_SECRET` | COMP-06 | Secret HS256 del JWT de Supabase |
| `MONGODB_URI` | COMP-07 | URI Atlas con credenciales embebidas |
| `COMPLIANCE_LAMBDA_URL` | COMP-09 (uso) | URL del endpoint webhook en compliance-lambda |
| `WEBHOOK_SECRET` | COMP-05 | Secret de validación del webhook de auditoría |

---

## Componentes fuera de scope para esta unidad

| Componente | Motivo |
|------------|--------|
| Argon2id (hashing) | Supabase Auth gestiona el hash internamente — no accesible desde código |
| JWKS endpoint público | Supabase expone `/rest/v1/.well-known/jwks.json` automáticamente — BR-12 cubierto sin código |
| Password reset emails | Supabase Auth gestiona el flujo completo — plantillas configurables en Dashboard |
| MFA / 2FA | Fuera de scope para MVP (< 200 operadoras, contexto B2B controlado) |
