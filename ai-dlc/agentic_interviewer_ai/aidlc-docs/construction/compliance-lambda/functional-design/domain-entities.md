# Domain Entities — compliance-lambda (Unit 5)

**Unidad**: Unit 5 - entrevista-compliance
**Generado**: 2026-04-08
**Runtime**: Python 3.12 / Pydantic v2 / MongoDB Atlas

---

## ConsentRecord

**Coleccion MongoDB**: `consent_records`
**Inmutabilidad**: write-once — ninguna operacion de UPDATE/DELETE desde la capa de aplicacion.

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| `_id` | ObjectId | auto | Identificador BSON interno de MongoDB |
| `session_id` | str | si | UUID de la sesion (FK hacia conversation-lambda). **Indice unico**. |
| `candidate_telegram_id` | str | si | ID anonimizado del candidato en Telegram (no el nombre real) |
| `consent_timestamp` | datetime | si | Momento exacto en que el candidato dio consentimiento (UTC) |
| `ip_hash` | str | no | SHA-256 del IP del candidato si esta disponible (privacidad por diseño) |
| `consent_text_version` | str | si | Version del texto legal que fue presentado (ej. `"v1.2"`) |
| `campaign_id` | str | si | ID de la campana asociada a la sesion |
| `created_at` | datetime | si | Timestamp de insercion (UTC). Set by server. |

**Indice**:
```json
{ "session_id": 1 }  // unique: true
{ "campaign_id": 1, "created_at": -1 }
```

**Modelo Pydantic**:
```python
class ConsentRecord(BaseModel):
    session_id: str
    candidate_telegram_id: str
    consent_timestamp: datetime
    ip_hash: str | None = None
    consent_text_version: str
    campaign_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
```

---

## AuditEvent

**Coleccion MongoDB**: `audit_events`
**Inmutabilidad**: write-once. IAM policy deniega deleteMany/updateMany sobre el rol Lambda. Change Stream alerta si se detecta algo.

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| `_id` | ObjectId | auto | Identificador BSON |
| `session_id` | str | si | UUID de la sesion |
| `event_type` | AuditEventType (enum) | si | Tipo de evento (ver enum abajo) |
| `payload` | dict \| None | no | Datos del evento (puede contener PII — se purga en retencion) |
| `timestamp` | datetime | si | Cuando ocurrio el evento (UTC) |
| `sequence_number` | int | si | Numero de orden del evento dentro de la sesion (1-based) |
| `prev_hash` | str | si | `"GENESIS"` si sequence_number==1, sino SHA-256 del evento anterior |
| `chain_hash` | str | si | SHA-256(event_type + payload_json + timestamp_iso + prev_hash) |
| `created_at` | datetime | si | Timestamp de insercion. Set by server. |

**Enum AuditEventType**:
```python
class AuditEventType(str, Enum):
    CONSENT_RECORDED     = "CONSENT_RECORDED"
    SESSION_STARTED      = "SESSION_STARTED"
    SESSION_PAUSED       = "SESSION_PAUSED"
    SESSION_RESUMED      = "SESSION_RESUMED"
    SCORE_PARTIAL        = "SCORE_PARTIAL"
    EVALUATION_COMPLETE  = "EVALUATION_COMPLETE"
    HUMAN_DECISION       = "HUMAN_DECISION"
    NPS_SUBMITTED        = "NPS_SUBMITTED"
    SESSION_COMPLETED    = "SESSION_COMPLETED"
    ESCALATION_REQUESTED = "ESCALATION_REQUESTED"
    TAMPER_DETECTED      = "TAMPER_DETECTED"
    DATA_PURGED          = "DATA_PURGED"
```

**Indices**:
```json
{ "session_id": 1, "sequence_number": 1 }  // unique: true
{ "session_id": 1, "event_type": 1 }
{ "created_at": 1 }  // TTL — gestionado manualmente por DataRetentionManager
```

---

## AuditTranscript

**Coleccion MongoDB**: `audit_transcripts`
**Lifecycle**: Creado en batch al SESSION_COMPLETED. Eliminado por DataRetentionManager segun retention_days.

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| `_id` | ObjectId | auto | Identificador BSON |
| `session_id` | str | si | UUID de la sesion. **Indice unico**. |
| `campaign_id` | str | si | ID de la campana |
| `messages` | list[TranscriptMessage] | si | Lista ordenada de mensajes de la sesion |
| `total_messages` | int | si | Conteo total de mensajes |
| `created_at` | datetime | si | Momento de insercion (cuando se recibio SESSION_COMPLETED) |

**Sub-entidad TranscriptMessage**:
```python
class TranscriptMessage(BaseModel):
    role: Literal["candidate", "agent"]
    content: str
    timestamp: datetime
    message_index: int  # 0-based, orden dentro del transcript
```

**Modelo Pydantic**:
```python
class AuditTranscript(BaseModel):
    session_id: str
    campaign_id: str
    messages: list[TranscriptMessage]
    total_messages: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
```

**Indice**:
```json
{ "session_id": 1 }  // unique: true
{ "campaign_id": 1, "created_at": -1 }
```

---

## NPSResponse

