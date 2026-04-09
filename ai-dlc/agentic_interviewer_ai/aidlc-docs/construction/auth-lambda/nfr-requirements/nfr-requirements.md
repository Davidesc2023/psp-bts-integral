# NFR Requirements — auth-lambda (Unidad 6)

**Generado**: 2026-04-06  
**Etapa**: CONSTRUCTION — NFR Requirements  
**Basis**: Respuestas P1–P18 + Nota Arquitectónica Supabase

---

## ⚠️ Nota Arquitectónica Crítica

> **El proyecto `entrevista-auth` usa Supabase Auth + Supabase RLS + Vercel como implementación de producción.**  
> El diseño de `auth-lambda` (Functional Design + NFR Requirements) sirve como **referencia arquitectónica y auditoría de seguridad** — no como reemplazo del sistema existente.  
> Todos los controles de seguridad y reglas de negocio definidos en este documento deben verificarse que Supabase Auth los satisface o que se implementen como capa adicional sobre Supabase.

---

## 1. Escalabilidad

| Requisito | Valor | Fuente |
|---|---|---|
| Operadores MVP | < 50 | P1-B |
| Operadores a 12 meses | < 200 | P1-B |
| Logins en pico | 10–100 / minuto | P2-B |
| Estrategia multi-tenancy | Lambda compartido (aislamiento por tenant_id en datos) | P3-A |

**Implicaciones**:
- Escala de carga es **baja-media** — no se requiere provisioned concurrency desde el inicio
- A 100 logins/minuto, la concurrencia Lambda es < 5 instancias simultáneas (duración promedio de login ~1.5s con Argon2id)
- El Lambda compartido para todos los tenants es viable en este rango; no se requiere isolación de infraestructura por tenant en MVP
- MongoDB Atlas M10 (mínimo con replicación) es suficiente para esta carga

---

## 2. Rendimiento

| Endpoint | Latencia Máxima | Percentil | Fuente |
|---|---|---|---|
| `POST /api/v1/auth/login` | < 2.000 ms | p99 | P4-A |
| `POST /api/v1/auth/refresh` | < 500 ms | p99 | Derivado |
| `GET /.well-known/jwks.json` | < 500 ms | p99 | P5-B |
| `POST /api/v1/operators` | < 1.000 ms | p99 | Derivado |

**Implicaciones para Argon2id**:
- Con `memory_cost=65536 kB`, `time_cost=3`, `parallelism=1` el hash toma ~400–800ms en Lambda arm64
- El presupuesto de latencia de 2s es suficiente: ~800ms Argon2id + ~200ms MongoDB + ~100ms overhead = ~1.100ms p50
- **No se requiere reducir parámetros de Argon2id** — el nivel de seguridad actual es mantenible

**Cold Start**:
- Lambda Python + FastAPI: cold start estimado 800ms–1.5s
- Acción requerida: `provisioned_concurrency = 1` para `/auth/login` en horario laboral (configurable)
- JWKS endpoint: puede tolerar cold starts dado que clientes cachean la respuesta

---

## 3. Disponibilidad

| Requisito | Valor | Fuente |
|---|---|---|
| SLA objetivo | 99.5% (≈ 3.6 h downtime/mes) | P6-A |
| Estrategia DR | Multi-AZ automático de Lambda (sin DR adicional) | P8-A |
| MongoDB no disponible | Retry con backoff exponencial: 2 intentos, 100ms / 300ms → 503 | P7-B |

**Implicaciones**:
- AWS Lambda nativamente despliega en múltiples AZs dentro de la región — el SLA de 99.5% se satisface con el comportamiento estándar de Lambda
- No se requiere configuración de multi-región para MVP
- La estrategia de retry para MongoDB mitiga interrupciones transitorias sin bloquear la respuesta del usuario indefinidamente
- MongoDB Atlas M10 tiene SLA propio de 99.995% — no es el cuello de botella de disponibilidad

---

## 4. Seguridad y Cumplimiento

| Requisito | Detalle | Fuente |
|---|---|---|
| Regulación aplicable | **Ley 1581/2012** (Colombia) — datos personales de operadores | P9-C |
| Auditoría de base de datos | Audit log de aplicación suficiente (BR-13 vía compliance-lambda) | P10-A |
| Security Baseline | SECURITY-01 a SECURITY-15 habilitados (definidos en extensions/) | Inception |

**Requisitos de Ley 1581/2012 sobre datos de operadores**:

