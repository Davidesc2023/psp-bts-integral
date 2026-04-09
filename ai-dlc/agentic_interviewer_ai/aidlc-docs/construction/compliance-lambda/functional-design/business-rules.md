# Business Rules — compliance-lambda (Unit 5)

**Unidad**: Unit 5 - entrevista-compliance
**Generado**: 2026-04-08
**Stories**: US-23, US-24, US-25, US-30 (stub), US-33

---

## BR-C01 — Consent es write-once

**Story**: US-23
**Descripcion**: Un session_id solo puede tener un consent record. Intentos de registrar un segundo consentimiento para la misma sesion son ignorados silenciosamente (idempotencia).

**Regla**:
```
SI existe consent_record con session_id == nuevo_session_id
ENTONCES: retornar OK sin insertar (log DEBUG: "Duplicate consent ignored")
SI NO: insertar y retornar OK
```

**Implementacion**: indice unico en `consent_records.session_id`.

---

## BR-C02 — Audit events son append-only

**Story**: US-23
**Descripcion**: La coleccion `audit_events` nunca recibe operaciones `update` ni `delete` desde la aplicacion. Si se detectan via Change Stream, se genera una alerta critica.

**Regla**:
```
TODA escritura en "audit_events" DEBE ser solo INSERT
SI se detecta UPDATE o DELETE via Change Stream:
  PUBLICAR a SNS_COMPLIANCE_ALERT_TOPIC
  EMITIR log CloudWatch nivel CRITICAL: "AUDIT_TAMPER_DETECTED session_id={x}"
  INSERTAR evento TAMPER_DETECTED en "audit_meta_events"
```

---

## BR-C03 — Chain hash de integridad

**Story**: US-23
**Descripcion**: Cada audit event almacena un hash encadenado que permite detectar manipulaciones post-hoc, incluso si el Change Stream falla.

**Regla**:
```
chain_hash = SHA-256( event_type + payload_json + timestamp_iso + prev_hash )
prev_hash del PRIMER evento de una sesion = "GENESIS"
prev_hash de eventos subsiguientes = chain_hash del evento anterior (mismo session_id, ordenado por sequence_number)
```

**Verificacion** (endpoint `GET /audit/{session_id}/verify`):
```
Para cada par de eventos consecutivos (i, i+1):
  SI audit_events[i+1].prev_hash != SHA-256(audit_events[i]) → chain ROTA → retornar { valid: false, broken_at: sequence_i }
SI todos los pares son validos → retornar { valid: true }
```

---

## BR-C04 — Solo eventos criticos en tiempo real; transcript en batch

**Story**: US-23
**Descripcion**: No todos los mensajes se persisten en tiempo real. Solo los eventos criticos se registran via EventBridge inmediatamente.

**Eventos criticos (tiempo real)**:
| Tipo de evento | Cuando se genera |
|----------------|-----------------|
| `CONSENT_RECORDED` | Candidato da consentimiento |
| `SESSION_STARTED` | Inicio de sesion (primer mensaje) |
| `SESSION_PAUSED` | 5 minutos sin respuesta |
| `SESSION_RESUMED` | Candidato retoma la sesion |
| `SCORE_PARTIAL` | evaluation-lambda produce score parcial de una respuesta |
| `EVALUATION_COMPLETE` | evaluation-lambda finaliza con scores + citas |
| `HUMAN_DECISION` | Reclutador toma decision en dashboard |
| `NPS_SUBMITTED` | Candidato envia respuesta NPS |
| `SESSION_COMPLETED` | Sesion finalizada (trigger para batch transcript) |
| `ESCALATION_REQUESTED` | Candidato solicita hablar con humano |

**Datos en batch (al SESSION_COMPLETED)**:
- Transcript completo: todos los mensajes (candidato + agente) con timestamps

---

## BR-C05 — Trazabilidad 100%: todo score debe tener cita

**Story**: US-24
**Descripcion**: Ningun score puede existir en el audit log sin al menos una cita textual verbatim del transcript del candidato.

**Regla de validacion** (al recibir EVALUATION_COMPLETE):
```
PARA CADA score en evaluation_payload.scores:
  SI score.citations ES VACIO O nulo:
    RECHAZAR el evento y publicar alerta: "SCORE_WITHOUT_CITATION evaluation_id={x} competency={y}"
  SI ALGUNA citation.text NO es subcadena exacta de session_transcript:
    MARCAR como CITATION_INTEGRITY_WARNING (no bloquea, pero se loguea)
```

