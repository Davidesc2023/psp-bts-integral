# Infrastructure Design — compliance-lambda (Unit 5)

**Unidad**: Unit 5 - entrevista-compliance
**Generado**: 2026-04-08
**Cloud provider**: AWS
**Region primaria**: us-east-1

---

## 1. Compute — AWS Lambda

### Funcion principal: `entrevista-compliance`

| Parametro | Valor | Justificacion |
|-----------|-------|---------------|
| **Runtime** | python3.12 | Definido en unit-of-work |
| **Arquitectura** | arm64 | ~20% menor cold start vs x86_64 |
| **Memoria** | 512 MB | Adecuado para operaciones async MongoDB |
| **Timeout** | 30s | Suficiente para todos los endpoints HTTP |
| **Reserved concurrency** | 300 | NFR-ESC-01: max 300 sesiones concurrentes |
| **Handler** | `app.main.handler` | Mangum + EventBridge dispatcher |
| **Layers** | ninguno (zip self-contained) | Dependencias incluidas en el artifact |
| **Environment variables** | Solo nombres de secretos (no valores) | NFR-SEC-06 |
| **X-Ray tracing** | Active | NFR-OBS-01 |

**Variables de entorno** (valores en Secrets Manager):
```yaml
MONGODB_SECRET_NAME: "entrevista/compliance/mongodb-uri"
SNS_SECRET_NAME: "entrevista/compliance/sns-topic-arn"
JWT_SECRET_NAME: "entrevista/compliance/jwt-secret"
ENVIRONMENT: "prod"  # dev | staging | prod
LOG_LEVEL: "INFO"
AWS_XRAY_SDK_ENABLED: "true"
```

### Funcion DLQ Processor: `entrevista-compliance-dlq-processor`

| Parametro | Valor |
|-----------|-------|
| **Runtime** | python3.12 |
| **Arquitectura** | arm64 |
| **Memoria** | 256 MB |
| **Timeout** | 60s |
| **Handler** | `dlq_processor.handler` |
| **Reserved concurrency** | 5 (no necesita escalar) |

### Funcion de purga (mismo deployment, handler alternativo)

El DataRetentionManager se ejecuta como handler diferente dentro del **mismo artifact** `entrevista-compliance`, invocado via EventBridge Scheduler con un payload especifico. La configuracion de timeout es sobrescrita en el SAM template para este trigger:

```yaml
# En template.yaml — el evento de scheduler usa FunctionResponseTypes: ReportBatchItemFailures
# y un timeout de 300s definido as a separate function invocation configuration
```

---

## 2. API — API Gateway HTTP

### API: `entrevista-compliance-api`

| Parametro | Valor |
|-----------|-------|
| **Tipo** | HTTP API (v2) — menor latencia y costo que REST API |
| **Payload format** | 2.0 |
| **CORS** | Habilitado para dashboard origen (configurado en SAM) |
| **Stage** | `$default` (un stage por entorno via SAM) |
| **Throttling** | 300 req/s burst, 100 req/s rate (alineado con reserved concurrency) |
| **Timeout** | 29s (1s menor al timeout de Lambda) |

**Rutas mapeadas**:
```
POST   /consent                           → Lambda (service_role)
GET    /audit/{session_id}                → Lambda (authenticated)
GET    /audit/{session_id}/events         → Lambda (authenticated)
GET    /audit/{session_id}/transcript     → Lambda (authenticated)
GET    /audit/{session_id}/verify         → Lambda (authenticated)
POST   /audit/event                       → Lambda (service_role)
POST   /nps                               → Lambda (service_role)
GET    /nps/campaign/{campaign_id}        → Lambda (authenticated)
GET    /compliance/report/{campaign_id}   → Lambda (authenticated) — 501 stub
```

**Nota**: La autenticacion JWT es realizada por la Lambda misma via `entrevista-shared.jwt_validator`, no por un Lambda Authorizer de API GW.

---

## 3. Base de datos — MongoDB Atlas

### Cluster: `entrevista-cluster`

| Parametro | Valor |
|-----------|-------|
| **Tier** | M10 |
| **Provider** | AWS |
| **Region** | us-east-1 |
| **Encryption at Rest** | Activado, AWS KMS |
| **CMK** | `alias/entrevista-compliance-atlas` |
| **Backup** | Continuous backup activado (point-in-time recovery) |
| **TLS** | TLS 1.2 minimo |
| **Connection string** | Almacenado en Secrets Manager |

### Base de datos: `entrevista_compliance`

**Colecciones y configuracion de indices**:

