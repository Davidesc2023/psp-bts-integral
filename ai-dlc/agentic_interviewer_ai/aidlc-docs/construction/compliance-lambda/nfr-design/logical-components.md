# Logical Components — compliance-lambda (Unit 5)

**Unidad**: Unit 5 - entrevista-compliance
**Generado**: 2026-04-08
**Basado en**: nfr-requirements.md + nfr-design-patterns.md

---

## Diagrama de componentes logicos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AWS Lambda: entrevista-compliance                      │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                        FastAPI + Mangum (ComplianceRouter)           │    │
│  │   POST /consent   GET /audit/*   POST /nps   GET /nps/*   EventBridge│    │
│  └─────┬──────────────────┬──────────────┬──────────────┬───────────────┘    │
│        │                  │              │              │                     │
│  ┌─────▼──────┐  ┌────────▼──────┐  ┌───▼──────┐  ┌───▼──────────────────┐  │
│  │Consent     │  │AuditLogger    │  │NPS       │  │DataRetention         │  │
│  │Manager     │  │               │  │Collector │  │Manager               │  │
│  └─────┬──────┘  └────────┬──────┘  └───┬──────┘  └───┬──────────────────┘  │
│        │                  │              │              │                     │
│        │         ┌────────▼──────┐       │              │                     │
│        │         │SessionCounter │       │              │                     │
│        │         │Store          │       │              │                     │
│        │         └────────┬──────┘       │              │                     │
│        │                  │              │              │                     │
│  ┌─────▼──────────────────▼──────────────▼──────────────▼──────────────────┐  │
│  │                    entrevista-shared                                     │  │
│  │         jwt_validator | xray | retry | motor_client                     │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │EscalationAlertManager            │  │JWT Validator (entrevista-shared) │  │
│  └──────────┬───────────────────────┘  └──────────────────────────────────┘  │
│             │                                                                 │
└─────────────┼─────────────────────────────────────────────────────────────────┘
              │
┌─────────────▼─────────────────────────────────────────────────────────────────┐
│                         AWS + MongoDB Atlas                                     │
│                                                                                 │
│  MongoDB Atlas M10      Amazon EventBridge      Amazon SNS                     │
│  ┌──────────────┐       ┌───────────────┐       ┌────────────────────────┐    │
│  │consent_rec.  │       │default bus    │       │entrevista-compliance-  │    │
│  │audit_events  │       │  Rule:        │       │alerts                  │    │
│  │audit_transc. │       │  consent.rec. │       └────────────────────────┘    │
│  │nps_responses │       │  eval.compl.  │                                      │
│  │escalations   │       │  session.comp.│       Amazon SQS DLQ                 │
│  │campaigns_ret.│       │  Scheduler:   │       ┌────────────────────────┐    │
│  │session_ctrs  │       │  purge sweep  │       │entrevista-compliance-  │    │
│  └──────────────┘       └───────────────┘       │dlq                     │    │
│                                                  └────────────────────────┘    │
│  AWS KMS                AWS Secrets Mgr          AWS X-Ray                     │
│  ┌──────────────┐       ┌───────────────┐       ┌─────────────────────────┐  │
│  │alias/        │       │MONGODB_URI    │       │Traces + Subsegments     │  │
│  │entrevista-   │       │SNS_TOPIC_ARN  │       └─────────────────────────┘  │
│  │compliance-   │       │JWT_SECRET     │                                      │
│  │atlas         │       └───────────────┘       CloudWatch                    │
│  └──────────────┘                               ┌─────────────────────────┐  │
│                                                  │Logs: 90 dias retention  │  │
│                                                  │Metrics: custom NS       │  │
│                                                  │Alarms: 5 alarmas        │  │
│                                                  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes internos de la Lambda

### LC-01 — ComplianceRouter (FastAPI App)

**Responsabilidad**: Punto de entrada unificado. Registra todos los routers de FastAPI, configura middleware de autenticacion JWT, y actua como Mangum handler para API Gateway HTTP.

**Rutas registradas**:
```
/consent                         → ConsentRouter
/audit/{session_id}              → AuditRouter
/audit/{session_id}/events       → AuditRouter (paginado)
/audit/{session_id}/transcript   → AuditRouter
/audit/{session_id}/verify       → AuditRouter
/nps                             → NPSRouter
/nps/campaign/{campaign_id}      → NPSRouter
/compliance/report/{campaign_id} → ComplianceReportRouter (501 stub)
```

**Middleware**:
- JWT validation middleware (verifica Authorization header en todos los endpoints HTTP)
- X-Ray middleware (subsegmento raiz por request)
- Request ID middleware (inyecta `X-Request-Id` en cada response)

**EventBridge handler** (separado del HTTP handler):
```python
def handler(event, context):
    if "detail-type" in event:  # EventBridge event
        return event_bridge_dispatcher(event, context)
    return mangum_app(event, context)  # HTTP request via API Gateway
```

---

### LC-02 — ConsentManager

**Responsabilidad**: Registrar y consultar consentimientos de candidatos.
**Patron aplicado**: PAT-01 (Idempotency via Unique Index)

**Interface**:
```python
class ConsentManager:
    async def record_consent(self, payload: ConsentRecordCreate) -> ConsentResult
    async def get_consent(self, session_id: str) -> ConsentRecord | None
    async def consent_exists(self, session_id: str) -> bool
```

**Colecciones**: `consent_records`
**X-Ray subsegmento**: `consent_manager.record_consent`

---

### LC-03 — AuditLogger

**Responsabilidad**: Registrar eventos de audit en tiempo real y transcripts en batch. Calcular chain hash con sequence_number atomico.
**Patrones aplicados**: PAT-03 (Chain Hash), PAT-04 (Atomic Sequence Counter)

**Interface**:
```python
class AuditLogger:
    async def log_event(self, session_id: str, event_type: AuditEventType, payload: dict | None) -> AuditEvent
    async def log_transcript(self, session_id: str, messages: list[TranscriptMessage]) -> AuditTranscript
    async def get_events(self, session_id: str, page: int, limit: int) -> PaginatedAuditEvents
    async def get_transcript(self, session_id: str) -> AuditTranscript | None
    async def get_session_summary(self, session_id: str) -> AuditSessionSummary
    async def verify_chain(self, session_id: str) -> ChainVerificationResult
    async def handle_tamper_alert(self, alert_payload: dict) -> None
```

**Colecciones**: `audit_events`, `audit_transcripts`, `session_counters`
**X-Ray subsegmentos**: `audit_logger.log_event`, `audit_logger.log_transcript`, `audit_logger.verify_chain`

---

### LC-04 — SessionCounterStore

**Responsabilidad**: Proveer sequence_numbers atomicos por sesion para el chain hash.
**Patron aplicado**: PAT-04 (Atomic Sequence Counter)

**Interface**:
```python
class SessionCounterStore:
    async def next_sequence(self, session_id: str) -> int
    async def current_sequence(self, session_id: str) -> int
```

**Coleccion**: `session_counters`
**Nota de diseno**: Este componente es usado exclusivamente por AuditLogger. No tiene endpoint HTTP propio.

---

### LC-05 — NPSCollector

**Responsabilidad**: Almacenar respuestas NPS y calcular estadisticas por campana.
**Patron aplicado**: PAT-01 (Idempotency via Unique Index)

**Interface**:
```python
class NPSCollector:
    async def store_response(self, payload: NPSResponseCreate) -> NPSStoreResult
    async def get_campaign_stats(self, campaign_id: str) -> NPSCampaignStats
```

**Coleccion**: `nps_responses`
**Logica de negocio**: `is_low_nps = (average_score < 3.5)` (BR-C08)
**X-Ray subsegmento**: `nps_collector.store_response`

---

### LC-06 — EscalationAlertManager

**Responsabilidad**: Registrar escalaciones y publicar alertas SNS.
**Patron aplicado**: PAT-07 (Dual-Channel Alert)

**Interface**:
```python
class EscalationAlertManager:
    async def record_escalation(self, payload: EscalationCreate) -> EscalationRecord
    async def publish_alert(self, escalation: EscalationRecord) -> None
    async def update_status(self, session_id: str, status: EscalationStatus) -> EscalationRecord
```

**Coleccion**: `escalations`
**Integraciones**: SNS Topic `entrevista-compliance-alerts`
**X-Ray subsegmento**: `escalation.alert`

---

### LC-07 — DataRetentionManager

**Responsabilidad**: Ejecutar sweep diario de purga selectiva de datos expirados.
**Patron aplicado**: PAT-08 (Selective Data Purge)

**Interface**:
```python
class DataRetentionManager:
    async def run_purge_sweep(self) -> PurgeSweepResult
    async def purge_campaign(self, campaign_id: str, run_id: str) -> CampaignPurgeResult
    async def get_expiring_campaigns(self) -> list[CampaignRetentionConfig]
```

**Colecciones**: `campaigns_retention`, `audit_transcripts`, `nps_responses`, `escalations`, `audit_events` (update payload=null)
**Trigger**: EventBridge Scheduler (diario 02:00 UTC)
**Timeout Lambda**: 300s para el scheduled handler (separado del HTTP handler timeout de 30s)
**X-Ray subsegmento**: `retention.purge`

---

## Componentes de infraestructura AWS

### LC-08 — MongoDB Atlas M10

**Rol**: Base de datos principal. Almacena las 7 colecciones del dominio.
**Configuracion**:
- Tier: M10 (soporta 300 sesiones concurrentes — NFR-ESC-01)
- Encryption at Rest: activado con AWS KMS CMK `alias/entrevista-compliance-atlas`
- Connection pool: `minPoolSize=5, maxPoolSize=50` por instancia Lambda
- TLS: `tls=true` en connection string
- Write concern: `WriteConcern(w="majority", j=True)` en todas las escrituras

**Colecciones e indices criticos**:
```
consent_records:    { session_id: 1 } unique
audit_events:       { session_id: 1, sequence_number: 1 } unique
                    { session_id: 1, event_type: 1 }
audit_transcripts:  { session_id: 1 } unique
nps_responses:      { session_id: 1 } unique
                    { campaign_id: 1, submitted_at: -1 }
escalations:        { campaign_id: 1, status: 1, timestamp: -1 }
campaigns_retention:{ campaign_id: 1 } unique
                    { status: 1, expires_at: 1 }
session_counters:   { session_id: 1 } unique
```

---

### LC-09 — EventBridge Rules

**Rol**: Entrega de eventos async desde otras lambdas hacia compliance-lambda.
**Bus**: default bus

**Reglas configuradas**:
| Nombre de Regla | Pattern | Target |
|----------------|---------|--------|
| `compliance-consent-rule` | `{ "detail-type": ["consent.recorded"] }` | entrevista-compliance Lambda |
| `compliance-eval-rule` | `{ "detail-type": ["evaluation.completed"] }` | entrevista-compliance Lambda |
| `compliance-session-rule` | `{ "detail-type": ["session.completed"] }` | entrevista-compliance Lambda |
| `compliance-escalation-rule` | `{ "detail-type": ["escalation.requested"] }` | entrevista-compliance Lambda |

**Retry policy** (cada regla):
```yaml
RetryPolicy:
  MaximumRetryAttempts: 3
  MaximumEventAgeInSeconds: 3600
DeadLetterConfig:
  Arn: !GetAtt ComplianceDLQ.Arn
```

---

### LC-10 — EventBridge Scheduler (purge diario)

**Rol**: Disparar el sweep de retencion de datos cada dia a las 02:00 UTC.
**Schedule**: `cron(0 2 * * ? *)`
**Target**: entrevista-compliance Lambda con payload `{ "detail-type": "retention.purge_sweep" }`
**Timeout del handler**: 300s (override del timeout default de 30s)

---

### LC-11 — SQS Dead Letter Queue

**Nombre**: `entrevista-compliance-dlq`
**Rol**: Captura eventos EventBridge que fallaron todos los reintentos.
**Configuracion**:
- Visibility timeout: 30s
- Message retention: 14 dias
- CloudWatch alarm: `DLQMessages MessagesVisible > 0` → SNS alert

---

### LC-12 — Lambda DLQ Processor

**Nombre**: `entrevista-compliance-dlq-processor`
**Rol**: Lee mensajes de la DLQ y reintenta el procesamiento con backoff exponencial.
**Trigger**: SQS event source mapping sobre `entrevista-compliance-dlq`
**Logica de retry**:
```
Intento 1: procesar evento directamente
Intento 2 (si falla): esperar 30s + reintentar
Intento 3 (si falla): esperar 120s + reintentar
Si falla intento 3: publicar a SNS: "DLQ_MAX_RETRIES_EXCEEDED"
```

---

### LC-13 — SNS Topic: entrevista-compliance-alerts

**Rol**: Canal primario de alertas para eventos criticos de seguridad y operaciones.
**Subscripciones** (configuradas por el equipo de operaciones):
- Email del equipo de seguridad (tamper detection)
- Slack webhook (via Lambda o SNS filter) para alertas operacionales

**Publicado por**:
- MongoDB Atlas Change Stream trigger (LC-08, tamper detection)
- EscalationAlertManager (LC-06)
- CloudWatch Alarm actions (LC-14)
- DLQ Processor (LC-12) al agotar reintentos

---

### LC-14 — CloudWatch (Logs + Metrics + Alarms)

**Log group**: `/aws/lambda/entrevista-compliance`
**Retention**: 90 dias (NFR-OBS-03)
**Log format**: JSON estructurado `{ "level", "component", "session_id", "event_type", "duration_ms", ... }`

**Namespace de metricas custom**: `EntreVista/Compliance`
**Metricas publicadas** (por compliance-lambda via boto3):
- `ConsentRecorded` — Count, Dimension: campaign_id
- `AuditEventLogged` — Count, Dimension: event_type
- `NPSScoreAverage` — Average, Dimension: campaign_id
- `EscalationCount` — Count, Dimension: reason
- `PurgeCycleRecordsDeleted` — Count, Dimension: purge_run_id
- `DLQMessagesReceived` — Count

**Alarmas** (5 alarmas, todas con accion → SNS):
| Alarma | Metric | Threshold | Periodo |
|--------|--------|-----------|---------|
| `ComplianceLambdaErrors` | Errors | > 5 | 5 min |
| `ComplianceLambdaThrottle` | Throttles | > 10 | 5 min |
| `ComplianceLambdaDuration` | Duration p99 | > 1200ms | 5 min |
| `AuditTamperDetected` | Log filter: "CRITICAL" | >= 1 | 1 min |
| `DLQMessages` | SQS ApproximateNumberOfMessagesVisible | > 0 | 5 min |

---

### LC-15 — AWS X-Ray

**Rol**: Trazabilidad end-to-end con subsegmentos por componente interno.
**Configuracion**: `XRAY_DAEMON_ADDRESS` inyectado como variable de entorno Lambda.

**Subsegmentos instrumentados** (via `entrevista-shared.xray`):
```python
with xray_recorder.in_subsegment("consent_manager.record_consent") as seg:
    seg.put_annotation("session_id", session_id)
    result = await db.consent_records.insert_one(doc)
```

**Anotaciones estandar** en todos los subsegmentos:
- `session_id`
- `campaign_id` (donde aplique)
- `component` (nombre del componente)

---

### LC-16 — AWS Secrets Manager

**Rol**: Almacenar credenciales y URIs de conexion. Nunca en variables de entorno texto plano.

**Secretos**:
| Nombre del secreto | Contenido | Usado por |
|--------------------|-----------|-----------|
| `entrevista/compliance/mongodb-uri` | Connection string MongoDB Atlas | motor_client.py |
| `entrevista/compliance/sns-topic-arn` | ARN del topic de alertas | EscalationAlertManager, AuditLogger tamper |
| `entrevista/compliance/jwt-secret` | Clave para validacion JWT | entrevista-shared.jwt_validator |

**Patron de uso en Lambda**:
```python
# Al arrancar la Lambda (modulo level), no en cada handler
secrets_client = boto3.client("secretsmanager")
MONGODB_URI = secrets_client.get_secret_value(SecretId="entrevista/compliance/mongodb-uri")["SecretString"]
```

---

### LC-17 — AWS KMS (CMK)

**Rol**: Clave maestra de cifrado para MongoDB Atlas Encryption at Rest.
**Alias**: `alias/entrevista-compliance-atlas`
**Tipo**: Symmetric CMK (AES-256)
**Rotacion**: Anual (activada en KMS Key policy)
**Acceso**: Solo el rol de MongoDB Atlas puede usar esta clave para encrypt/decrypt.

---

## Mapa de flujos criticos

### Flujo 1: Registro de consentimiento (POST /consent)
```
API GW HTTP → ComplianceRouter → JWT Validate (service_role)
    → ConsentManager.record_consent
        → SessionCounterStore.next_sequence (para primer AuditEvent)
        → db.consent_records.insert_one (w:majority, j:true)
            → DuplicateKeyError → HTTP 200 { idempotent: true }
            → OK → HTTP 201 Created
        → AuditLogger.log_event(CONSENT_RECORDED)
    ← HTTP 201/200
```

### Flujo 2: Procesamiento de evento EventBridge (consent.recorded)
```
EventBridge → Lambda handler (event_bridge_dispatcher)
    → ConsentManager.record_consent (mismo path que HTTP, idempotente)
    → Si falla → DLQ → entrevista-compliance-dlq-processor → retry x3
```

### Flujo 3: Purga diaria (EventBridge Scheduler)
```
EventBridge Scheduler (02:00 UTC) → Lambda handler
    → DataRetentionManager.run_purge_sweep
        → Fetch campaigns donde status=PURGE_READY
        → Para cada campaign: purge_campaign(campaign_id)
            → DELETE audit_transcripts, nps_responses, escalations
            → UPDATE audit_events SET payload=null
            → INSERT DATA_PURGED audit_event
            → UPDATE campaigns_retention SET status=PURGED
        ← PurgeSweepResult { campaigns_purged, records_deleted }
    → CloudWatch metric: PurgeCycleRecordsDeleted
```

### Flujo 4: Tamper detection (MongoDB Change Stream)
```
MongoDB Change Stream detecta UPDATE/DELETE en audit_events
    → Atlas Trigger publica a SNS: "AUDIT_TAMPER_DETECTED"
    → compliance-lambda recibe SNS event (via EventBridge o directo)
        → AuditLogger.handle_tamper_alert
            → INSERT TAMPER_DETECTED en audit_meta_events
            → log.critical("AUDIT_TAMPER_DETECTED session_id=...")
            → CloudWatch alarm "AuditTamperDetected" se activa (Canal 2)
```
