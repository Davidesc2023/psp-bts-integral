# Plan de Code Generation — Unit 5: compliance-lambda
**Unidad**: `entrevista-compliance`  
**Ruta raíz**: `services/entrevista-compliance/`  
**Fecha**: 2026-04-08  
**Estado**: COMPLETE

---

## Trazabilidad a User Stories

| User Story | Descripción | Archivos principales |
|---|---|---|
| US-23 | Access Immutable Audit Log | `audit_router.py`, `audit_logger.py`, `models/audit.py` |
| US-24 | Verify 100% Evaluation Traceability | `audit_logger.py`, `session_counter_store.py` |
| US-25 | Track Candidate NPS and Experience Quality | `nps_router.py`, `nps_collector.py`, `models/nps.py` |
| US-30 | Export Compliance Report (501 stub) | `compliance_report_router.py` |
| US-33 | Configure Data Retention Period | `data_retention_manager.py`, `scheduler_handler.py` |

---

## Patrones NFR Implementados

| Patrón | Archivos |
|---|---|
| PAT-01 Idempotency (upsert con unique index) | `consent_manager.py` |
| PAT-02 Write-once dual-guard | `consent_manager.py` |
| PAT-03 Chain hash SHA-256 | `audit_logger.py` |
| PAT-04 Atomic counter `$inc` | `session_counter_store.py`, `audit_logger.py` |
| PAT-05 DLQ auto-replay | `dlq_processor/handler.py` |
| PAT-06 Non-blocking async (asyncio.create_task) | `escalation_alert_manager.py` |
| PAT-07 Dual-channel alert (SNS + CloudWatch) | `escalation_alert_manager.py` |
| PAT-08 Selective purge | `data_retention_manager.py` |
| PAT-09 Motor singleton | `db/motor_client.py` |
| PAT-10 X-Ray subsegmentos | todos los componentes |

---

## Pasos de Generación

### FASE 1: Project Scaffolding

- [x] **Paso 1 — `pyproject.toml`**  
  Ruta: `services/entrevista-compliance/pyproject.toml`  
  Contenido: uv workspace member, dependencias (fastapi 0.115.x, mangum 0.17.x, motor 3.6.x, pydantic-settings 2.x, boto3, aws-xray-sdk), dev-deps (pytest-asyncio, moto[sqs,sns,secretsmanager])  

- [x] **Paso 2 — `template.yaml`**  
  Ruta: `services/entrevista-compliance/template.yaml`  
  Contenido: SAM template completo con ComplianceLambda (arm64, 512MB) + DLQProcessorLambda, API GW HTTP, EventBridge rules x4, Scheduler, SQS DLQ, SNS topic, KMS key, Secrets Manager placeholder, Globals, Outputs

### FASE 2: Core Models

- [x] **Paso 3 — `app/models/consent.py`**  
  ConsentRecord (Pydantic v2 BaseModel), ConsentCreateRequest, ConsentResponse  
  Campos: session_id, candidate_id, interviewer_id, consented (bool), timestamp (datetime), method ("voice"|"click"), idempotency_key  

- [x] **Paso 4 — `app/models/audit.py`**  
  AuditEvent, AuditTranscript, AuditEventCreateRequest, AuditLogResponse  
  Campos: session_id, seq_num, event_type, actor_id, payload_hash, chain_hash_sha256, timestamp, prev_hash  

- [x] **Paso 5 — `app/models/nps.py`**  
  NPSResponse (Pydantic v2), NPSCreateRequest  
  Campos: session_id, candidate_id, score (0–10), comment (Optional[str]), timestamp  

- [x] **Paso 6 — `app/models/escalation.py`**  
  EscalationRecord, EscalationCreateRequest  
  Campos: session_id, reason, severity ("low"|"medium"|"high"|"critical"), sns_message_id, resolved (bool)  

