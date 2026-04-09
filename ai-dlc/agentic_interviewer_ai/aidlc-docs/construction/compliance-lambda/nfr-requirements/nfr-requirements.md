# NFR Requirements — compliance-lambda (Unit 5)

**Unidad**: Unit 5 - entrevista-compliance
**Generado**: 2026-04-08
**Basado en**: Functional Design + respuestas NFR Plan (P1–P10)

---

## 1. Escalabilidad

### NFR-ESC-01 — Volumen objetivo de sesiones concurrentes
**Requisito**: compliance-lambda debe soportar hasta **300 sesiones activas simultaneas** por campana (respuesta P1: B — Mediano).

**Implicaciones**:
- Lambda concurrency configurada con reserved concurrency = 300 instancias para esta funcion.
- MongoDB Atlas cluster tier minimo M10 (indexacion y escrituras concurrentes sostenidas).
- EventBridge Rule puede generar hasta 300 eventos simultaneos — Lambda escalara horizontalmente de forma automatica.

### NFR-ESC-02 — Escalado horizontal automatico
**Requisito**: comply con el modelo serverless de AWS Lambda. No hay capacidad que gestionar manualmente; el escalado es automatico hasta el limite de concurrencia configurado.

---

## 2. Performance

### NFR-PERF-01 — SLA de consent recording
**Requisito**: `POST /consent` debe responder con **p99 < 800ms** end-to-end, incluyendo escritura a MongoDB con `w: majority, j: true` (respuesta P2: B — Estandar).

**Desglose de presupuesto de latencia**:
| Operacion | Budget estimado |
|-----------|----------------|
| Cold start Lambda (arm64, 512MB) | ≤ 300ms |
| Conexion MongoDB Atlas (pool caliente) | ≤ 50ms |
| Escritura con w:majority | ≤ 200ms |
| Overhead FastAPI/Pydantic serialization | ≤ 50ms |
| **Total p99 warm** | **≤ 500ms** |
| **Total p99 con cold start** | **≤ 800ms** |

### NFR-PERF-02 — SLA de audit query
**Requisito**: `GET /audit/{session_id}` debe responder con **p99 < 1500ms** end-to-end, incluyendo fetch de audit_events paginados + transcript (respuesta P3: B — Estandar).

**Desglose de presupuesto de latencia**:
| Operacion | Budget estimado |
|-----------|----------------|
| Query `audit_events` (indice session_id) | ≤ 100ms |
| Query `audit_transcripts` (indice session_id) | ≤ 150ms |
| Serialization del response | ≤ 50ms |
| Cold start Lambda | ≤ 300ms |
| **Total p99 warm** | **≤ 400ms** |
| **Total p99 con cold start** | **≤ 1000ms** |

### NFR-PERF-03 — Paginacion de audit query
**Requisito**: `GET /audit/{session_id}` retorna eventos paginados y transcript en endpoint separado (respuesta P10: B).

**Endpoints resultantes**:
- `GET /audit/{session_id}/events?page=1&limit=50` — paginado, default limit=50, max limit=100
- `GET /audit/{session_id}/transcript` — transcript completo en una respuesta (no paginado)
- `GET /audit/{session_id}` — resumen: metadata de la sesion + primeros 20 eventos (vista rapida para el dashboard)

---

## 3. Availability

### NFR-AVAIL-01 — Disponibilidad objetivo
**Requisito**: compliance-lambda debe alcanzar **>= 99% de disponibilidad** mensual (respuesta P4: B — Non-blocking).

**SLO**: 99% uptime = maximo 7.3 horas de downtime al mes.

### NFR-AVAIL-02 — Modo non-blocking ante fallo
**Requisito**: Si compliance-lambda no puede procesar `POST /consent` (timeout, error 5xx), la sesion de entrevista **continua de todas formas** en conversation-lambda. El evento de consentimiento se encola en SQS DLQ para retry posterior.

**Impacto**: Un fallo de compliance-lambda no bloquea al candidato. La evidencia legal se recupera vía DLQ replay dentro de las siguientes horas.

**Nota de cumplimiento**: La sesion continua sin consentimiento confirmado solo en caso de fallo tecnico, no como comportamiento normal. Toda sesion deberia tener consent_record al finalizar.

---

## 4. Reliability

### NFR-REL-01 — Dead Letter Queue con auto-replay
**Requisito**: Configurar DLQ en SQS para eventos EventBridge que fallen el procesamiento. Auto-replay automatico con backoff exponencial, maximo 3 reintentos adicionales. Si persiste el fallo, alertar via SNS (respuesta P5: B).

**Configuracion**:
- SQS DLQ: `entrevista-compliance-dlq`
- Max receive count: 3 reintentos
- Visibility timeout: 30s
- Lambda para auto-replay: `entrevista-compliance-dlq-processor`
- Alarma CloudWatch: `DLQ-MessageCount > 0` → SNS alert

### NFR-REL-02 — Idempotencia obligatoria en todos los handlers
**Requisito**: Todos los handlers de EventBridge y endpoints HTTP son idempotentes. Un evento procesado dos veces no produce duplicados ni efectos laterales adicionales.

**Patron**: DuplicateKeyError en MongoDB = ya procesado = retornar OK sin error.

### NFR-REL-03 — Atomic counter para chain hash
**Requisito**: El `sequence_number` de audit_events se genera con `$inc` atomico en MongoDB usando `findOneAndUpdate` con `upsert=True` en una coleccion de contadores separada `session_counters`. Esto serializa las escrituras por sesion y elimina la race condition (respuesta P6: A).

**Coleccion auxiliar** `session_counters`:
```json
{ "session_id": "uuid-xxx", "next_seq": 3 }
```
Operacion: `{ "$inc": { "next_seq": 1 } }` retorna el valor previo como `sequence_number`.

