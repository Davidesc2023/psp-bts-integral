# Plan de Functional Design — compliance-lambda (Unidad 5)

**Unidad**: Unidad 5 — compliance-lambda (`entrevista-compliance`)
**Etapa**: CONSTRUCTION — Functional Design
**Creado**: 2026-04-08
**Estado**: RESPUESTAS RECIBIDAS

---

## Contexto de la unidad

| Atributo | Valor |
|----------|-------|
| **Stories cubiertas** | US-23 (3SP), US-24 (2SP), US-25 (2SP) — Must-Have; US-30 (3SP), US-33 (2SP) — Should-Have |
| **Total SP** | 12 (7 Must-Have + 5 Should-Have) |
| **Runtime** | Python 3.12 / FastAPI + Mangum |
| **Deployment** | AWS Lambda (arm64) + API Gateway HTTP + EventBridge (retention sweep) |
| **Proposito** | Write-once consent recording, immutable audit log, escalation alerts, NPS collection, scheduled data retention |
| **Componentes** | ComplianceRouter, ConsentManager, AuditLogger, EscalationAlertManager, NPSCollector, DataRetentionManager |
| **Dependencias externas** | MongoDB Atlas |
| **Consumidores** | conversation-lambda (consent + audit), evaluation-lambda (audit traceability), dashboard (NPS + compliance report) |

---

## Pasos de ejecucion

### Paso 1 — Analizar contexto y stories
- [ ] Leer definicion de Unit 5 en `unit-of-work.md`
- [ ] Leer stories US-23, US-24, US-25, US-30, US-33 en `stories.md`
- [ ] Identificar componentes y sus responsabilidades

### Paso 2 — Recopilar respuestas a preguntas de diseno
- [ ] Esperar respuestas del usuario a todas las preguntas del plan

### Paso 3 — Generar artefactos de Functional Design
- [ ] Crear `aidlc-docs/construction/compliance-lambda/functional-design/business-logic-model.md`
- [ ] Crear `aidlc-docs/construction/compliance-lambda/functional-design/business-rules.md`
- [ ] Crear `aidlc-docs/construction/compliance-lambda/functional-design/domain-entities.md`

### Paso 4 — Presentar completion message y esperar aprobacion

---

## Preguntas de Functional Design

---

### P1 — Modelo de inmutabilidad del Audit Log [US-23]

El AC exige que modificar o eliminar un entry "falle y genere una alerta".

**¿Como se implementa la inmutabilidad en MongoDB Atlas?**

A) **Append-only por convencion**: la aplicacion nunca emite `update`/`delete` en la coleccion audit. La "inmutabilidad" es logica (RLS/permisos MongoDB). Si alguien con acceso DB directo modifica, no hay deteccion automatica.

B) **MongoDB Atlas Auditing + triggers**: se configura un Change Stream trigger que detecta cualquier `update`/`delete` en la coleccion y genera una alerta (email/SNS). La coleccion sigue siendo tecnicamente modificable desde Atlas pero toda modificacion se detecta.

C) **Coleccion con TTL=0 y write concern majority**: los documentos se insertan con `w: majority` y `j: true`. Se deshabilita la TTL de la coleccion. La aplicacion usa una politica de IAM que deniega `deleteMany`/`updateMany` al rol de la lambda.

D) **AWS WORM / S3 Object Lock (exportacion)**: los audit logs se escriben en MongoDB para queries, pero ademas se streaman a un bucket S3 con Object Lock (WORM) como registro de respaldo legal.

[Respuesta P1]: C + B — IAM policy (w:majority, denegar deleteMany/updateMany al rol lambda) + MongoDB Atlas Change Stream trigger que detecta cualquier update/delete y publica a SNS.

---

### P2 — Escritura del Consent Record [US-23, conversation-lambda]

Cuando `conversation-lambda` registra el consentimiento de un candidato, llama a `compliance-lambda`.

**¿Como se debe manejar el registro de consentimiento?**

A) **Endpoint HTTP sincrono**: `POST /consent` — conversation-lambda llama en tiempo real y espera la confirmacion antes de avanzar en la conversacion. Si compliance-lambda falla, la conversacion se bloquea.

B) **Endpoint HTTP fire-and-forget**: conversation-lambda llama `POST /consent` con timeout corto. Si falla, registra el intento y reintenta asincrono. El candidato no se bloquea.

C) **Via EventBridge / SQS**: conversation-lambda publica un evento `consent.recorded` al bus. compliance-lambda lo consume de forma asincrona. No hay respuesta inmediata.

[Respuesta P2]: C — EventBridge/SQS asincrono puro. conversation-lambda publica evento consent.recorded al bus. No hay respuesta inmediata a la conversacion.

---

### P3 — Estructura del Audit Event [US-23, US-24]

US-23 requiere registrar: consent timestamp, cada mensaje, cada partial score, final evaluation, human decision.
US-24 requiere que cada score tenga al menos una cita textual verbatim del transcript.

**¿Cada mensaje de la conversacion se registra como un evento separado en el audit log, o se registra la sesion completa al finalizar?**

A) **Evento por mensaje**: cada mensaje candidato/agente genera un `AuditEvent` individual en tiempo real. Esto permite ver el log en vivo pero genera mas escrituras a MongoDB.

B) **Batch al finalizar la sesion**: al cerrar la sesion, conversation-lambda envia un payload unico con todo el transcript. Menos escrituras, pero el audit no es en tiempo real.

