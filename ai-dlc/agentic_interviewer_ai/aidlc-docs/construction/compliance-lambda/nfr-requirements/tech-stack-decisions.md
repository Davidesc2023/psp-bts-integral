# Tech Stack Decisions — compliance-lambda (Unit 5)

**Unidad**: Unit 5 - entrevista-compliance
**Generado**: 2026-04-08
**Basado en**: NFR Requirements + respuestas Plan (P1–P10)

---

## TSD-01 — Runtime y framework web

| Decision | Valor | Razon |
|----------|-------|-------|
| **Runtime** | Python 3.12 | Definido en unit-of-work.md. Consistente con entrevista-shared y auth-lambda. |
| **Web framework** | FastAPI 0.115.x | Alto throughput async, Pydantic v2 nativo, documentacion OpenAPI automatica. |
| **ASGI adapter** | Mangum 0.17.x | Bridge FastAPI ↔ AWS Lambda API Gateway HTTP. |
| **Arquitectura Lambda** | arm64 (Graviton2) | ~20% menor latencia de cold start vs x86_64; costo ~20% menor. |
| **Memoria Lambda** | 512MB | Adecuado para operaciones MongoDB async. Ajustable tras profiling. |
| **Timeout Lambda** | 30s | Operaciones de purga diaria pueden tardar mas; DataRetentionManager usa invocacion separada con timeout 300s. |

---

## TSD-02 — Base de datos

| Decision | Valor | Razon |
|----------|-------|-------|
| **Engine** | MongoDB Atlas M10 | NFR-ESC-01: 300 sesiones concurrentes. M10 soporta ~1000 conexiones concurrentes con indexacion eficiente. |
| **Driver Python** | Motor 3.6.x (asyncio) | Driver oficial async para MongoDB. Integra directamente con FastAPI event loop. |
| **Connection pooling** | `minPoolSize=5, maxPoolSize=50` | Pool caliente para reducir latencia. Max 50 conexiones por instancia Lambda. |
| **Write concern** | `w="majority", j=True` | NFR-REL-04: durabilidad ante fallo del primary. |
| **Cifrado en reposo** | Atlas Encryption at Rest + AWS KMS | NFR-SEC-01: CMK `alias/entrevista-compliance-atlas`, rotacion anual. |
| **Coleccion de contadores** | `session_counters` con `$inc` atomico | NFR-REL-03: sequence_number sin race conditions para chain hash. |

---

## TSD-03 — Messaging y eventos

| Decision | Valor | Razon |
|----------|-------|-------|
| **Bus de eventos** | Amazon EventBridge (default bus) | Definido en Functional Design. At-least-once delivery. |
| **DLQ** | Amazon SQS standard queue | NFR-REL-01: DLQ para eventos fallidos. Auto-replay con backoff. |
| **Processor de DLQ** | Lambda `entrevista-compliance-dlq-processor` | Lambda separada para reintentos, max 3 adicionales con backoff exponencial. |
| **Alertas** | Amazon SNS topic `entrevista-compliance-alerts` | Canal primario de alertas (tamper detection, DLQ, errores criticos). |
| **Purga programada** | EventBridge Scheduler (diario, 02:00 UTC) | Invoca DataRetentionManager con payload `{ "action": "purge_sweep" }`. |

---

## TSD-04 — Seguridad

| Decision | Valor | Razon |
|----------|-------|-------|
| **Validacion JWT** | `entrevista-shared.jwt_validator` | Modulo ya construido en Unit 6. Reutilizacion directa. |
| **Secretos** | AWS Secrets Manager | NFR-SEC-06: MongoDB URI, SNS ARN, JWT secret. Nunca en env vars texto plano. |
| **IAM policy** | Deny `delete*` y `update*` en recursos MongoDB | NFR-SEC-04: inmutabilidad a nivel de IAM. |
| **IP anonimizado** | SHA-256(IP + session_id + salt) | NFR-SEC-05: Ley 1581 minimizacion de PII. |
| **TLS** | TLS 1.2 minimo a MongoDB Atlas | NFR-SEC-02: `tls=true` en connection string. |

