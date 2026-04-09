"""
Modelos Pydantic v2 para Escalaciones (alertas de compliance crítico).
PAT-06 (non-blocking creation), PAT-07 (dual-channel SNS + CloudWatch).
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field


SeverityLevel = Literal["low", "medium", "high", "critical"]


class EscalationCreateRequest(BaseModel):
    """Payload para crear una escalación."""

    session_id: Annotated[str, Field(min_length=1, max_length=128)]
    reason: Annotated[str, Field(min_length=1, max_length=1024)]
    severity: SeverityLevel = "medium"
    actor_id: str | None = Field(default=None, max_length=128)
    context: dict = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class EscalationRecord(BaseModel):
    """Documento almacenado en la colección escalations."""

    session_id: str
    reason: str
    severity: SeverityLevel
    actor_id: str | None = None
    context: dict = Field(default_factory=dict)
    timestamp: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved: bool = False
    resolved_at: datetime | None = None
    # IDs de notificaciones enviadas
    sns_message_id: str | None = None
    cw_metric_published: bool = False


class EscalationResponse(BaseModel):
    """Respuesta pública al crear una escalación."""

    session_id: str
    severity: SeverityLevel
    reason: str
    timestamp: datetime
    sns_message_id: str | None = None
    created: bool = True
