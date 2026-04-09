# NFR Requirements Plan — compliance-lambda (Unit 5)

**Unidad**: Unit 5 - entrevista-compliance
**Etapa**: NFR Requirements
**Estado**: ESPERANDO RESPUESTAS
**Fecha**: 2026-04-08

## Checklist de evaluacion

- [x] Analizar artefactos de Functional Design (business-logic-model, business-rules, domain-entities)
- [x] Identificar areas de ambiguedad NFR
- [x] Generar preguntas de clarificacion
- [ ] Recopilar respuestas
- [ ] Generar nfr-requirements.md
- [ ] Generar tech-stack-decisions.md
- [ ] Presentar completion message

---

## Contexto del analisis

compliance-lambda tiene caracteristicas NFR particulares:

1. **Inmutabilidad critica** — AuditEvents y ConsentRecords son evidencia legal. Un fallo de escritura o una perdida de datos puede tener consecuencias legales (GDPR, Ley 1581).
2. **EventBridge at-least-once** — Los consumers son idempotentes, pero si EventBridge no entrega, se pierde un evento de audit irrecuperable.
3. **Burst de sesiones** — Si campaign-lambda lanza una campana grande simultaneamente, muchas sesiones iniciaran en el mismo momento → burst de eventos CONSENT_RECORDED.
4. **Chain hash secuencial** — `sequence_number` necesita ser atomico por sesion. Dos eventos concurrentes para la misma sesion pueden generar conflicto.
5. **Purga diaria** — DataRetentionManager es un sweep diario via EventBridge; puede afectar la performance de MongoDB si purga volumen grande.
6. **Audit query** — `GET /audit/{session_id}` retorna hasta N eventos + transcript. Sin limite, puede retornar payloads muy grandes.

---

## Preguntas de clarificacion NFR

---

### P1 — Volumen de sesiones concurrentes (Escalabilidad)

La lambda necesita soportar bursts de sesiones cuando se lanza una campana. ¿Cual es el volumen esperado?

**Opciones**:
- A. Pequeno: hasta 50 sesiones activas simultaneas por campana
- B. Mediano: 50–300 sesiones activas simultaneas
- C. Grande: 300–1000 sesiones activas simultaneas
- D. Enterprise: mas de 1000 sesiones activas simultaneas

[B]:

---

### P2 — SLA de latencia para consent recording (Performance)

`POST /consent` es el primer paso del flujo de entrevista. Si compliance-lambda es lenta aqui, el candidato experimenta un delay antes de iniciar la sesion. ¿Cual es el SLA aceptable?

**Opciones**:
- A. Estricto: p99 < 300ms (MongoDB write + response)
- B. Estandar: p99 < 800ms
- C. Relajado: p99 < 2000ms (es una operacion que ocurre una vez, el usuario no lo nota)

[B]:

---

### P3 — SLA de latencia para audit query (Performance)

`GET /audit/{session_id}` es llamado por el dashboard cuando un reclutador revisa una entrevista. El reclutador espera activamente. ¿Cual es el SLA?

**Opciones**:
- A. Estricto: p99 < 500ms (incluye join de events + transcript)
- B. Estandar: p99 < 1500ms
- C. Relajado: p99 < 3000ms (hay un loading spinner aceptable)

[B]:

---

### P4 — Disponibilidad de compliance-lambda (Availability)

compliance-lambda es parte del critical path? Si esta caido, cancierta nuevas sesiones?

**Opciones**:
- A. **Critical path**: Si compliance-lambda no puede registrar el consentimiento, la sesion NO inicia. La disponibilidad debe ser >= 99.9% (max 43.8 min/mes de downtime).
- B. **Non-blocking**: conversation-lambda intenta registrar consentimiento pero si falla, la sesion continua de todas formas (se registra en cola para retry posterior). Disponibilidad >= 99% es suficiente.
- C. **Best-effort**: Si compliance-lambda esta caida, se loguea el error pero nada se bloquea. Disponibilidad >= 99% es suficiente.

[B]:

---

### P5 — Dead Letter Queue para EventBridge (Reliability)

Al-least-once delivery de EventBridge garantiza entrega, pero puede fallar temporalmente. Si un evento `consent.recorded` no es procesado, ese consentimiento nunca llega a MongoDB.

