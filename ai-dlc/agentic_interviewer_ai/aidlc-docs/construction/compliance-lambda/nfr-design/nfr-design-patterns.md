# NFR Design Patterns — compliance-lambda (Unit 5)

**Unidad**: Unit 5 - entrevista-compliance
**Generado**: 2026-04-08
**Basado en**: nfr-requirements.md + tech-stack-decisions.md

---

## PAT-01 — Idempotency via Unique Index

**NFR origen**: NFR-REL-02, BR-C01, BR-C07
**Categoria**: Reliability

**Problema**: EventBridge at-least-once puede entregar el mismo evento dos veces. Si `POST /consent` se procesa dos veces para el mismo `session_id`, se insertaria un consent_record duplicado violando la integridad del audit trail.

**Solucion**:
1. Indice unico en MongoDB: `{ "session_id": 1 }` en las colecciones `consent_records` y `nps_responses`.
2. Al recibir un `DuplicateKeyError` en la capa de datos, el handler retorna `HTTP 200 OK` con body `{ "status": "already_recorded", "idempotent": true }`.
3. Ningun efecto lateral (SNS, CloudWatch metric) se produce en el path de retry.

**Diagrama**:
```
INSERT consent_record
    ├── OK → HTTP 201 Created + emit ConsentRecorded metric
    └── DuplicateKeyError → HTTP 200 OK { idempotent: true } (no metric, no SNS)
```

**Aplicacion**: ConsentManager, NPSCollector, AuditTranscript (session_id unique).

---

## PAT-02 — Write-Once Immutability con Doble Guardia

**NFR origen**: NFR-SEC-04, NFR-REL-04, BR-C02
**Categoria**: Security + Reliability

**Problema**: Un actor malicioso con acceso al rol Lambda podria intentar modificar o borrar audit_events para alterar la evidencia.

**Solucion** (dos capas independientes):

**Capa 1 — IAM Deny Policy** (infraestructura):
```json
{
  "Effect": "Deny",
  "Action": [
    "lambda:InvokeFunction"
  ],
  "Condition": { ... }
}
```
A nivel de MongoDB Atlas, el usuario de aplicacion tiene permisos `readWrite` pero la Data API Access Control deniega explicitamente `delete` y `update` sobre las colecciones `audit_events` y `consent_records`.

**Capa 2 — MongoDB Atlas Change Stream** (runtime):
- Trigger configurado sobre la coleccion `audit_events` que detecta operaciones `update`, `replace`, `delete`.
- Al detectarlas: publica inmediatamente a SNS topic `entrevista-compliance-alerts` + inserta un evento `TAMPER_DETECTED` en `audit_meta_events`.
- compliance-lambda emite log `CRITICAL: AUDIT_TAMPER_DETECTED session_id={x}` que dispara la alarma CloudWatch configurada.

**Flujo de tamper detection**:
```
MongoDB Change Stream detecta DELETE en audit_events
    → Publica a SNS: { "alert": "TAMPER_DETECTED", "collection": "audit_events", "session_id": "..." }
    → INSERT en audit_meta_events { event_type: "TAMPER_DETECTED", ... }
    → CloudWatch alarm "AuditTamperDetected" → SNS alert (segundo canal)
```

---

## PAT-03 — Chain Hash Integrity

**NFR origen**: BR-C03, NFR-REL-03
**Categoria**: Data Integrity

**Problema**: Incluso si el Change Stream falla o es bypasseado, se necesita un mecanismo criptografico para detectar modificaciones post-hoc en la secuencia de audit_events.

**Solucion**:

**Estructura de cada AuditEvent**:
```
chain_hash_i = SHA-256(event_type_i + payload_json_i + timestamp_iso_i + prev_hash_i)
prev_hash_i  = chain_hash_{i-1}   (o "GENESIS" si i=1)
```

**Generacion del sequence_number** (ver PAT-04 para atomicidad).

**Verificacion** (endpoint `GET /audit/{session_id}/verify`):
```python
events = sorted(audit_events, key=lambda e: e.sequence_number)
for i in range(1, len(events)):
    expected_prev = compute_hash(events[i-1])
    if events[i].prev_hash != expected_prev:
        return { "valid": False, "broken_at_sequence": events[i].sequence_number }
return { "valid": True, "event_count": len(events) }
```

