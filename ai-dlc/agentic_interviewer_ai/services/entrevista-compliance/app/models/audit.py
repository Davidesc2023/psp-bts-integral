"""
Modelos Pydantic v2 para Audit Log inmutable con chain hash SHA-256.
US-23 (Audit Log Inmutable), US-24 (Trazabilidad 100%).
PAT-03 (chain hash), PAT-04 (atomic seq_num via session_counters).
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, Field


class AuditEventCreateRequest(BaseModel):
    """Payload para registrar un nuevo evento de auditoría."""

    session_id: Annotated[str, Field(min_length=1, max_length=128)]
    event_type: Annotated[str, Field(min_length=1, max_length=64)]
    actor_id: Annotated[str, Field(min_length=1, max_length=128)]
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AuditEvent(BaseModel):
    """
    Documento almacenado en audit_events.
    Campos seq_num y chain_hash son calculados por AuditLogger, no por el cliente.
    """

    session_id: str
    seq_num: int = Field(ge=1, description="Número secuencial atómico del evento")
    event_type: str
    actor_id: str
    payload: dict[str, Any]
    # hash SHA-256 del payload JSON canónico
    payload_hash: str
    # chain = SHA-256(prev_chain_hash + payload_hash)
    chain_hash: str
    prev_hash: str = Field(
        description="chain_hash del evento anterior; '0'*64 si es el primer evento"
    )
    timestamp: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AuditTranscript(BaseModel):
    """Documento almacenado en audit_transcripts (lote al finalizar sesión)."""

    session_id: str
    turn_index: int = Field(ge=0)
    speaker: str  # "interviewer" | "candidate"
    text: str
    timestamp: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AuditEventResponse(BaseModel):
    """Representación pública de un AuditEvent."""

    session_id: str
    seq_num: int
    event_type: str
    actor_id: str
    payload_hash: str
    chain_hash: str
    prev_hash: str
    timestamp: datetime


class AuditLogResponse(BaseModel):
    """Respuesta paginada de GET /audit/{session_id}."""

    session_id: str
    page: int
    limit: int
    total: int
    events: list[AuditEventResponse]


class AuditTranscriptResponse(BaseModel):
    """Respuesta de GET /audit/{session_id}/transcript."""

    session_id: str
    turns: list[AuditTranscript]
    total_turns: int
