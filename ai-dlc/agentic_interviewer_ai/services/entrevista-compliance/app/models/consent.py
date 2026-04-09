"""
Modelos Pydantic v2 para Consent (consentimiento del candidato).
US-23, US-24 — BR-C01, BR-C02, BR-C03.
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator


class ConsentCreateRequest(BaseModel):
    """Payload recibido via POST /consent o evento EventBridge."""

    session_id: Annotated[str, Field(min_length=1, max_length=128)]
    candidate_id: Annotated[str, Field(min_length=1, max_length=128)]
    interviewer_id: Annotated[str, Field(min_length=1, max_length=128)]
    consented: bool
    method: Literal["voice", "click"] = "click"
    idempotency_key: Annotated[str, Field(min_length=1, max_length=256)]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    notes: str | None = Field(default=None, max_length=1024)


class ConsentRecord(BaseModel):
    """Documento almacenado en la colección consent_records."""

    session_id: str
    candidate_id: str
    interviewer_id: str
    consented: bool
    method: Literal["voice", "click"]
    idempotency_key: str
    timestamp: datetime
    notes: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Campo inmutable una vez escrito (BR-C02 write-once guard)
    locked: bool = True


class ConsentResponse(BaseModel):
    """Respuesta pública del endpoint POST /consent."""

    session_id: str
    candidate_id: str
    consented: bool
    method: Literal["voice", "click"]
    timestamp: datetime
    idempotency_key: str
    created: bool = Field(
        description="True si se creó nuevo registro; False si era idempotente"
    )

    model_config = {"populate_by_name": True}


class ConsentStatusResponse(BaseModel):
    """Respuesta de GET /consent/{session_id}."""

    session_id: str
    consented: bool | None = None
    method: Literal["voice", "click"] | None = None
    timestamp: datetime | None = None
    exists: bool = False