**Coleccion MongoDB**: `nps_responses`
**Lifecycle**: Creado por NPSCollector via POST /nps. Eliminado por DataRetentionManager.

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| `_id` | ObjectId | auto | Identificador BSON |
| `session_id` | str | si | UUID de la sesion. **Indice unico**. |
| `campaign_id` | str | si | ID de la campana |
| `score` | int | si | Puntuacion [1, 5] inclusive |
| `comment` | str \| None | no | Comentario libre del candidato (contiene PII potencial) |
| `submitted_at` | datetime | si | Cuando el candidato envio la respuesta (UTC) |
| `created_at` | datetime | si | Timestamp de insercion. Set by server. |

**Validacion Pydantic**:
```python
class NPSResponse(BaseModel):
    session_id: str
    campaign_id: str
    score: int = Field(ge=1, le=5)
    comment: str | None = None
    submitted_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
```

**Indice**:
```json
{ "session_id": 1 }  // unique: true
{ "campaign_id": 1, "submitted_at": -1 }
```

---

## EscalationRecord

**Coleccion MongoDB**: `escalations`
**Lifecycle**: Creado por EscalationAlertManager al recibir evento ESCALATION_REQUESTED. Eliminado por DataRetentionManager.

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| `_id` | ObjectId | auto | Identificador BSON |
| `session_id` | str | si | UUID de la sesion |
| `campaign_id` | str | si | ID de la campana |
| `candidate_id` | str | si | ID del candidato (anonimizado) |
| `reason` | EscalationReason (enum) | si | Tipo de escalada |
| `transcript_excerpt` | str \| None | no | Ultimos N mensajes del transcript en el momento de escalada |
| `status` | EscalationStatus (enum) | si | Estado actual de la escalada |
| `timestamp` | datetime | si | Cuando se produjo la escalada (UTC) |
| `resolved_at` | datetime \| None | no | Cuando se resolvio la escalada |
| `created_at` | datetime | si | Timestamp de insercion. Set by server. |

**Enums**:
```python
class EscalationReason(str, Enum):
    CANDIDATE_REQUESTED  = "CANDIDATE_REQUESTED"
    TECHNICAL_ERROR      = "TECHNICAL_ERROR"
    SCORE_ANOMALY        = "SCORE_ANOMALY"
    CONSENT_DISPUTE      = "CONSENT_DISPUTE"

class EscalationStatus(str, Enum):
    PENDING    = "PENDING"
    IN_REVIEW  = "IN_REVIEW"
    RESOLVED   = "RESOLVED"
    DISMISSED  = "DISMISSED"
```

**Indice**:
```json
{ "session_id": 1 }
{ "campaign_id": 1, "status": 1, "timestamp": -1 }
```

---

## CampaignRetentionConfig

**Coleccion MongoDB**: `campaigns_retention`
**Lifecycle**: Creado por admin al lanzar una campana. Actualizado por DataRetentionManager cuando completa la purga.

| Campo | Tipo | Obligatorio | Descripcion |
|-------|------|-------------|-------------|
| `_id` | ObjectId | auto | Identificador BSON |
| `campaign_id` | str | si | ID unico de la campana. **Indice unico**. |
| `retention_days` | int | si | Dias a conservar datos [30, 365]. Default: 90. |
| `expires_at` | datetime | si | Fecha a partir de la cual los datos son purgables (campaign_end_date + retention_days) |
| `status` | RetentionStatus (enum) | si | Estado del ciclo de vida de la retencion |
| `purged_at` | datetime \| None | no | Cuando se ejecuto la purga (set by DataRetentionManager) |
| `purge_run_id` | str \| None | no | UUID del run de purga (para trazabilidad) |
| `records_purged` | int \| None | no | Conteo de registros eliminados en la purga |
| `created_at` | datetime | si | Timestamp de insercion. Set by server. |
| `updated_at` | datetime | si | Ultima actualizacion. Set by server. |

**Enum RetentionStatus**:
```python
class RetentionStatus(str, Enum):
    ACTIVE      = "ACTIVE"     # campana activa, retencion vigente
    EXPIRING    = "EXPIRING"   # dentro de 7 dias del expires_at
    PURGE_READY = "PURGE_READY"  # expires_at ya paso, pendiente de purga
    PURGED      = "PURGED"     # datos purgados, solo consent_records y audit_events anonimizados
```

**Indice**:
```json
{ "campaign_id": 1 }  // unique: true
{ "status": 1, "expires_at": 1 }  // usado por DataRetentionManager diario
```

---

## Diagrama de relaciones

```
ConsentRecord ─────────────┐
                            │
AuditEvent ─────────────── session_id (UUID, generado por conversation-lambda)
                            │
AuditTranscript ───────────┘
                            │
NPSResponse ────────────────┤
                            │
EscalationRecord ───────────┘

                 campaign_id
CampaignRetentionConfig ──── ConsentRecord
                         ──── AuditEvent
                         ──── AuditTranscript
                         ──── NPSResponse
                         ──── EscalationRecord
```

**Nota**: No hay FK enforced en MongoDB. Las relaciones son por convencion de campo. El DataRetentionManager opera por `campaign_id` para localizar todos los documentos a purgar de cada coleccion.

---

## Politica de escritura MongoDB (aplica a todas las colecciones)

```python
write_concern = WriteConcern(w="majority", j=True)
```

Todas las inserciones se realizan con `w: majority, j: true` para garantizar durabilidad ante fallo del primary.
