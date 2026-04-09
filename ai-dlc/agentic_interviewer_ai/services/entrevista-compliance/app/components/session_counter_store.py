"""
SessionCounterStore — PAT-04 (Atomic counter $inc).
Proporciona números de secuencia monotónicos sin race conditions
usando findOneAndUpdate + $inc + upsert en la colección session_counters.
"""
from __future__ import annotations

import logging

from aws_xray_sdk.core import xray_recorder
from pymongo import ReturnDocument

from app.db.motor_client import get_database

logger = logging.getLogger(__name__)

COLLECTION = "session_counters"


class SessionCounterStore:
    """
    Contador atómico por sesión. 
    
    Cada llamada a next_seq_num incrementa y retorna el nuevo valor.
    El primer evento de una sesión retorna 1.
    Garantía: sin race condition gracias a operación atómica $inc de MongoDB (PAT-04).
    """

    async def next_seq_num(self, session_id: str) -> int:
        """
        Incrementa y retorna el nuevo seq_num para la sesión.

        Operación atómica: findOneAndUpdate con $inc:1, upsert=True, returnDocument=AFTER.
        Latencia adicional estimada: ~20ms (trade-off aceptado en diseño NFR P6).
        """
        with xray_recorder.in_subsegment("SessionCounterStore.next_seq_num") as subsegment:
            subsegment.put_metadata("session_id", session_id)

            db = get_database()
            col = db[COLLECTION]

            result = await col.find_one_and_update(
                filter={"session_id": session_id},
                update={"$inc": {"counter": 1}},
                upsert=True,
                return_document=ReturnDocument.AFTER,
                projection={"counter": 1, "_id": 0},
            )
            seq = result["counter"]
            logger.debug("seq_num=%d para session=%s", seq, session_id)
            subsegment.put_annotation("seq_num", seq)
            return seq

    async def get_current(self, session_id: str) -> int:
        """Retorna el valor actual del contador sin incrementarlo (0 si no existe)."""
        db = get_database()
        col = db[COLLECTION]
        doc = await col.find_one({"session_id": session_id}, {"counter": 1, "_id": 0})
        return doc["counter"] if doc else 0
