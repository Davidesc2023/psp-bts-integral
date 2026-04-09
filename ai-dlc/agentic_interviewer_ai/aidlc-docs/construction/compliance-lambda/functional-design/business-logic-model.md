# Business Logic Model — compliance-lambda (Unit 5)

**Unidad**: Unit 5 - entrevista-compliance
**Generado**: 2026-04-08
**Stories**: US-23, US-24, US-25, US-30 (stub), US-33

---

## Componentes y sus responsabilidades

### ComplianceRouter (FastAPI App)
Punto de entrada HTTP del servicio. Recibe requests de conversation-lambda, evaluation-lambda y el dashboard. Valida JWT en cada request via `entrevista-shared.verify_supabase_token` (excepto endpoints llamados por lambdas internas que usan service_role).

**Endpoints expuestos**:

| Metodo | Path | Llamado por | Proposito |
|--------|------|-------------|-----------|
| `POST` | `/consent` | EventBridge consumer (interno) | Registrar consent record |
| `POST` | `/audit/event` | EventBridge consumer (interno) | Registrar un audit event critico |
| `POST` | `/audit/session` | EventBridge consumer (interno) | Registrar transcript batch al cerrar sesion |
| `GET` | `/audit/{session_id}` | dashboard (JWT authenticated) | Consultar audit log completo de una sesion |
| `POST` | `/nps` | conversation-lambda (service_role JWT) | Registrar respuesta NPS de un candidato |
| `GET` | `/nps/campaign/{campaign_id}` | dashboard (JWT authenticated) | Consultar stats NPS de una campana |
| `DELETE` | `/retention/purge` | EventBridge scheduled job | Ejecutar sweep de datos expirados |
| `GET` | `/compliance/report/{campaign_id}` | dashboard (JWT authenticated) | Retorna HTTP 501 (post-MVP stub) |

---

### ConsentManager

**Proposito**: Registrar el consentimiento explicito del candidato de forma write-once.

**Flujo principal**:
```
EventBridge recibe evento "consent.recorded" publicado por conversation-lambda
  └─ ConsentManager.record_consent(event_payload)
       ├─ Validar que session_id no tiene consent previo (idempotencia)
       ├─ Construir ConsentRecord (session_id, candidate_telegram_id, timestamp, ip_hash, consent_text_version)
       ├─ Insertar en MongoDB coleccion "consent_records" con w:majority, j:true
       └─ Publicar audit event: { type: "CONSENT_RECORDED", session_id, timestamp }
```

**Idempotencia**: Si llega un duplicado del evento (at-least-once delivery de EventBridge), el segundo insert falla con `DuplicateKeyError` (index unico en `session_id`). Se loguea como warning y se retorna 200 (no error — ya estaba registrado).

---

### AuditLogger

**Proposito**: Persistir todos los eventos del ciclo de vida de una sesion de forma inmutable y generar alertas si se detecta manipulacion.

**Flujo — evento critico en tiempo real**:
```
EventBridge recibe evento de tipo critico (consent, pause, resume, session_complete, score_partial)
  └─ AuditLogger.log_event(event)
       ├─ Construir AuditEvent (session_id, event_type, payload, timestamp, sequence_number)
       ├─ Calcular hash SHA-256 del payload + timestamp + sequence_number anterior (chain hash)
       ├─ Insertar en MongoDB coleccion "audit_events" con w:majority, j:true
       └─ Retornar OK
```

**Flujo — transcript batch al cerrar sesion**:
```
EventBridge recibe evento "session.completed" con transcript_payload
  └─ AuditLogger.log_transcript(session_id, transcript_payload)
       ├─ Verificar que session_id existe en audit_events (sesion conocida)
       ├─ Insertar en MongoDB coleccion "audit_transcripts" con transcript completo
       ├─ Marcar sesion como TRANSCRIPT_STORED en audit_sessions
       └─ Retornar OK
```

**Flujo — deteccion de manipulacion (Change Stream)**:
```
MongoDB Atlas Change Stream (configurado en infrastructure) detecta update/delete en "audit_events" o "audit_transcripts"
  └─ Lambda trigger (o Atlas Trigger) llama compliance-lambda POST /audit/tamper-alert
       └─ AuditLogger.handle_tamper_alert(change_event)
            ├─ Publicar a SNS Topic (ARN configurado en env var COMPLIANCE_ALERT_SNS_ARN)
            ├─ Emitir log CloudWatch nivel CRITICAL (para alarma de CloudWatch)
            └─ Insertar audit_meta_event de tipo TAMPER_DETECTED (en coleccion separada — mas segura)
```

**Cadena de hash** (chain integrity):
- Cada evento almacena `prev_hash`: SHA-256 del evento anterior de la misma sesion.
- Primer evento de sesion tiene `prev_hash = "GENESIS"`.
- Cualquier modificacion a un evento rompe la cadena. El dashboard puede verificar integridad llamando `GET /audit/{session_id}/verify`.

---

### EscalationAlertManager

**Proposito**: Gestionar alertas de escalacion generadas por conversation-lambda (cuando un candidato solicita hablar con un humano, US-09).

**Flujo**:
```
conversation-lambda publica evento "escalation.requested" a EventBridge
  └─ EscalationAlertManager.handle_escalation(event)
       ├─ Construir EscalationRecord (session_id, candidate_id, reason, transcript_excerpt, timestamp)
       ├─ Insertar en MongoDB coleccion "escalations"
       ├─ Publicar notificacion a SNS Topic (ESCALATION_SNS_ARN)
       └─ Registrar AuditEvent de tipo ESCALATION_REQUESTED
```

