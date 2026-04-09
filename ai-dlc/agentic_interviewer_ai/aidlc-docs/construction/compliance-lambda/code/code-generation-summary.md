# Code Generation Summary — Unit 5: compliance-lambda
**Unidad**: `entrevista-compliance`  
**Etapa**: Code Generation  
**Estado**: COMPLETE  
**Fecha de completitud**: 2026-04-09  
**Total de archivos generados**: 36  

---

## Resumen Ejecutivo

Se generaron 36 archivos de código en `services/entrevista-compliance/` cubriendo
las User Stories US-23, US-24, US-25, US-30 (501 stub) y US-33, junto con
10 patrones NFR (PAT-01 a PAT-10).

La lambda C expone una API HTTP (FastAPI + Mangum sobre API Gateway HTTP API)
y consume eventos de EventBridge + un cron diario de EventBridge Scheduler.
Un segundo Lambda independiente (`DLQProcessorLambda`) maneja mensajes en la
Dead Letter Queue.

---

## Archivos Generados por Fase

### FASE 1 — Project Scaffolding (2 archivos)

| # | Archivo | Descripción |
|---|---|---|
| 1 | `pyproject.toml` | uv workspace member; deps: fastapi 0.115.x, mangum 0.17.x, motor 3.6.x, pydantic-settings 2.x, boto3, aws-xray-sdk, aws-lambda-powertools |
| 2 | `template.yaml` | SAM template: ComplianceLambda (arm64/512MB) + DLQProcessorLambda, API GW HTTP, EventBridge 4 rules, Scheduler cron(0 2 * * ? *), SQS DLQ, SNS topic, KMS CMK, 3 alarms |

### FASE 2 — Core Models (5 archivos)

| # | Archivo | Descripción |
|---|---|---|
| 3 | `app/models/consent.py` | `ConsentCreateRequest`, `ConsentRecord`, `ConsentResponse`; campos: session_id, candidate_id, consented (bool), idempotency_key, timestamp, method |
| 4 | `app/models/audit.py` | `AuditEvent`, `AuditTranscript`, `AuditEventCreateRequest`, `AuditLogResponse`; campos: seq_num, payload_hash, chain_hash_sha256, prev_hash |
| 5 | `app/models/nps.py` | `NPSCreateRequest`, `NPSResponse`; campos: score (0–10), comment, `categorize()` → Detractor/Passive/Promoter |
| 6 | `app/models/escalation.py` | `EscalationCreateRequest`, `EscalationRecord`; severity: "low"\|"medium"\|"high"\|"critical" |
| 7 | `app/models/retention.py` | `RetentionPolicy`, `PURGEABLE_COLLECTIONS` (7 entradas), `MIN_RETENTION_DAYS=30` |

### FASE 3 — Database Layer (1 archivo)

| # | Archivo | Descripción |
|---|---|---|
| 8 | `app/db/motor_client.py` | Singleton `AsyncIOMotorClient`; `w="majority"`, `j=True`, `wtimeoutMS=5000`; gestor SIGTERM limpio |

### FASE 4 — Configuration (1 archivo)

| # | Archivo | Descripción |
|---|---|---|
| 9 | `app/config.py` | `Settings` (pydantic-settings); `get_settings()` con `lru_cache`; resolver de Secrets Manager para `mongodb_uri` y `jwt_secret` |

### FASE 5 — Components (6 archivos)

| # | Archivo | Patrones implementados |
|---|---|---|
| 10 | `app/components/consent_manager.py` | PAT-01 (upsert unique index), PAT-02 (write-once dual-guard), PAT-10 (X-Ray) |
| 11 | `app/components/session_counter_store.py` | PAT-04 (`$inc` atómico, `find_one_and_update` + `ReturnDocument.AFTER` upsert=True) |
| 12 | `app/components/audit_logger.py` | PAT-03 (chain hash SHA-256, `GENESIS_HASH="0"*64`), PAT-04, PAT-10 |
| 13 | `app/components/nps_collector.py` | BR-C05 (un NPS por sesión; upsert por `session_id`) |
| 14 | `app/components/escalation_alert_manager.py` | PAT-06 (`asyncio.create_task` fire-and-forget), PAT-07 (SNS + CloudWatch dual-channel) |
| 15 | `app/components/data_retention_manager.py` | PAT-08 (purge selectivo por timestamp; `DEFAULT_RETENTION_DAYS[consent_records]=2555`) |