- [x] **Paso 7 — `app/models/retention.py`**  
  RetentionPolicy, RetentionPolicyUpdateRequest  
  Campos: collection_name, retention_days (int ≥ 30), last_purge_at (Optional[datetime])  

### FASE 3: Database Layer

- [x] **Paso 8 — `app/db/motor_client.py`**  
  Singleton AsyncIOMotorClient (PAT-09)  
  `get_database()` → Motor database ref  
  Config: `w="majority"`, `j=True`, `wtimeout=5000`  
  Gestión limpia de conexión en SIGTERM  

### FASE 4: Configuration

- [x] **Paso 9 — `app/config.py`**  
  `Settings` class via pydantic-settings  
  Campos: mongodb_uri, db_name, jwt_secret, kms_key_id, sns_topic_arn, dlq_url, environment, log_level  
  `get_settings()` con lru_cache  

### FASE 5: Components (núcleo de negocio)

- [x] **Paso 10 — `app/components/consent_manager.py`**  
  `ConsentManager`:  
  - `record_consent()` → upsert con `idempotency_key` (PAT-01 + PAT-02 write-once dual-guard)  
  - X-Ray subsegmento "ConsentManager.record_consent" (PAT-10)  
  - Lanzar `ConsentAlreadyRecordedError` si existe y consented≠equal  

- [x] **Paso 11 — `app/components/session_counter_store.py`**  
  `SessionCounterStore`:  
  - `next_seq_num(session_id) → int` → `$inc` atómico en `session_counters` (PAT-04)  
  - upsert con `returnDocument=ReturnDocument.AFTER`  

- [x] **Paso 12 — `app/components/audit_logger.py`**  
  `AuditLogger`:  
  - `log_event()` → llamar `SessionCounterStore.next_seq_num()`, calcular chain hash SHA-256 (PAT-03), persistir `AuditEvent`  
  - `get_audit_log(session_id, page, limit)` → paginado  
  - `get_transcript(session_id)` → AuditTranscripts separados  
  - X-Ray subsegmento "AuditLogger.log_event" (PAT-10)  

- [x] **Paso 13 — `app/components/nps_collector.py`**  
  `NPSCollector`:  
  - `submit_nps()` → validar score 0–10, persistir NPSResponse  
  - `get_nps(session_id)` → NPSResponse  
  - Regla BR-C05: un NPS por sesión (upsert con session_id)  

- [x] **Paso 14 — `app/components/escalation_alert_manager.py`**  
  `EscalationAlertManager`:  
  - `raise_escalation()` → persistir EscalationRecord, publicar SNS (non-blocking asyncio.create_task) (PAT-06 + PAT-07)  
  - `publish_to_sns()` → boto3 SNS publish async wrapper  
  - `emit_cw_metric()` → boto3 CloudWatch PutMetricData (dual-channel PAT-07)  

- [x] **Paso 15 — `app/components/data_retention_manager.py`**  
  `DataRetentionManager`:  
  - `run_purge()` → leer RetentionPolicy por colección, eliminar docs con `timestamp < now - retention_days` (PAT-08 selective purge)  
  - `update_policy()` → validar retention_days ≥ 30  
  - X-Ray subsegmento "DataRetentionManager.run_purge"  

### FASE 6: Tests Unitarios

- [x] **Paso 16 — `tests/unit/test_consent_manager.py`**  
  Tests: record_consent OK, idempotency (mismo key → igual resultado), write-once (intento de cambio → error)  

- [x] **Paso 17 — `tests/unit/test_audit_logger.py`**  
  Tests: log_event OK (seq incremental), chain hash correcto, get_audit_log paginado

- [x] **Paso 18 — `tests/unit/test_session_counter_store.py`**  
  Tests: next_seq_num primer evento = 1, incremento secuencial  

- [x] **Paso 19 — `tests/unit/test_nps_collector.py`**  
  Tests: submit score válido, score inválido (< 0, > 10), un NPS por sesión  