**Nota**: La entrega de la notificacion al reclutador (email/Slack) es responsabilidad del suscriptor del SNS Topic — no de compliance-lambda.

---

### NPSCollector

**Proposito**: Almacenar respuestas NPS de candidatos y exponer estadisticas por campana.

**Flujo de registro**:
```
conversation-lambda envia POST /nps con { session_id, campaign_id, score: 1-5, comment?: string }
  └─ NPSCollector.record_response(payload)
       ├─ Validar score en rango [1, 5]
       ├─ Verificar que session_id no tiene NPS previo (idempotencia)
       ├─ Insertar en MongoDB coleccion "nps_responses"
       └─ Registrar AuditEvent de tipo NPS_SUBMITTED
```

**Flujo de consulta** (dashboard):
```
GET /nps/campaign/{campaign_id}
  └─ NPSCollector.get_campaign_stats(campaign_id)
       ├─ Agregar: average_score, score_distribution (1-5), response_count, comments[]
       ├─ Calcular alerta si average_score < 3.5
       └─ Retornar stats con flag is_low_nps: bool
```

**Survey delivery**: conversation-lambda es duena del envio del survey al candidato. NPSCollector no conoce Telegram. La respuesta del candidato llega via `POST /nps`.

---

### DataRetentionManager

**Proposito**: Purgar datos de candidatos una vez expirado el periodo de retencion configurado por campana.

**Flujo del sweep (EventBridge scheduled — diario)**:
```
EventBridge scheduled rule dispara Lambda entrypoint scheduled_handler.py
  └─ DataRetentionManager.run_purge_sweep()
       ├─ Consultar campanas con retention_expires_at <= now() y status != PURGED
       ├─ Para cada campana expirada:
       │    ├─ Obtener lista de session_ids de la campana
       │    ├─ Para cada session_id:
       │    │    ├─ Eliminar audit_transcripts (mensajes completos)
       │    │    ├─ Eliminar nps_responses (contiene comentarios de texto libre — PII potencial)
       │    │    ├─ Eliminar escalations (contiene transcript_excerpt)
       │    │    ├─ CONSERVAR consent_records (minimo legal: session_id, timestamp, decision) — no se toca
       │    │    ├─ CONSERVAR audit_events con solo campos: session_id, event_type, timestamp (eliminar payload si contiene PII)
       │    │    └─ Registrar AuditEvent de tipo DATA_PURGED para este session_id
       │    └─ Marcar campana como PURGED en coleccion "campaigns_retention"
       └─ Retornar resumen: { campaigns_purged: N, sessions_purged: N }
```

**Retencion minima legal (P7=B)**:
- `consent_records`: conservar completo (requerimiento GDPR Art. 7 / Ley 1581 Colombia Art. 9)
- `audit_events`: conservar evento tipo + timestamp, eliminar `payload` que contenga texto del candidato
- Todo lo demas: eliminacion completa

---

## Flujos cross-componente

### Flujo completo de una sesion de screening (perspectiva compliance-lambda)

```
1. Candidate da consentimiento
   conversation-lambda → EventBridge → consent.recorded
   └─ ConsentManager.record_consent() → MongoDB consent_records

2. Durante la sesion (eventos criticos en tiempo real)
   conversation-lambda → EventBridge → audit.event (pause/resume/score_partial)
   └─ AuditLogger.log_event() → MongoDB audit_events (con chain hash)

3. Sesion completa
   conversation-lambda → EventBridge → session.completed (con transcript)
   └─ AuditLogger.log_transcript() → MongoDB audit_transcripts (batch)

   evaluation-lambda → EventBridge → evaluation.completed (con scores + citations)
   └─ AuditLogger.log_event(EVALUATION_COMPLETE) → MongoDB audit_events

4. NPS survey
   conversation-lambda envia survey al candidato via Telegram
   Candidato responde → conversation-lambda → POST /nps
   └─ NPSCollector.record_response() → MongoDB nps_responses

5. Decision humana (desde dashboard)
   dashboard → POST /audit/event (HUMAN_DECISION)
   └─ AuditLogger.log_event() → MongoDB audit_events

6. Purga (cuando expira retencion)
   EventBridge scheduled → DataRetentionManager.run_purge_sweep()
   └─ Elimina transcripts, NPS, escalations; conserva consent + audit_events anonimizados
```

---

## Integraciones con otros servicios

| Servicio | Direccion | Mecanismo | Proposito |
|---------|-----------|-----------|-----------|
| conversation-lambda | → compliance | EventBridge | Publicar consent.recorded, session.completed, audit.event |
| conversation-lambda | → compliance | HTTP POST /nps | Registrar respuesta NPS |
| evaluation-lambda | → compliance | EventBridge | Publicar evaluation.completed con scores y citas |
| dashboard (Unit 7) | → compliance | HTTP GET | Consultar audit log, NPS stats |
| MongoDB Atlas | ↔ compliance | motor async | Persistencia de todos los datos |
| SNS Topic | compliance → | AWS SDK | Alertas de tamper + escalaciones |
| CloudWatch | compliance → | logging | Logs CRITICAL para alarmas |
| EventBridge | → compliance | Lambda trigger | Eventos async de otros servicios |
| EventBridge Scheduler | → compliance | Lambda trigger | Daily retention sweep |