---

## TSD-05 — Observabilidad

| Decision | Valor | Razon |
|----------|-------|-------|
| **Tracing** | AWS X-Ray con subsegmentos | NFR-OBS-01: visibilidad completa de latencia por componente. |
| **X-Ray SDK** | `aws-xray-sdk` via `entrevista-shared.xray` | Ya disponible en el paquete compartido. |
| **Logs** | CloudWatch Logs (estructurados JSON) | Formato estandar: `{ "level": "INFO", "component": "AuditLogger", "session_id": "..." }` |
| **Log retention** | 90 dias | NFR-OBS-03: alineado con retencion de datos de entrevistas. |
| **Metricas custom** | CloudWatch namespace `EntreVista/Compliance` | NFR-OBS-02: 6 metricas publicadas via `boto3.client("cloudwatch").put_metric_data`. |
| **Alarmas** | 5 alarmas CloudWatch | NFR-OBS-04: Errors, Throttle, Duration, Tamper, DLQ. |

---

## TSD-06 — Dependencias Python

**Versiones exactas** (NFR-MAINT-03 — pinning):

```toml
[project]
name = "entrevista-compliance"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi==0.115.6",
    "mangum==0.17.0",
    "motor==3.6.0",
    "pymongo==4.10.1",
    "pydantic==2.10.3",
    "pydantic-settings==2.6.1",
    "boto3==1.35.96",
    "aws-xray-sdk==2.14.0",
    "python-jose[cryptography]==3.3.0",
    "httpx==0.28.1",
    "entrevista-shared",  # workspace package, sin version pin
]

[tool.uv.sources]
entrevista-shared = { workspace = true }
```

---

## TSD-07 — Build y deployment

| Decision | Valor | Razon |
|----------|-------|-------|
| **Package manager** | uv (workspace) | Consistente con Unit 6 auth-lambda y entrevista-shared. |
| **Build artifact** | zip (uv pip install --target) | Formato standard para AWS Lambda Python. |
| **IaC** | AWS SAM (template.yaml) | Consistente con el resto de lambdas del proyecto. |
| **Entornos** | dev / staging / prod | NFR-MAINT-02: separacion completa de entornos. |
| **CI/CD** | GitHub Actions (pendiente Unit 7) | Trigger en push a `main` branch por servicio. |

---

## TSD-08 — Testing

| Capa | Framework | Cobertura objetivo |
|------|-----------|-------------------|
| Unit tests | pytest + pytest-asyncio | 80% global; 100% en ConsentManager, AuditLogger.compute_chain_hash, DataRetentionManager.purge_campaign |
| Integration tests | pytest + Motor real (Atlas dev cluster) | Flujos end-to-end: consent → audit → query → purge |
| Security tests | pip-audit + bandit | 0 vulnerabilidades criticas o altas |
| Load tests | Locust (pendiente pre-produccion) | 300 sesiones concurrentes, SLO p99 < 800ms |

---

## Resumen de decisiones criticas

| Area | Decision clave | Alternativa descartada |
|------|---------------|----------------------|
| Concurrencia hash | `$inc` atomico en `session_counters` | Timestamp ordering (acepta gaps, inaceptable para evidencia legal) |
| DLQ | Auto-replay con Lambda | Sin DLQ (riesgo de perdida de eventos de consentimiento) |
| Disponibilidad | Non-blocking (99%) | Critical path (99.9%) — complejidad excesiva para MVP |
| Cifrado MongoDB | Encryption at Rest + KMS | FLE — complejidad de implementacion excesiva para MVP |
| Audit query | Paginado + transcript separado | Todo en una respuesta (payload >1MB en sesiones largas) |
