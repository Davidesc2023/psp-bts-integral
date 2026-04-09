"""
Modelos Pydantic v2 para NPS (Net Promoter Score de experiencia del candidato).
US-25 — Track Candidate NPS and Experience Quality.
BR-C05: un único NPS por sesión (upsert).
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator


class NPSCreateRequest(BaseModel):
    """Payload recibido via POST /nps."""

    session_id: Annotated[str, Field(min_length=1, max_length=128)]
    candidate_id: Annotated[str, Field(min_length=1, max_length=128)]
    score: Annotated[int, Field(ge=0, le=10, description="Score NPS 0-10")]
    comment: str | None = Field(default=None, max_length=2048)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("score")
    @classmethod
    def score_in_range(cls, v: int) -> int:
        if not (0 <= v <= 10):
            raise ValueError("score debe estar entre 0 y 10 (inclusive)")
        return v


class NPSResponse(BaseModel):
    """Documento almacenado en nps_responses y respuesta pública."""

    session_id: str
    candidate_id: str
    score: int
    category: str = Field(description="detractor | passive | promoter")
    comment: str | None = None
    timestamp: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime | None = None

    @staticmethod
    def categorize(score: int) -> str:
        if score <= 6:
            return "detractor"
        if score <= 8:
            return "passive"
        return "promoter"

    model_config = {"populate_by_name": True}


class NPSGetResponse(BaseModel):
    """Respuesta de GET /nps/{session_id}."""

    session_id: str
    score: int
    category: str
    comment: str | None
    timestamp: datetime
    exists: bool = True