```javascript
// consent_records
db.consent_records.createIndex({ "session_id": 1 }, { unique: true })
db.consent_records.createIndex({ "campaign_id": 1, "created_at": -1 })

// audit_events
db.audit_events.createIndex({ "session_id": 1, "sequence_number": 1 }, { unique: true })
db.audit_events.createIndex({ "session_id": 1, "event_type": 1 })
db.audit_events.createIndex({ "created_at": 1 })  // para queries de retencion

// audit_transcripts
db.audit_transcripts.createIndex({ "session_id": 1 }, { unique: true })
db.audit_transcripts.createIndex({ "campaign_id": 1, "created_at": -1 })

// nps_responses
db.nps_responses.createIndex({ "session_id": 1 }, { unique: true })
db.nps_responses.createIndex({ "campaign_id": 1, "submitted_at": -1 })

// escalations
db.escalations.createIndex({ "session_id": 1 })
db.escalations.createIndex({ "campaign_id": 1, "status": 1, "timestamp": -1 })

// campaigns_retention
db.campaigns_retention.createIndex({ "campaign_id": 1 }, { unique: true })
db.campaigns_retention.createIndex({ "status": 1, "expires_at": 1 })

// session_counters
db.session_counters.createIndex({ "session_id": 1 }, { unique: true })

// audit_meta_events (tamper detection trail)
db.audit_meta_events.createIndex({ "session_id": 1, "timestamp": -1 })
```

### Usuario de aplicacion MongoDB

| Parametro | Valor |
|-----------|-------|
| **Nombre** | `compliance-lambda-user` |
| **Roles** | `readWrite` en `entrevista_compliance` |
| **Restricciones adicionales** | Data API Access Control deniega `deleteMany`, `updateMany` en `audit_events` y `consent_records` |

### Change Stream Trigger

- **Nombre**: `compliance-tamper-detection`
- **Coleccion**: `entrevista_compliance.audit_events`
- **Operaciones monitoreadas**: `update`, `replace`, `delete`
- **Accion**: Publica a SNS topic `entrevista-compliance-alerts` via Atlas Function

---

## 4. Mensajeria — Amazon EventBridge

### EventBridge Rules (default bus, region us-east-1)

| Nombre | Event Pattern | Target | Retry |
|--------|--------------|--------|-------|
| `compliance-consent-rule` | `{ "detail-type": ["consent.recorded"] }` | `entrevista-compliance` Lambda | Max 3, 1h age |
| `compliance-eval-rule` | `{ "detail-type": ["evaluation.completed"] }` | `entrevista-compliance` Lambda | Max 3, 1h age |
| `compliance-session-rule` | `{ "detail-type": ["session.completed"] }` | `entrevista-compliance` Lambda | Max 3, 1h age |
| `compliance-escalation-rule` | `{ "detail-type": ["escalation.requested"] }` | `entrevista-compliance` Lambda | Max 3, 1h age |

Todas las reglas tienen `DeadLetterConfig` apuntando a `entrevista-compliance-dlq`.

### EventBridge Scheduler

| Parametro | Valor |
|-----------|-------|
| **Nombre** | `compliance-retention-purge` |
| **Schedule** | `cron(0 2 * * ? *)` — diario 02:00 UTC |
| **Target** | `entrevista-compliance` Lambda |
| **Payload** | `{ "detail-type": "retention.purge_sweep", "source": "aws.scheduler" }` |
| **Flexible time window** | OFF (ejecutar exactamente a las 02:00) |

---

## 5. Cola — Amazon SQS

### DLQ: `entrevista-compliance-dlq`

| Parametro | Valor |
|-----------|-------|
| **Tipo** | Standard Queue |
| **Visibility timeout** | 30s |
| **Message retention** | 14 dias |
| **Receive message wait time** | 20s (long polling) |
| **KMS encryption** | SSE-SQS (gestionado por AWS) |

**Event Source Mapping** hacia `entrevista-compliance-dlq-processor`:
- Batch size: 1 (procesar un mensaje a la vez para tener control de reintentos)
- Maximum concurrency: 2

---

## 6. Notificaciones — Amazon SNS

### Topic: `entrevista-compliance-alerts`

| Parametro | Valor |
|-----------|-------|
| **Tipo** | Standard Topic |
| **Display name** | `EntreVista Compliance Alerts` |
| **Encryption** | SSE habilitado con AWS KMS |

**Subscripciones** (a configurar por el equipo de operaciones, fuera del SAM template):
- Email para tamper detection (equipo seguridad)
- HTTP endpoint (Slack webhook via Lambda intermediaria) para alertas operacionales

---

## 7. Seguridad — AWS IAM

### IAM Role: `entrevista-compliance-role`

**Politicas adjuntas**:
```yaml
# AWSLambdaBasicExecutionRole (managed policy)
# AWSXRayDaemonWriteAccess (managed policy)

# Inline policy: compliance-secrets-policy
- Effect: Allow
  Action:
    - secretsmanager:GetSecretValue
  Resource:
    - arn:aws:secretsmanager:us-east-1:*:secret:entrevista/compliance/*

# Inline policy: compliance-sns-policy
- Effect: Allow
  Action:
    - sns:Publish
  Resource:
    - !Ref ComplianceAlertsTopic

# Inline policy: compliance-cloudwatch-policy
- Effect: Allow
  Action:
    - cloudwatch:PutMetricData
  Resource: "*"
  Condition:
    StringEquals:
      "cloudwatch:namespace": "EntreVista/Compliance"

# Inline policy: compliance-kms-policy (para Secrets Manager + SQS SSE)
- Effect: Allow
  Action:
    - kms:Decrypt
    - kms:GenerateDataKey
  Resource:
    - arn:aws:kms:us-east-1:*:key/*  # restringir a CMK especifica en prod
```