| Obligación | Implementación |
|---|---|
| Autorización del titular | Consentimiento explícito al crear cuenta de operador (campo `consented_at` en Operator) |
| Finalidad declarada | Documentar en política de privacidad: autenticación y acceso a plataforma |
| Acceso y rectificación | `PATCH /api/v1/operators/{id}` (propio perfil) + admin update |
| Supresión (derecho al olvido) | `POST /api/v1/operators/{id}/deactivate` + proceso de purga de datos a X días |
| Notification de brechas | Proceso documentado en RUNBOOK — notificación a SIC en 72h |
| Registro de tratamiento | Registro de actividades de tratamiento (RAT) — documento de compliance |

> **⚠️ Acción de alineación con Supabase**: Supabase Auth maneja datos de usuarios (email, metadatos). Verificar que el DPA (Data Processing Agreement) de Supabase cubre Ley 1581/2012 para datos en servidores de AWS en región us-east-1 o equivalent LATAM.

---

## 5. Confiabilidad

| Requisito | Detalle |
|---|---|
| Error handling MongoDB | Retry exponencial 2x (100ms, 300ms) → 503 |
| Error handling Secrets Manager | Sin retry en cold start; falla la inicialización del Lambda → CloudWatch alarm |
| Error handling AWS SES | Fire-and-forget para reset emails; fallo logeado, no bloquea respuesta |
| Error handling compliance-lambda | Fire-and-forget (async); fallo logeado en CloudWatch |
| Timeout de Lambda | 30 segundos máximo (default AWS) — suficiente para flujo de login con Argon2id |

---

## 6. Observabilidad

| Requisito | Detalle | Fuente |
|---|---|---|
| Structured logging | JSON en stdout → CloudWatch Logs | P15-B |
| Distributed tracing | AWS X-Ray — trazas entre auth-lambda y downstream services | P15-B |
| Alertas CloudWatch | Set C — alertas completas (ver detalle abajo) | P16-C |

**Alertas de CloudWatch requeridas** (Set C):

| Alerta | Métrica | Umbral | Ventana | Acción |
|---|---|---|---|---|
| Alta tasa de errores | `Errors / Invocations` | > 5% | 5 min | SNS → PagerDuty / email |
| Alta latencia | `Duration p99` | > 2.000 ms | 5 min | SNS → email |
| Cuentas bloqueadas | Custom metric `auth.account_locked` | > 10 en 1 min | 1 min | SNS → email |
| Posible ataque de fuerza bruta | Custom metric `auth.login_failed` | > 50 en 1 min | 1 min | SNS → PagerDuty |
| Exceso de cold starts | `InitDuration / Duration` | > 20% | 15 min | SNS → email |
| Lambda throttling | `Throttles` | > 0 | 5 min | SNS → email |

**Campos obligatorios en cada log JSON**:
```json
{
  "timestamp": "ISO8601",
  "level": "INFO|WARN|ERROR",
  "service": "auth-lambda",
  "request_id": "AWS Lambda request ID",
  "tenant_id": "UUID (nunca null)",
  "operator_id": "UUID o null si unauthenticated",
  "event": "AUTH_LOGIN_SUCCESS | AUTH_LOGIN_FAILED | ...",
  "duration_ms": 123,
  "ip_address": "masked last octet: 192.168.1.xxx"
}
```

> **Nunca loguear**: `password`, `password_hash`, `access_token`, `refresh_token`, `token_hash`, `reset_token`

---

## 7. Mantenibilidad y Calidad

| Requisito | Valor | Fuente |
|---|---|---|
| Cobertura de código mínima | 80% | P17-B |
| Framework de testing | `pytest` + `pytest-asyncio` + `testcontainers` | P12-B |
| Prueba de carga pre-go-live | Básica: 50 logins/min sostenidos × 5 min (Locust) | P18-B |
| Gestor de paquetes | `uv` (Python 3.12) | P11-A |

**Estrategia de cobertura 80%**:
- Unit tests: cubrir cada método de cada componente (AuthService, TokenManager, BruteForceProtector, OperatorManager)
- Integration tests (testcontainers): cubrir todos los flujos end-to-end contra MongoDB real
- Excluir de cobertura: `handler.py` (Mangum boilerplate), archivos de configuración
- Cobertura obligatoria al 100%: flujos de seguridad críticos — login (BR-02), refresh (BR-05 reuse detection), deactivation (BR-07)

---

## 8. Requisitos de Despliegue

| Requisito | Valor |
|---|---|
| Runtime | Python 3.12 (arm64) |
| Arquitectura | arm64 (Graviton2) — mejor relación costo/rendimiento para Lambda |
| Memoria Lambda | 512 MB (suficiente para Argon2id con memory_cost=65536 kB) |
| Timeout Lambda | 30 segundos |
| Provisioned Concurrency | 1 instancia para endpoint `/auth/login` en horas laborales (opcional MVP) |
| Package format | `.zip` (via `make build`) |
| Variables de entorno sensibles | Todas en AWS Secrets Manager; no en env vars directas |