### FASE 6 — Tests Unitarios (6 archivos, 31 tests)

| # | Archivo | Tests |
|---|---|---|
| 16 | `tests/unit/test_consent_manager.py` | 5 — OK, idempotency, write-once error, conflict detection |
| 17 | `tests/unit/test_audit_logger.py` | 4 — log_event secuencial, chain hash genesis→n, get_audit_log paginado |
| 18 | `tests/unit/test_session_counter_store.py` | 5 — first=1, increment, upsert=True |
| 19 | `tests/unit/test_nps_collector.py` | 7 — score válido, score inválido (<0, >10), un NPS por sesión, get |
| 20 | `tests/unit/test_escalation_alert_manager.py` | 5 — fire-and-forget, SNS mock, CW metric, resolved flag |
| 21 | `tests/unit/test_data_retention_manager.py` | 4 — retention validation (días < 30 falla), purge threshold, update_policy |

### FASE 7 — Event Handlers (2 archivos)

| # | Archivo | Descripción |
|---|---|---|
| 22 | `app/handlers/eventbridge_dispatcher.py` | Router de 4 tipos de eventos: `compliance.consent.recorded`, `compliance.audit.event`, `compliance.escalation.raised`, `compliance.session.ended` |
| 23 | `app/handlers/scheduler_handler.py` | Cron diario → `DataRetentionManager.run_purge()` con logging de resultados |

### FASE 8 — Routers HTTP (4 archivos)

| # | Archivo | Endpoints |
|---|---|---|
| 24 | `app/routers/consent_router.py` | `POST /consent` (201/409), `GET /consent/{session_id}` |
| 25 | `app/routers/audit_router.py` | `GET /audit/{session_id}?page&limit`, `GET /audit/{session_id}/transcript`, `POST /audit/event` |
| 26 | `app/routers/nps_router.py` | `POST /nps`, `GET /nps/{session_id}` |
| 27 | `app/routers/compliance_report_router.py` | `GET /compliance-report/{session_id}` → 501 Not Implemented (US-30 stub, `planned_version: "2.0"`) |

### FASE 9 — App Entry Point (2 archivos)

| # | Archivo | Descripción |
|---|---|---|
| 28 | `app/router.py` | FastAPI factory + CORS + 4 routers + `GET /health` |
| 29 | `app/main.py` | Lambda handler: `patch_all()`, routing logic (EventBridge Scheduler → scheduler_handler, `entrevista.*` → eventbridge_dispatcher, HTTP → Mangum) |

### FASE 10 — DLQ Processor (1 archivo)

| # | Archivo | Descripción |
|---|---|---|
| 30 | `dlq_processor/handler.py` | `MAX_RETRIES=3`; si `ApproximateReceiveCount >= 3` → SNS alert sin re-encolar; batch item failures |

### FASE 11 — Tests de Integración (4 archivos)

| # | Archivo | Tests |
|---|---|---|
| 31 | `tests/integration/test_consent_flow.py` | 201 crear, 200 idempotente, 409 conflicto |
| 32 | `tests/integration/test_audit_chain.py` | Chain linkage N eventos, tamper detection |
| 33 | `tests/integration/test_nps_flow.py` | submit→get + validaciones de límites 0/10 |
| 34 | `tests/integration/test_dlq_replay.py` | replay OK, exhausted SNS alert, batch_item_failures |

### FASE 12 — MongoDB Init Script (1 archivo)

| # | Archivo | Descripción |
|---|---|---|
| 35 | `scripts/init-mongodb.js` | 8 colecciones + 6 índices únicos + índices de consulta + seed de 7 políticas de retención por defecto |

### FASE 13 — Documentación (1 archivo)

| # | Archivo | Descripción |
|---|---|---|
| 36 | `aidlc-docs/construction/compliance-lambda/code/code-generation-summary.md` | Este documento |

---

## Cobertura de User Stories