- [x] **Paso 20 — `tests/unit/test_escalation_alert_manager.py`**  
  Tests: raise_escalation persiste + dispara SNS (mock), dual-channel CW metric  

- [x] **Paso 21 — `tests/unit/test_data_retention_manager.py`**  
  Tests: run_purge elimina docs anteriores a threshold, update_policy valida límite 30 días  

### FASE 7: Event Handlers

- [x] **Paso 22 — `app/handlers/eventbridge_dispatcher.py`**  
  `dispatch(event, context)` → router de eventos EventBridge  
  Mapeo: `compliance.consent.recorded` → ConsentManager, `compliance.audit.event` → AuditLogger, `compliance.escalation.raised` → EscalationAlertManager, `compliance.session.ended` → DataRetentionManager check  

- [x] **Paso 23 — `app/handlers/scheduler_handler.py`**  
  `handle_scheduled_event(event, context)` → invocar `DataRetentionManager.run_purge()`  
  Triggered por EventBridge Scheduler (diario 02:00 UTC)  

### FASE 8: Routers HTTP

- [x] **Paso 24 — `app/routers/consent_router.py`**  
  `POST /consent` → ConsentManager.record_consent()  
  Autenticación: JWT via entrevista-shared  
  Response 201/409 (idempotente)  

- [x] **Paso 25 — `app/routers/audit_router.py`**  
  `GET /audit/{session_id}` → AuditLogger.get_audit_log() (paginado ?page&limit)  
  `GET /audit/{session_id}/transcript` → AuditLogger.get_transcript()  
  `POST /audit/event` → AuditLogger.log_event()  

- [x] **Paso 26 — `app/routers/nps_router.py`**  
  `POST /nps` → NPSCollector.submit_nps()  
  `GET /nps/{session_id}` → NPSCollector.get_nps()  

- [x] **Paso 27 — `app/routers/compliance_report_router.py`**  
  `GET /compliance-report/{session_id}` → HTTP 501 Not Implemented (US-30 stub)  

### FASE 9: App Entry Point

- [x] **Paso 28 — `app/router.py`**  
  FastAPI app instance + inclusión de los 4 routers  
  Middleware: X-Ray, request logging  
  Health check: `GET /health`  

- [x] **Paso 29 — `app/main.py`**  
  Lambda handler: Mangum wrapper + EventBridge/Scheduler dispatcher  
  Lógica: si `event["source"]` existe → `eventbridge_dispatcher.dispatch()`, si scheduled → `scheduler_handler.handle_scheduled_event()`, else → Mangum HTTP handler  
  X-Ray `patch_all()` iniciado aquí  

### FASE 10: DLQ Processor

- [x] **Paso 30 — `dlq_processor/handler.py`**  
  Lambda handler standalone para SQS DLQ  
  Re-procesar mensajes fallidos: deserializar body, re-invocar componente apropiado (PAT-05)  
  Max 3 reintentos por mensaje; si agota → publicar SNS alert  

### FASE 11: Tests de Integración

- [x] **Paso 31 — `tests/integration/test_consent_flow.py`**  
  Test E2E: POST /consent → verificar en MongoDB mock  

- [x] **Paso 32 — `tests/integration/test_audit_chain.py`**  
  Test E2E: múltiples POST /audit/event → verificar chain hash linkage  

- [x] **Paso 33 — `tests/integration/test_nps_flow.py`**  
  Test E2E: POST /nps → GET /nps/{session_id}  

- [x] **Paso 34 — `tests/integration/test_dlq_replay.py`**  
  Test: mensaje en DLQ → processing exitoso con moto SQS mock  

### FASE 12: MongoDB Init Script

- [x] **Paso 35 — `scripts/init-mongodb.js`**  
  Crear colecciones: consent_records, audit_events, audit_transcripts, nps_responses, escalations, campaigns_retention, session_counters, audit_meta_events  
  Crear índices únicos: consent_records.idempotency_key, audit_events.(session_id+seq_num), nps_responses.session_id  
  Crear índices de consulta: audit_events.session_id, audit_events.timestamp, escalations.session_id  

