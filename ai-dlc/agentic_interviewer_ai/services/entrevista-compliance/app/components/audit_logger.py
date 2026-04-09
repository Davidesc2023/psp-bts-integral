"""
AuditLogger — PAT-03 (Chain Hash SHA-256) + PAT-04 (Atomic seq via SessionCounterStore).
US-23: Audit Log Inmutable. US-24: Trazabilidad 100%.
BR-C04: cada evento referencia el hash del evento anterior formando cadena.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime

from aws_xray_sdk.core import xray_recorder

from app.components.session_counter_store import SessionCounterStore
from app.db.motor_client import get_database
from app.models.audit import (
    AuditEvent,
    AuditEventCreateRequest,
    AuditEventResponse,
    AuditLogResponse,
    AuditTranscript,
    AuditTranscriptResponse,
)

logger = logging.getLogger(__name__)

AUDIT_EVENTS_COLLECTION = "audit_events"
AUDIT_TRANSCRIPTS_COLLECTION = "audit_transcripts"
GENESIS_HASH = "0" * 64  # hash del "bloque génesis" para el primer evento
_counter_store = SessionCounterStore()


def _canonical_json(payload: dict) -> str:
    """Serialización JSON canónica (keys ordenadas, sin espacios extra)."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _sha256(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def _compute_chain_hash(prev_hash: str, payload_hash: str) -> str:
    """
    chain_hash = SHA-256(prev_chain_hash + payload_hash)
    PAT-03: cada evento enlaza criptográficamente con el anterior.
    """
    return _sha256(prev_hash + payload_hash)


class AuditLogger:
    """
    Registra eventos de auditoría con cadena hash inmutable.

    Garantías:
    - seq_num monotónico via SessionCounterStore.$inc (PAT-04).
    - chain_hash enlaza prev_hash + payload_hash (PAT-03).
    - X-Ray subsegmento por operación (PAT-10).
    """

    async def log_event(self, request: AuditEventCreateRequest) -> AuditEventResponse:
        """
        Registra un nuevo evento de auditoría.

        Flujo:
        1. Obtener seq_num atómico.
        2. Obtener prev_hash del último evento de la sesión.
        3. Calcular payload_hash y chain_hash.
        4. Persistir AuditEvent.
        """
        with xray_recorder.in_subsegment("AuditLogger.log_event") as subsegment:
            subsegment.put_metadata("session_id", request.session_id)
            subsegment.put_metadata("event_type", request.event_type)

            db = get_database()
            col = db[AUDIT_EVENTS_COLLECTION]

            # PAT-04: seq_num atómico
            seq_num = await _counter_store.next_seq_num(request.session_id)

            # Obtener prev_hash del evento anterior en la cadena
            prev_event = await col.find_one(
                {"session_id": request.session_id, "seq_num": seq_num - 1},
                {"chain_hash": 1, "_id": 0},
            )
            prev_hash = prev_event["chain_hash"] if prev_event else GENESIS_HASH

            # PAT-03: calcular hashes
            payload_json = _canonical_json(request.payload)
            payload_hash = _sha256(payload_json)
            chain_hash = _compute_chain_hash(prev_hash, payload_hash)

            event = AuditEvent(
                session_id=request.session_id,
                seq_num=seq_num,
                event_type=request.event_type,
                actor_id=request.actor_id,
                payload=request.payload,
                payload_hash=payload_hash,
                chain_hash=chain_hash,
                prev_hash=prev_hash,
                timestamp=request.timestamp,
            )
            await col.insert_one(event.model_dump())

            logger.info(
                "AuditEvent registrado: session=%s seq=%d type=%s",
                request.session_id,
                seq_num,
                request.event_type,
            )
            subsegment.put_annotation("seq_num", seq_num)

            return AuditEventResponse(
                session_id=event.session_id,
                seq_num=event.seq_num,
                event_type=event.event_type,
                actor_id=event.actor_id,
                payload_hash=event.payload_hash,
                chain_hash=event.chain_hash,
                prev_hash=event.prev_hash,
                timestamp=event.timestamp,
            )

    async def get_audit_log(
        self, session_id: str, page: int = 1, limit: int = 50
    ) -> AuditLogResponse:
        """
        Retorna el audit log paginado de una sesión (PR NFR P10).
        Ordenado por seq_num ascendente.
        """
        with xray_recorder.in_subsegment("AuditLogger.get_audit_log"):
            db = get_database()
            col = db[AUDIT_EVENTS_COLLECTION]

            total = await col.count_documents({"session_id": session_id})
            skip = (page - 1) * limit

            cursor = col.find(
                {"session_id": session_id},
                {"_id": 0, "payload": 0},  # excluir payload por privacidad en listados
            ).sort("seq_num", 1).skip(skip).limit(limit)

            events = []
            async for doc in cursor:
                events.append(AuditEventResponse(**doc))

            return AuditLogResponse(
                session_id=session_id,
                page=page,
                limit=limit,
                total=total,
                events=events,
            )

    async def get_transcript(self, session_id: str) -> AuditTranscriptResponse:
        """Retorna el transcript completo de la sesión (endpoint separado, NFR P10)."""
        with xray_recorder.in_subsegment("AuditLogger.get_transcript"):
            db = get_database()
            col = db[AUDIT_TRANSCRIPTS_COLLECTION]

            cursor = col.find(
                {"session_id": session_id}, {"_id": 0}
            ).sort("turn_index", 1)

            turns = [AuditTranscript(**doc) async for doc in cursor]
            return AuditTranscriptResponse(
                session_id=session_id,
                turns=turns,
                total_turns=len(turns),
            )

    async def store_transcript_turn(self, turn: AuditTranscript) -> None:
        """Almacena un turno del transcript (llamado al finalizar la sesión por batch)."""
        db = get_database()
        col = db[AUDIT_TRANSCRIPTS_COLLECTION]
        await col.insert_one(turn.model_dump())