| User Story | Descripción | Archivos principales | Estado |
|---|---|---|---|
| **US-23** | Access Immutable Audit Log | `audit_router.py`, `audit_logger.py`, `models/audit.py`, `test_audit_chain.py` | ✅ COMPLETO |
| **US-24** | Verify 100% Evaluation Traceability | `audit_logger.py` (chain hash PAT-03), `session_counter_store.py` (PAT-04) | ✅ COMPLETO |
| **US-25** | Track Candidate NPS and Experience Quality | `nps_router.py`, `nps_collector.py`, `models/nps.py`, `test_nps_flow.py` | ✅ COMPLETO |
| **US-30** | Export Compliance Report | `compliance_report_router.py` (501 stub → v2.0) | ✅ STUB (planificado v2) |
| **US-33** | Configure Data Retention Period | `data_retention_manager.py`, `scheduler_handler.py`, `test_data_retention_manager.py` | ✅ COMPLETO |

---

## Cobertura de Patrones NFR

| Patrón | Descripción | Archivos | Estado |
|---|---|---|---|
| **PAT-01** | Idempotency — upsert con unique index | `consent_manager.py`, `init-mongodb.js` | ✅ |
| **PAT-02** | Write-once dual-guard | `consent_manager.py` (`ConsentAlreadyRecordedError`) | ✅ |
| **PAT-03** | Chain hash SHA-256 | `audit_logger.py` (`GENESIS_HASH="0"*64`) | ✅ |
| **PAT-04** | Atomic counter `$inc` | `session_counter_store.py`, `audit_logger.py` | ✅ |
| **PAT-05** | DLQ auto-replay + exhaustion alert | `dlq_processor/handler.py` (`MAX_RETRIES=3`) | ✅ |
| **PAT-06** | Non-blocking async (`asyncio.create_task`) | `escalation_alert_manager.py` | ✅ |
| **PAT-07** | Dual-channel alert (SNS + CloudWatch) | `escalation_alert_manager.py` | ✅ |
| **PAT-08** | Selective data purge | `data_retention_manager.py` (`consent_records=2555d`) | ✅ |
| **PAT-09** | Motor singleton + SIGTERM handler | `db/motor_client.py` | ✅ |
| **PAT-10** | X-Ray subsegmentos | todos los componentes + `main.py` `patch_all()` | ✅ |

---

## Decisiones de Implementación

### 1. Routing en `main.py`
```
ScheduledEvent / aws.scheduler → scheduler_handler.handle_scheduled_event()
source.startswith("entrevista.") → eventbridge_dispatcher.dispatch()
else → _mangum_handler (HTTP API Gateway)
```
La separación permite que la Lambda sirva ambos tipos de invocación (HTTP y eventos)
sin duplicar el handler.

### 2. Chain Hash — GENESIS_HASH
El primer evento de una sesión usa `prev_hash = "0" * 64` (sentinel value).
Esto evita una consulta DB para el primer evento y hace el genesis determinístico.

### 3. US-30 — HTTP 501 stub
La generación de reportes de compliance (US-30) requiere integración con un motor de
templates externo. Se implementó un stub limpio con respuesta JSON estructurada que
incluye `planned_version: "2.0"` para facilitar la implementación futura sin romper
contratos de API.

### 4. `consent_records` retention = 2555 días (7 años)
Cumple con Ley 1581 de Colombia (protección de datos personales) y lineamientos
GDPR equivalentes para datos de candidatos.

### 5. MAX_RETRIES = 3 en DLQ
El valor de 3 proviene del DLQ redrive policy definido en `template.yaml`
(`maxReceiveCount: 3`). Ambos valores deben mantenerse en sincronía.

---

## Métricas de Generación

| Métrica | Valor |
|---|---|
| Total de archivos | 36 |
| Líneas de código (estimado) | ~3,200 |
| Tests unitarios | 31 (6 archivos) |
| Tests de integración | ~16 (4 archivos) |
| Colecciones MongoDB | 8 |
| Índices únicos | 6 |
| Políticas de retención seed | 7 |
| User Stories cubiertas | 5/5 |
| Patrones NFR implementados | 10/10 |

---

## Siguiente Etapa

**Build and Test (Unit 5 — compliance-lambda)**

Acciones previstas:
1. `uv sync` en workspace raíz para instalar dependencias
2. `pytest tests/unit/` — 31 tests unitarios
3. `pytest tests/integration/` — tests de integración con moto mocks
4. `sam build` para compilar Lambda layer arm64
5. Correcciones de errores encontrados (Fix Loop)