### FASE 13: Documentación de Código

- [x] **Paso 36 — `aidlc-docs/construction/compliance-lambda/code/code-generation-summary.md`**  
  Resumen de archivos generados, decisiones de implementación, coverage de stories/patrones  

---

## Resumen de Archivos a Generar

| # | Archivo | Fase |
|---|---|---|
| 1 | `services/entrevista-compliance/pyproject.toml` | Scaffolding |
| 2 | `services/entrevista-compliance/template.yaml` | Scaffolding |
| 3 | `services/entrevista-compliance/app/models/consent.py` | Models |
| 4 | `services/entrevista-compliance/app/models/audit.py` | Models |
| 5 | `services/entrevista-compliance/app/models/nps.py` | Models |
| 6 | `services/entrevista-compliance/app/models/escalation.py` | Models |
| 7 | `services/entrevista-compliance/app/models/retention.py` | Models |
| 8 | `services/entrevista-compliance/app/db/motor_client.py` | DB Layer |
| 9 | `services/entrevista-compliance/app/config.py` | Config |
| 10 | `services/entrevista-compliance/app/components/consent_manager.py` | Components |
| 11 | `services/entrevista-compliance/app/components/session_counter_store.py` | Components |
| 12 | `services/entrevista-compliance/app/components/audit_logger.py` | Components |
| 13 | `services/entrevista-compliance/app/components/nps_collector.py` | Components |
| 14 | `services/entrevista-compliance/app/components/escalation_alert_manager.py` | Components |
| 15 | `services/entrevista-compliance/app/components/data_retention_manager.py` | Components |
| 16 | `tests/unit/test_consent_manager.py` | Unit Tests |
| 17 | `tests/unit/test_audit_logger.py` | Unit Tests |
| 18 | `tests/unit/test_session_counter_store.py` | Unit Tests |
| 19 | `tests/unit/test_nps_collector.py` | Unit Tests |
| 20 | `tests/unit/test_escalation_alert_manager.py` | Unit Tests |
| 21 | `tests/unit/test_data_retention_manager.py` | Unit Tests |
| 22 | `services/entrevista-compliance/app/handlers/eventbridge_dispatcher.py` | Handlers |
| 23 | `services/entrevista-compliance/app/handlers/scheduler_handler.py` | Handlers |
| 24 | `services/entrevista-compliance/app/routers/consent_router.py` | Routers |
| 25 | `services/entrevista-compliance/app/routers/audit_router.py` | Routers |
| 26 | `services/entrevista-compliance/app/routers/nps_router.py` | Routers |
| 27 | `services/entrevista-compliance/app/routers/compliance_report_router.py` | Routers |
| 28 | `services/entrevista-compliance/app/router.py` | App Entry |
| 29 | `services/entrevista-compliance/app/main.py` | App Entry |
| 30 | `services/entrevista-compliance/dlq_processor/handler.py` | DLQ |
| 31 | `tests/integration/test_consent_flow.py` | Integration Tests |
| 32 | `tests/integration/test_audit_chain.py` | Integration Tests |
| 33 | `tests/integration/test_nps_flow.py` | Integration Tests |
| 34 | `tests/integration/test_dlq_replay.py` | Integration Tests |
| 35 | `services/entrevista-compliance/scripts/init-mongodb.js` | DB Init |
| 36 | `aidlc-docs/construction/compliance-lambda/code/code-generation-summary.md` | Docs |

**Total**: 36 archivos

---

## Dependencias Externas

- `packages/entrevista-shared/` (ya generado en Unit 6):
  - `entrevista_shared.jwt_validator` → usado en todos los routers  
  - `entrevista_shared.xray` → subsegmentos en componentes  

---

## ⚠️ ESPERANDO APROBACIÓN DEL USUARIO

Una vez aprobado, se procederá con la generación fase por fase, marcando cada checkbox al completar.
