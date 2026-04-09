"""
NPSCollector — US-25: Track Candidate NPS and Experience Quality.
BR-C05: una única respuesta NPS por sesión (upsert por session_id).
"""
from __future__ import annotations

import logging
from datetime import datetime

from aws_xray_sdk.core import xray_recorder
from pymongo import ReturnDocument

from app.db.motor_client import get_database
from app.models.nps import NPSCreateRequest, NPSGetResponse, NPSResponse

logger = logging.getLogger(__name__)

COLLECTION = "nps_responses"


class NPSAlreadySubmittedError(Exception):
    """Se intenta enviar un NPS cuando ya existe uno para la sesión."""

    def __init__(self, session_id: str) -> None:
        super().__init__(f"NPS ya registrado para sesión '{session_id}' (BR-C05).")
        self.session_id = session_id


class NPSCollector:
    """
    Gestiona la recolección de respuestas NPS de candidatos.

    BR-C05: upsert por session_id → un único NPS por sesión.
    Si ya existe, se ACTUALIZA (permite corrección antes de cierre de sesión).
    """

    async def submit_nps(self, request: NPSCreateRequest) -> NPSResponse:
        """
        Registra o actualiza el NPS de una sesión.

        Flujo: upsert por session_id → si existe actualiza score/comment/updated_at.
        """
        with xray_recorder.in_subsegment("NPSCollector.submit_nps") as subsegment:
            subsegment.put_metadata("session_id", request.session_id)
            subsegment.put_annotation("score", request.score)

            db = get_database()
            col = db[COLLECTION]

            category = NPSResponse.categorize(request.score)
            now = datetime.utcnow()

            result = await col.find_one_and_update(
                filter={"session_id": request.session_id},
                update={
                    "$set": {
                        "score": request.score,
                        "category": category,
                        "comment": request.comment,
                        "updated_at": now,
                    },
                    "$setOnInsert": {
                        "candidate_id": request.candidate_id,
                        "timestamp": request.timestamp,
                        "created_at": now,
                    },
                },
                upsert=True,
                return_document=ReturnDocument.AFTER,
                projection={"_id": 0},
            )

            logger.info(
                "NPS registrado: session=%s score=%d category=%s",
                request.session_id,
                request.score,
                category,
            )

            return NPSResponse(
                session_id=result["session_id"],
                candidate_id=result["candidate_id"],
                score=result["score"],
                category=result["category"],
                comment=result.get("comment"),
                timestamp=result["timestamp"],
                created_at=result["created_at"],
                updated_at=result.get("updated_at"),
            )

    async def get_nps(self, session_id: str) -> NPSGetResponse:
        """Retorna el NPS de una sesión. Retorna exists=False si no hay registro."""
        with xray_recorder.in_subsegment("NPSCollector.get_nps"):
            db = get_database()
            col = db[COLLECTION]
            doc = await col.find_one({"session_id": session_id}, {"_id": 0})
            if doc is None:
                return NPSGetResponse(
                    session_id=session_id,
                    score=0,
                    category="",
                    comment=None,
                    timestamp=datetime.utcnow(),
                    exists=False,
                )
            return NPSGetResponse(
                session_id=session_id,
                score=doc["score"],
                category=doc["category"],
                comment=doc.get("comment"),
                timestamp=doc["timestamp"],
                exists=True,
            )
