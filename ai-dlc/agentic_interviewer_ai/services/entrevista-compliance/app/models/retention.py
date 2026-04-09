"""
Modelos Pydantic v2 para Política de Retención de Datos.
US-33 — Configure Data Retention Period.
PAT-08 (selective purge): elimina docs >= retention_days, conserva consent mínimo (GDPR / Ley 1581).
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator

# Colecciones gestionadas por el DataRetentionManager
PURGEABLE_COLLECTIONS = [
    "audit_events",
    "audit_transcripts",
    "nps_responses",
    "escalations",
    "session_counters",
    "audit_meta_events",
]

# Colecciones con conservación legal mínima (NO se eliminan en su totalidad)
LEGAL_HOLD_COLLECTIONS = [
    "consent_records",  # BR-C07: conservar consent mínimo (session_id, timestamp, decision)
]

MIN_RETENTION_DAYS = 30


class RetentionPolicyUpdateRequest(BaseModel):
    """Payload para actualizar la política de retención de una colección."""

    collection_name: Annotated[str, Field(min_length=1, max_length=128)]
    retention_days: Annotated[
        int, Field(ge=MIN_RETENTION_DAYS, description=f"Mínimo {MIN_RETENTION_DAYS} días")
    ]

    @field_validator("retention_days")
    @classmethod
    def validate_minimum(cls, v: int) -> int:
        if v < MIN_RETENTION_DAYS:
            raise ValueError(f"retention_days debe ser >= {MIN_RETENTION_DAYS}")
        return v

    @field_validator("collection_name")
    @classmethod
    def validate_collection(cls, v: str) -> str:
        allowed = PURGEABLE_COLLECTIONS + LEGAL_HOLD_COLLECTIONS
        if v not in allowed:
            raise ValueError(f"collection_name debe ser uno de: {allowed}")
        return v


class RetentionPolicy(BaseModel):
    """Documento almacenado en campaigns_retention."""

    collection_name: str
    retention_days: int
    last_purge_at: datetime | None = None
    last_purge_deleted_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RetentionPurgeResult(BaseModel):
    """Resultado de una ejecución del purge por colección."""

    collection_name: str
    deleted_count: int
    retention_days: int
    cutoff_date: datetime
    purge_at: datetime = Field(default_factory=datetime.utcnow)
    errors: list[str] = Field(default_factory=list)


class RetentionPolicyResponse(BaseModel):
    """Respuesta pública de la política de retención."""

    collection_name: str
    retention_days: int
    last_purge_at: datetime | None
    last_purge_deleted_count: int
    updated_at: datetime