**Trade-off aceptado**: agrega ~20ms de latencia por evento de audit (write adicional a MongoDB), pero garantiza secuencia sin gaps.

### NFR-REL-04 — Politica de escritura durable
**Requisito**: Todas las escrituras a MongoDB usan `WriteConcern(w="majority", j=True)`. Ninguna escritura puede perder datos ante fallo del primary.

---

## 5. Security

### NFR-SEC-01 — Cifrado en reposo con AWS KMS
**Requisito**: MongoDB Atlas Encryption at Rest activado con **AWS KMS** como Key Management Service. La CMK (Customer Managed Key) es gestionada por el proyecto en la cuenta AWS de produccion (respuesta P7: B).

**Configuracion**:
- Atlas Encryption at Rest: enabled
- Key provider: AWS KMS
- CMK alias: `alias/entrevista-compliance-atlas`
- Rotation: anual (automatica via KMS key rotation)

### NFR-SEC-02 — Cifrado en transito
**Requisito**: Toda comunicacion con MongoDB Atlas usa TLS 1.2 minimo. Motor (motor de async MongoDB) se conecta con `tls=true` en el connection string.

### NFR-SEC-03 — Autenticacion JWT por role
**Requisito**: Todos los endpoints HTTP validan JWT usando `entrevista-shared.jwt_validator`. Los roles aceptados por endpoint estan definidos en BR-C13.

- `service_role` — para integraciones lambda-to-lambda (POST /consent, POST /nps, POST /audit/event)
- `authenticated` — para el dashboard (GET /audit/*, GET /nps/*)

### NFR-SEC-04 — IAM policy: deny deleteMany/updateMany
**Requisito**: El IAM role de la Lambda tiene una policy explicita que deniega `dynamodb:DeleteItem`, `dynamodb:UpdateItem` sobre las colecciones de audit en MongoDB (via VPC Endpoint si aplica). Adicionalmente, la politica a nivel de MongoDB Atlas via Data API Access Control deniega `delete` y `update` al rol Lambda.

### NFR-SEC-05 — IP Hash para consent_records
**Requisito**: Si el IP del candidato esta disponible, se almacena como SHA-256(IP + session_id + salt) — nunca el IP en texto plano. Privacidad por diseño (Ley 1581 Art. 4 — principio de minimizacion).

### NFR-SEC-06 — Variables de entorno via AWS Secrets Manager
**Requisito**: El connection string de MongoDB Atlas y el ARN del SNS topic se inyectan via AWS Secrets Manager (o SSM Parameter Store con SecureString), nunca hardcodeados ni via env vars en texto plano en el SAM template.

---

## 6. Observability

### NFR-OBS-01 — X-Ray con subsegmentos por componente
**Requisito**: AWS X-Ray activo con subsegmentos para cada componente interno (respuesta P8: C).

**Subsegmentos a instrumentar**:
| Subsegmento | Handler |
|-------------|---------|
| `consent_manager.record_consent` | ConsentManager |
| `audit_logger.log_event` | AuditLogger |
| `audit_logger.log_transcript` | AuditLogger |
| `nps_collector.store_response` | NPSCollector |
| `escalation.alert` | EscalationAlertManager |
| `retention.purge` | DataRetentionManager |
| `mongodb.write` | Cualquier escritura a MongoDB |
| `mongodb.read` | Cualquier lectura a MongoDB |

### NFR-OBS-02 — CloudWatch metrics custom
**Requisito**: Publicar las siguientes metricas custom a CloudWatch namespace `EntreVista/Compliance`:
- `ConsentRecorded` — count por campana
- `AuditEventLogged` — count por tipo de evento
- `NPSScoreAverage` — gauge por campana
- `EscalationCount` — count por razon
- `PurgeCycleRecordsDeleted` — count por purge_run_id
- `DLQMessagesReceived` — count

### NFR-OBS-03 — CloudWatch Logs retention: 90 dias
**Requisito**: Log group `/aws/lambda/entrevista-compliance` configurado con retention de **90 dias** (respuesta P9: C — alineado con retencion default de datos de entrevistas).

### NFR-OBS-04 — Alarmas CloudWatch
**Requisito**: Las siguientes alarmas deben estar configuradas (ademas de la alarma de DLQ):

| Alarma | Condicion | Accion |
|--------|-----------|--------|
| `ComplianceLambdaErrors` | Errors > 5 en 5 minutos | SNS alert |
| `ComplianceLambdaThrottle` | Throttles > 10 en 5 minutos | SNS alert |
| `ComplianceLambdaDuration` | p99 Duration > 1200ms | SNS alert |
| `AuditTamperDetected` | CRITICAL log pattern | SNS alert (ya en BR-C02) |
| `DLQMessages` | MessageCount > 0 | SNS alert |

---

## 7. Maintainability

### NFR-MAINT-01 — Cobertura de tests
**Requisito**: cobertura minima del **80%** en tests unitarios para todos los modulos de compliance-lambda.

**Componentes de mayor criticidad** (100% coverage obligatorio):
- `ConsentManager.record_consent` — idempotencia
- `AuditLogger.compute_chain_hash` — integridad de cadena
- `DataRetentionManager.purge_campaign` — riesgo de perdida de datos

### NFR-MAINT-02 — Separacion de entornos
**Requisito**: tres entornos desplegados independientemente: `dev`, `staging`, `prod`. Cada entorno tiene su propio MongoDB Atlas cluster (o namespace de base de datos separado) y su propio conjunto de secretos en AWS Secrets Manager.

### NFR-MAINT-03 — Dependency pinning
**Requisito**: todas las dependencias de compliance-lambda deben tener version exacta en `pyproject.toml` (sin rangos `>=`). La imagen de Lambda se construye con `uv sync --frozen`.