**Propiedades**:
- Cualquier modificacion a `payload`, `timestamp`, o `event_type` de cualquier evento invalida todos los hashes subsiguientes.
- La verificacion es O(n) en el numero de eventos de la sesion.
- No requiere infraestructura adicional — es puramente computacional.

---

## PAT-04 — Atomic Sequence Counter

**NFR origen**: NFR-REL-03
**Categoria**: Reliability + Consistency

**Problema**: Si dos eventos de la misma sesion llegan en paralelo a dos instancias diferentes de compliance-lambda, ambas podrian asignar el mismo `sequence_number`, rompiendo la cadena de hashes.

**Solucion**: Coleccion `session_counters` con contador atomico per-session usando `$inc`.

**Operacion de asignacion de sequence_number**:
```python
result = await db.session_counters.find_one_and_update(
    filter={"session_id": session_id},
    update={"$inc": {"next_seq": 1}},
    upsert=True,
    return_document=ReturnDocument.BEFORE,  # retorna el valor ANTES del incremento
)
sequence_number = (result["next_seq"] if result else 0) + 1
```

**Propiedades**:
- `findOneAndUpdate` es atomico en MongoDB — garantiza que dos llamadas concurrentes reciben valores distintos.
- El primer evento de una sesion recibe `sequence_number = 1` (upsert crea el contador en 0, BEFORE retorna None/0).
- Trade-off: ~20ms de latencia adicional por evento de audit (write extra a session_counters).
- `session_counters` usa indice unico en `session_id`.

---

## PAT-05 — Dead Letter Queue con Auto-Replay

**NFR origen**: NFR-REL-01
**Categoria**: Reliability

**Problema**: EventBridge puede fallar la entrega de un evento (ej. Lambda throttled, timeout). Si el evento de consentimiento no se procesa, ese session_id no tiene consent_record y el candidato pudo haber completado la entrevista sin evidencia legal.

**Solucion**:

**Topologia**:
```
EventBridge Rule (consent.recorded)
    → compliance-lambda (intento 1-3 por Lambda retry policy)
    └── Si falla → SQS DLQ: entrevista-compliance-dlq
                       → Lambda: entrevista-compliance-dlq-processor
                           ├── Intento 1: procesar evento
                           ├── Intento 2 (backoff 30s)
                           ├── Intento 3 (backoff 120s)
                           └── Si falla → SNS alert: "DLQ_MAX_RETRIES_EXCEEDED"
```

**EventBridge Rule retry policy** (antes de ir a DLQ):
```yaml
RetryPolicy:
  MaximumRetryAttempts: 3
  MaximumEventAgeInSeconds: 3600
DeadLetterConfig:
  Arn: !GetAtt ComplianceDLQ.Arn
```

**entrevista-compliance-dlq-processor**: Lambda separada que lee de SQS, reinvoca el handler correcto segun `detail-type` del evento, con backoff exponencial.

---

## PAT-06 — Non-Blocking Async Consent

**NFR origen**: NFR-AVAIL-02
**Categoria**: Availability

**Problema**: Si compliance-lambda esta degradada, no se debe bloquear al candidato de iniciar la entrevista.

**Solucion**: conversation-lambda publica el evento `consent.recorded` a EventBridge **sin esperar confirmacion de compliance-lambda**. El candidato recibe OK inmediatamente.

**Flujo**:
```
Candidato acepta T&C
    → conversation-lambda: PUT /sessions/{id}/consent (local state: consent=True)
    → conversation-lambda: EventBridge.put_events(consent.recorded) → fire-and-forget
    → conversation-lambda: inicia flujo de entrevista sin esperar respuesta de compliance
    → (async, en paralelo) compliance-lambda: recibe evento, registra en MongoDB
```

**Garantia**: Si compliance-lambda falla y el evento va a DLQ, el registro se recupera via auto-replay (PAT-05) dentro de la hora. La sesion de entrevista no se bloquea.

---

## PAT-07 — Dual-Channel Alert

**NFR origen**: NFR-OBS-04, BR-C02
**Categoria**: Observability + Security

**Problema**: Un solo canal de alerta puede fallar. Para eventos criticos de seguridad (tamper detection, DLQ overflow), se necesita redundancia en la notificacion.

**Solucion** (dos canales independientes):

**Canal 1 — SNS Topic** (push proactivo):
```python
sns_client.publish(
    TopicArn=SNS_COMPLIANCE_ALERTS_ARN,
    Subject="AUDIT_TAMPER_DETECTED",
    Message=json.dumps({ "session_id": sid, "collection": "audit_events", ... })
)
```