**Politica de DENY explicita** (inmutabilidad):
```yaml
# Esta politica existe a nivel de MongoDB Atlas Data API Access Control,
# no como IAM policy (MongoDB no es un servicio IAM-native).
# Ver seccion MongoDB Atlas: usuario compliance-lambda-user con restricciones.
```

### IAM Role: `entrevista-compliance-dlq-processor-role`
- `AWSLambdaBasicExecutionRole`
- `AWSLambdaSQSQueueExecutionRole` (para leer de SQS)
- `lambda:InvokeFunction` sobre `entrevista-compliance`

---

## 8. Cifrado — AWS KMS

### CMK: `alias/entrevista-compliance-atlas`

| Parametro | Valor |
|-----------|-------|
| **Tipo** | Symmetric (AES-256-GCM) |
| **Uso** | ENCRYPT_DECRYPT |
| **Rotacion** | Anual (automatica) |
| **Regiones** | us-east-1 (single region para MVP) |

**Key policy** (acceso restringido):
- Cuenta AWS del proyecto: administracion de la clave
- Rol MongoDB Atlas: uso de la clave (encrypt/decrypt)
- `entrevista-compliance-role`: NO tiene acceso directo (la Lambda no necesita la CMK del Atlas directamente)

---

## 9. Observabilidad

### CloudWatch Log Group

| Parametro | Valor |
|-----------|-------|
| **Nombre** | `/aws/lambda/entrevista-compliance` |
| **Retention** | 90 dias |
| **Log format** | JSON estructurado |

**Metric filters** (para alarmas):
```
# Filter: CRITICAL logs para tamper detection
FilterPattern: "{ $.level = \"CRITICAL\" }"
MetricName: AuditCriticalEvents
Namespace: EntreVista/Compliance
```

### CloudWatch Alarms (5 alarmas)

| Nombre | Metrica | Threshold | Periodo | Accion |
|--------|---------|-----------|---------|--------|
| `ComplianceLambdaErrors` | Lambda:Errors | > 5 | 5 min | SNS |
| `ComplianceLambdaThrottle` | Lambda:Throttles | > 10 | 5 min | SNS |
| `ComplianceLambdaDuration` | Lambda:Duration p99 | > 1200ms | 5 min | SNS |
| `AuditTamperDetected` | MetricFilter:AuditCriticalEvents | >= 1 | 1 min | SNS |
| `ComplianceDLQMessages` | SQS:ApproximateNumberOfMessagesVisible | > 0 | 5 min | SNS |

### AWS X-Ray

| Parametro | Valor |
|-----------|-------|
| **Sampling rate** | 5% en prod (suficiente para debugging de latencia) |
| **Sampling rate dev/staging** | 100% |
| **Grupos de trazas** | `entrevista-compliance` (filter por service name) |

---

## 10. Secrets Management — AWS Secrets Manager

| Nombre del secreto | Contenido | Rotation |
|--------------------|-----------|----------|
| `entrevista/compliance/mongodb-uri` | Connection string MongoDB Atlas | Manual (al rotar credenciales Atlas) |
| `entrevista/compliance/sns-topic-arn` | ARN del SNS topic | No rotation (ARN estatico) |
| `entrevista/compliance/jwt-secret` | JWT signing secret (32 bytes, hex) | Manual (coordinado con auth-lambda) |

---

## 11. Entornos

| Entorno | Stack SAM | MongoDB DB | Secrets prefix | Log retention |
|---------|-----------|------------|----------------|---------------|
| `dev` | `entrevista-compliance-dev` | `entrevista_compliance_dev` | `entrevista/dev/compliance/` | 7 dias |
| `staging` | `entrevista-compliance-staging` | `entrevista_compliance_staging` | `entrevista/staging/compliance/` | 30 dias |
| `prod` | `entrevista-compliance-prod` | `entrevista_compliance` | `entrevista/compliance/` | 90 dias |

---

## 12. Dependencias de infraestructura compartida

| Recurso | Compartido con | Razon |
|---------|---------------|-------|
| MongoDB Atlas Cluster `entrevista-cluster` | auth-lambda, conversation-lambda, evaluation-lambda | Un cluster compartido para MVP; bases de datos separadas por unidad |
| EventBridge default bus | Todas las lambdas | Bus unico por cuenta AWS |
| SNS Topic `entrevista-compliance-alerts` | Solo compliance-lambda | Topic dedicado para alertas de compliance |
| JWT Secret | auth-lambda, compliance-lambda | Misma clave de firma JWT en todo el sistema |