C) **Hibrido**: se registran eventos criticos en tiempo real (consent, resume, submit) y el transcript completo se escribe batch al finalizar.

[Respuesta P3]: C — Hibrido: eventos criticos en tiempo real (consent, pause, resume, session_complete, score) + transcript completo como batch al finalizar la sesion.

---

### P4 — NPS Survey delivery [US-25]

US-25 indica que "el agente envia un breve NPS survey (1-5 + comentario opcional)" al finalizar la sesion.

**¿Quien es dueno del envio del survey?**

A) **compliance-lambda via Telegram**: compliance-lambda recibe el evento de sesion completada y envia directamente el mensaje al candidato via Telegram Bot API. compliance-lambda tiene su propia conexion con Telegram.

B) **conversation-lambda envia, compliance-lambda almacena**: conversation-lambda envia el survey como parte del flujo de cierre. Cuando el candidato responde, conversation-lambda registra la respuesta y notifica a compliance-lambda via `POST /nps`.

C) **EventBridge trigger**: cuando conversation-lambda cierra la sesion, publica `session.completed`. compliance-lambda suscribe el evento, genera el survey via conversation-lambda (llamada HTTP), y procesa la respuesta cuando llega.

[Respuesta P4]: B — conversation-lambda envia el survey como parte del flujo de cierre. Cuando el candidato responde, compliance-lambda almacena via POST /nps.

---

### P5 — Escalation Alert [US-23 AC3 — alert on tamper]

Cuando se detecta una modificacion al audit log, se debe generar una alerta.

**¿A donde va la alerta de manipulacion de audit log?**

A) **Email via SES**: se envia email al address de compliance configurado en variables de entorno.

B) **SNS Topic**: se publica en un topic SNS. El operador puede suscribir email, SMS, o cualquier endpoint. Mas flexible.

C) **Log en CloudWatch + alarma**: se registra un log de nivel CRITICAL en CloudWatch. Una alarma de CloudWatch lo detecta y notifica via SNS. Permite correlacion con otros eventos del sistema.

D) **Slack webhook**: se envia a un canal de Slack configurado via webhook URL en variables de entorno.

[Respuesta P5]: B + C — SNS Topic (principal) + CloudWatch log CRITICAL con alarma que también dispara SNS. Correlacion de eventos posible.

---

### P6 — PDF Compliance Report [US-30 — Should-Have]

US-30 requiere generar un PDF con datos de campana, scores anonimizados, y traceability confirmation.

**¿Como se genera el PDF?**

A) **WeasyPrint en la lambda**: la lambda genera el PDF con WeasyPrint (HTML → PDF). El PDF se guarda en S3 y se retorna un presigned URL. Requiere capa Lambda con WeasyPrint (~50MB).

B) **ReportLab en la lambda**: la lambda genera el PDF directamente con ReportLab (mas liviano que WeasyPrint, ~5MB). Sin HTML intermedio — programatico puro.

C) **Servicio externo (Gotenberg / CloudConvert)**: la lambda genera HTML y lo envia a un microservicio de conversion a PDF. Mas facil de mantener pero agrega una dependencia externa.

D) **Posponer para post-MVP**: el PDF se implementa como US-30 Should-Have, puede quedar como stub que retorna HTTP 501 en la primera version.

[Respuesta P6]: D — Posponer para post-MVP. El endpoint retorna HTTP 501 Not Implemented en MVP.

---

### P7 — Data Retention sweep [US-33 — Should-Have]

US-33 requiere un job automatizado que elimine datos de candidatos una vez expirado el periodo de retencion configurado por campana.

**¿Que datos se eliminan exactamente y que se conserva?**

A) **Eliminacion total del candidato**: se eliminan todos los documentos del candidato (sesion, mensajes, scores, consent record). Solo se conservan las estadisticas agregadas anonimizadas a nivel de campana.

B) **Eliminacion selectiva**: se eliminan mensajes y scores individuales pero se conserva el consent record (requerimiento legal en algunos paises — GDPR, Ley 1581 Colombia) con datos minimos (session_id, fecha, decision).

C) **Pseudoanonimizacion**: no se eliminan los documentos, sino que se reemplazan los datos PII (nombre, telegram_id) con un hash irreversible. El transcript completo se elimina. Los scores con citas quedan pero las citas se truncan.

[Respuesta P7]: B — Eliminacion selectiva: se conserva consent record minimo (session_id, consent_timestamp, decision) por requerimiento legal GDPR / Ley 1581 Colombia.

---

### P8 — API de consulta del Audit Log [US-23]

El dashboard (Unit 7) necesita consultar el audit log por session_id para mostrar el detalle de un candidato.

**¿Quien expone el endpoint de consulta?**

A) **compliance-lambda expone `GET /audit/{session_id}`**: el dashboard llama directamente a compliance-lambda. compliance-lambda valida el JWT (via `entrevista-shared`) y retorna los eventos del audit en orden cronologico.

B) **evaluation-lambda agrega los datos**: evaluation-lambda llama internamente a compliance-lambda y agrega el transcript + scores en un unico response. El dashboard solo llama a evaluation-lambda.

C) **MongoDB Atlas Data API directamente desde el dashboard**: la frontend llama directamente a MongoDB Atlas Data API con el JWT de Supabase. No hay lambda intermediaria para lecturas.

[Respuesta P8]: A — compliance-lambda expone GET /audit/{session_id} directamente al dashboard. Valida JWT via entrevista-shared.