**Canal 2 — CloudWatch Alarm** (pull + umbral):
```
Metric filter: "CRITICAL" en log group /aws/lambda/entrevista-compliance
    → CloudWatch Alarm: AuditTamperDetected
        → Alarm action: SNS publish (mismo topic o diferente)
```

**Resultado**: Si el Canal 1 (SNS directo) falla, el Canal 2 (CloudWatch alarm) actua de forma independiente. Ambos publican al mismo SNS topic para consolidar notificaciones.

---

## PAT-08 — Selective Data Purge

**NFR origen**: BR-C11, BR-C12
**Categoria**: Data Lifecycle + Compliance

**Problema**: GDPR Art. 17 y Ley 1581 Colombia requieren eliminar datos personales al vencer el periodo de retencion, pero GDPR Art. 7 y Ley 1581 Art. 9 requieren conservar la evidencia del consentimiento.

**Solucion**: Purga selectiva por campo, no por session_id completo.

**Algoritmo DataRetentionManager.purge_campaign(campaign_id)**:
```
1. Fetch CampaignRetentionConfig donde status=PURGE_READY y campaign_id=X
2. Para cada session_id de la campana:
   a. DELETE audit_transcripts donde session_id=sid
   b. DELETE nps_responses donde session_id=sid  
   c. DELETE escalations donde session_id=sid
   d. UPDATE audit_events SET payload=null donde session_id=sid
        (preserva event_type, timestamp, sequence_number, chain_hash, prev_hash)
   e. INSERT audit_event { event_type: DATA_PURGED, session_id: sid, purge_run_id: rid }
   f. consent_records: NO TOCAR
3. UPDATE campaigns_retention SET status=PURGED, purged_at=now(), purge_run_id=rid, records_purged=count
```

**Propiedades**:
- consent_records permanecen intactos (evidencia legal del consentimiento).
- audit_events mantienen la cadena de hashes (integridad del chain_hash) pero sin datos PII en `payload`.
- La verificacion de chain hash sigue siendo valida post-purga porque los campos usados para el hash (`event_type`, `timestamp`, `prev_hash`) no se modifican.

---

## PAT-09 — Connection Pool Warm-up

**NFR origen**: NFR-PERF-01 (budget de cold start)
**Categoria**: Performance

**Problema**: Motor (driver async de MongoDB) abre conexiones en el primer request. En cold start, la conexion a MongoDB Atlas puede agregar 200-400ms.

**Solucion**: Inicializar el `AsyncIOMotorClient` al nivel del modulo Python (fuera del handler), no dentro del handler de FastAPI.

```python
# motor_client.py — inicializacion al nivel del modulo
_client: AsyncIOMotorClient | None = None

def get_motor_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            MONGODB_URI,
            minPoolSize=5,
            maxPoolSize=50,
            tls=True,
            serverSelectionTimeoutMS=5000,
        )
    return _client
```

**Resultado**: En warm invocations, la conexion ya existe en el pool → latencia de MongoDB ≤ 50ms (dentro del budget NFR-PERF-01).

---

## PAT-10 — Paginated Audit Response

**NFR origen**: NFR-PERF-03
**Categoria**: Performance

**Problema**: Una sesion larga puede tener 50+ audit_events y un transcript con 200+ mensajes. Retornar todo en una respuesta produce payloads >1MB que aumentan la latencia de serialization y el costo de API Gateway.

**Solucion**: Separacion en tres endpoints con responsabilidades distintas.

**Endpoint 1** — Resumen de sesion (fast path para el dashboard):
```
GET /audit/{session_id}
Response: { session_id, consent_timestamp, event_count, last_event_type, has_transcript, has_nps }
Latencia objetivo: p99 < 200ms
```

**Endpoint 2** — Eventos paginados:
```
GET /audit/{session_id}/events?page=1&limit=50
Response: { events: [...], total: N, page: 1, pages: ceil(N/50) }
Latencia objetivo: p99 < 400ms
```

**Endpoint 3** — Transcript completo:
```
GET /audit/{session_id}/transcript
Response: { session_id, messages: [...], total_messages: N }
Latencia objetivo: p99 < 600ms (el transcript puede ser grande pero es un endpoint dedicado)
```