**Opciones**:
- A. **DLQ + manual replay**: Configurar DLQ en SQS para EventBridge failures. Alertar via SNS cuando hay mensajes en DLQ. Replay manual por operador.
- B. **DLQ + auto-replay**: DLQ + Lambda para auto-replay automatico con backoff (max 3 intentos adicionales antes de alertar).
- C. **Sin DLQ**: confiar en que EventBridge at-least-once es suficiente para el MVP. Si hay fallo, el candidato puede ser contactado por otro canal.

[B]:

---

### P6 — Concurrencia de chain hash (Reliability)

Si dos eventos de la misma sesion llegan casi simultaneamente a compliance-lambda (ej. CONSENT_RECORDED y SESSION_STARTED con 10ms de diferencia), hay race condition en `sequence_number`. ¿Como manejar?

**Opciones**:
- A. **Atomic counter en MongoDB**: usar `findAndModify` o `$inc` atomico en un contador por sesion. Serializa las escrituras pero agrega latencia.
- B. **Timestamp ordering con retry**: usar timestamp como desempate. Si hay colision de sequence_number, retry con el siguiente numero disponible.
- C. **Accept eventual consistency**: sequence_number puede tener gaps. La cadena hash se construye por timestamp, no por sequence garantizado. Acepto gaps en secuencias criticas.

[A]:

---

### P7 — Cifrado de datos en MongoDB Atlas (Security)

Los datos de audit incluyen texto de conversaciones del candidato (payload de audit_events, audit_transcripts). ¿Nivel de cifrado requerido?

**Opciones**:
- A. **Cifrado en transito unicamente**: TLS en transito a MongoDB Atlas (ya incluido por defecto). Sin cifrado adicional a nivel de campo.
- B. **Cifrado en reposo a nivel de cluster**: Activar MongoDB Atlas Encryption at Rest con AWS KMS. Todos los datos del cluster cifrados con clave gestionada por el proyecto.
- C. **Field-level encryption (FLE)**: Cifrado a nivel de campo para campos PII especificos (candidate_telegram_id, transcript messages). Maxima proteccion pero mayor complejidad.

[B]:

---

### P8 — Trazabilidad X-Ray (Observability)

compliance-lambda usa `entrevista-shared` que ya incluye el modulo `xray.py`. ¿Que nivel de trazabilidad se requiere?

**Opciones**:
- A. **X-Ray desactivado** para compliance-lambda (solo CloudWatch Logs + CloudWatch Metrics)
- B. **X-Ray activo solo tracing de Lambda** (entrada/salida de la funcion, sin subsegmentos internos)
- C. **X-Ray activo con subsegmentos** para ConsentManager, AuditLogger, NPSCollector, y queries a MongoDB (visibilidad completa de latencia por componente)

[C]:

---

### P9 — Retencion de CloudWatch Logs (Maintainability)

compliance-lambda genera logs de audit, errores y alertas. ¿Cuanto tiempo retener en CloudWatch?

**Opciones**:
- A. 7 dias (costo minimo, solo debugging reciente)
- B. 30 dias (estandar operacional)
- C. 90 dias (alineado con retencion default de datos de entrevistas)
- D. 1 ano (cumplimiento + evidencia legal del audit trail en CloudWatch)

[C]:

---

### P10 — Limite de payload en GET /audit/{session_id} (Performance)

Un audit completo de una sesion puede incluir decenas de eventos + transcript con cientos de mensajes. ¿Aplicar paginacion o retornar todo en una sola respuesta?

**Opciones**:
- A. **Todo en una respuesta**: retornar todos los eventos + transcript completo. Mas simple para el dashboard, pero payload puede ser >1MB para sesiones largas.
- B. **Paginacion de eventos, transcript separado**: `GET /audit/{session_id}/events?page=1&limit=50` + `GET /audit/{session_id}/transcript` como endpoints separados.
- C. **Limite fijo sin paginacion**: retornar maximo los ultimos 100 eventos + transcript completo. Si hay mas, indicar `truncated: true`.

[B]:

---

**Para responder**: Reemplaza cada `[Respuesta PX]:` con tu decision (letra + comentario opcional).