**Nota**: La validacion de citation.text como subcadena exacta requiere que el transcript ya este disponible. Si llega EVALUATION_COMPLETE antes que el transcript batch (race condition), la validacion de substring se omite y se marca como PENDING_VERIFICATION.

---

## BR-C06 — NPS score en rango [1, 5]

**Story**: US-25
**Descripcion**: Solo se aceptan scores NPS entre 1 y 5 inclusive. Cualquier valor fuera de rango se rechaza con HTTP 422.

**Regla**:
```
SI nps_payload.score < 1 OR nps_payload.score > 5:
  RETORNAR HTTP 422: { error: "NPS score must be between 1 and 5" }
```

---

## BR-C07 — NPS es unico por sesion

**Story**: US-25
**Descripcion**: Un candidato (session_id) solo puede enviar una respuesta NPS. Duplicados son ignorados.

**Regla**:
```
SI existe nps_response con session_id == nuevo_session_id:
  RETORNAR HTTP 200 sin insertar (idempotencia)
SI NO: insertar
```

---

## BR-C08 — Alerta NPS baja (average < 3.5)

**Story**: US-25
**Descripcion**: Si el promedio NPS de una campana cae por debajo de 3.5, el endpoint de stats debe indicarlo con un flag de alerta.

**Regla**:
```
stats.is_low_nps = (stats.average_score < 3.5)
```

El dashboard usa este flag para resaltar visualmente el metrico. compliance-lambda no envia ninguna notificacion proactiva por NPS bajo — solo lo indica en la respuesta del query.

---

## BR-C09 — Compliance Report retorna 501 en MVP

**Story**: US-30 (Should-Have — post-MVP)
**Descripcion**: El endpoint `GET /compliance/report/{campaign_id}` existe en el router pero retorna HTTP 501 Not Implemented en MVP.

**Regla**:
```
GET /compliance/report/{campaign_id}
SIEMPRE retornar HTTP 501: { error: "PDF export not yet implemented", available_in: "v1.1" }
```

---

## BR-C10 — Retencion minima: rango [30, 365] dias

**Story**: US-33 (Should-Have)
**Descripcion**: El periodo de retencion por campana debe estar entre 30 y 365 dias. El valor default es 90 dias si no se configura.

**Regla**:
```
SI retention_days < 30: RECHAZAR con "Minimum retention is 30 days"
SI retention_days > 365: RECHAZAR con "Maximum retention is 365 days"
SI no configurado: usar retention_days = 90
```

---

## BR-C11 — Purga selectiva: consent records NO se eliminan

**Story**: US-33
**Descripcion**: Al purgar los datos de un candidato, los `consent_records` y los campos basicos de `audit_events` se conservan por requerimiento legal (GDPR Art. 7 / Ley 1581 Colombia Art. 9).

**Que SE ELIMINA** en la purga:
- `audit_transcripts` — transcript completo de mensajes
- `nps_responses` — comentarios de texto libre (PII potencial)
- `escalations` — contiene excerpt de transcript
- Campos `payload` de `audit_events` que contengan texto del candidato

**Que NO SE ELIMINA**:
- `consent_records` — completo (base legal del procesamiento)
- `audit_events` — solo los campos: `session_id`, `event_type`, `timestamp`, `sequence_number`, `chain_hash`

---

## BR-C12 — Purga registra su propio audit trail

**Story**: US-33
**Descripcion**: Cada operacion de purga debe registrarse en el audit log para demostrar el cumplimiento del periodo de retencion.

**Regla**:
```
PARA CADA session_id purgado:
  INSERT audit_event: { event_type: "DATA_PURGED", session_id, timestamp, purge_run_id }
  (Este evento no contiene datos del candidato — solo el hecho de que fue purgado)
```

---

## BR-C13 — Autenticacion: service_role para lambdas, authenticated para dashboard

**Descripcion**: Los endpoints llamados por lambdas internas (conversation-lambda, evaluation-lambda) requieren JWT con role=service_role. Los endpoints llamados por el dashboard requieren JWT con role=authenticated.

| Endpoint | Role requerido |
|----------|---------------|
| `POST /nps` | `service_role` |
| `POST /audit/event` | `service_role` (o EventBridge — no JWT) |
| `GET /audit/{session_id}` | `authenticated` (operador del dashboard) |
| `GET /nps/campaign/{id}` | `authenticated` |
| `GET /compliance/report/{id}` | `authenticated` |
| EventBridge consumers | Sin JWT (evento firmado por AWS) |
| EventBridge scheduled (purge) | Sin JWT (evento firmado por AWS) |
