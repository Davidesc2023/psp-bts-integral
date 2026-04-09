"""
ConsentManager — PAT-01 (Idempotency) + PAT-02 (Write-once dual-guard).
BR-C01: consent grabado antes del inicio de la entrevista.
BR-C02: consentimiento inmutable una vez registrado.
BR-C03: idempotency_key garantiza at-most-once even con retries.
"""
from __future__ import annotations

import logging
from datetime import datetime

from aws_xray_sdk.core import xray_recorder
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.db.motor_client import get_database
from app.models.consent import (
    ConsentCreateRequest,
    ConsentRecord,
    ConsentResponse,
    ConsentStatusResponse,
)

logger = logging.getLogger(__name__)

COLLECTION = "consent_records"


class ConsentAlreadyRecordedError(Exception):
    """Se intenta modificar un consentimiento ya registrado con diferente decisión."""

    def __init__(self, session_id: str) -> None:
        super().__init__(
            f"Consentimiento para sesión '{session_id}' ya registrado y es inmutable (BR-C02)."
        )
        self.session_id = session_id


class ConsentManager:
    """
    Gestiona el registro y consulta de consentimientos.

    Garantías:
    - PAT-01: upsert por idempotency_key → misma llamada produce mismo resultado.
    - PAT-02: write-once dual-guard → si ya existe con distinto 'consented', lanza error.
    - X-Ray subsegmento por operación (PAT-10).
    """

    async def record_consent(self, request: ConsentCreateRequest) -> ConsentResponse:
        """
        Registra el consentimiento del candidato.

        Flujo:
        1. Intentar insert por idempotency_key (índice único).
        2. Si DuplicateKeyError → es un retry idempotente → retornar existente.
        3. Dual-guard: si existe con distinto 'consented' → lanzar ConsentAlreadyRecordedError.
        """
        with xray_recorder.in_subsegment("ConsentManager.record_consent") as subsegment:
            subsegment.put_metadata("session_id", request.session_id)
            subsegment.put_metadata("idempotency_key", request.idempotency_key)

            db = get_database()
            col = db[COLLECTION]

            doc = ConsentRecord(
                session_id=request.session_id,
                candidate_id=request.candidate_id,
                interviewer_id=request.interviewer_id,
                consented=request.consented,
                method=request.method,
                idempotency_key=request.idempotency_key,
                timestamp=request.timestamp,
                notes=request.notes,
            )
            doc_dict = doc.model_dump()

            try:
                await col.insert_one(doc_dict)
                logger.info(
                    "Consent registrado: session=%s idempotency_key=%s",
                    request.session_id,
                    request.idempotency_key,
                )
                subsegment.put_annotation("created", True)
                return ConsentResponse(
                    session_id=request.session_id,
                    candidate_id=request.candidate_id,
                    consented=request.consented,
                    method=request.method,
                    timestamp=request.timestamp,
                    idempotency_key=request.idempotency_key,
                    created=True,
                )

            except DuplicateKeyError:
                # PAT-01: idempotent retry — retornar el registro existente
                existing = await col.find_one({"idempotency_key": request.idempotency_key})
                if existing is None:
                    raise  # Situación inesperada

                # PAT-02 dual-guard: si consented cambió, rechazar
                if existing["consented"] != request.consented:
                    subsegment.put_annotation("write_once_violation", True)
                    raise ConsentAlreadyRecordedError(request.session_id)

                logger.info(
                    "Consent idempotente (ya existía): session=%s", request.session_id
                )
                subsegment.put_annotation("created", False)
                return ConsentResponse(
                    session_id=existing["session_id"],
                    candidate_id=existing["candidate_id"],
                    consented=existing["consented"],
                    method=existing["method"],
                    timestamp=existing["timestamp"],
                    idempotency_key=existing["idempotency_key"],
                    created=False,
                )

    async def get_consent(self, session_id: str) -> ConsentStatusResponse:
        """Consulta el estado de consentimiento de una sesión."""
        with xray_recorder.in_subsegment("ConsentManager.get_consent"):
            db = get_database()
            col = db[COLLECTION]
            existing = await col.find_one({"session_id": session_id}, {"_id": 0})
            if existing is None:
                return ConsentStatusResponse(session_id=session_id, exists=False)
            return ConsentStatusResponse(
                session_id=session_id,
                consented=existing["consented"],
                method=existing["method"],
                timestamp=existing["timestamp"],
                exists=True,
            )
