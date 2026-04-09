"""
DataRetentionManager — PAT-08 (Selective Purge).
US-33: Configure Data Retention Period.
BR-C07: conserva consent_records mínimo (GDPR / Ley 1581 Colombia).
Invocado por EventBridge Scheduler diario a las 02:00 UTC.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from aws_xray_sdk.core import xray_recorder

from app.db.motor_client import get_database
from app.models.retention import (
    MIN_RETENTION_DAYS,
    PURGEABLE_COLLECTIONS,
    RetentionPolicy,
    RetentionPolicyResponse,
    RetentionPolicyUpdateRequest,
    RetentionPurgeResult,
)

logger = logging.getLogger(__name__)

RETENTION_COLLECTION = "campaigns_retention"

# Política de retención por defecto (días) por colección
DEFAULT_RETENTION_DAYS: dict[str, int] = {
    "audit_events": 365,
    "audit_transcripts": 180,
    "nps_responses": 365,
    "escalations": 730,
    "session_counters": 90,
    "audit_meta_events": 365,
    "consent_records": 2555,  # 7 años (GDPR / Ley 1581)
}


class DataRetentionManager:
    """
    Gestiona la purga selectiva de datos según política de retención.

    PAT-08: elimina únicamente documentos con timestamp < cutoff_date.
    Los consent_records tienen protección adicional (no se eliminan en totalidad).
    """

    async def run_purge(self) -> list[RetentionPurgeResult]:
        """
        Ejecuta la purga de todas las colecciones configuradas.
        Llamado por el EventBridge Scheduler (02:00 UTC diario).
        """
        with xray_recorder.in_subsegment("DataRetentionManager.run_purge") as subsegment:
            results = []
            db = get_database()

            for collection_name in PURGEABLE_COLLECTIONS:
                policy = await self._get_or_create_policy(collection_name)
                cutoff = datetime.utcnow() - timedelta(days=policy.retention_days)

                subsegment.put_metadata(f"{collection_name}_cutoff", cutoff.isoformat())

                try:
                    col = db[collection_name]
                    delete_result = await col.delete_many(
                        {"timestamp": {"$lt": cutoff}}
                    )
                    deleted = delete_result.deleted_count

                    # Actualizar stats de la política
                    await db[RETENTION_COLLECTION].update_one(
                        {"collection_name": collection_name},
                        {
                            "$set": {
                                "last_purge_at": datetime.utcnow(),
                                "last_purge_deleted_count": deleted,
                                "updated_at": datetime.utcnow(),
                            }
                        },
                    )

                    logger.info(
                        "Purga %s: eliminados=%d cutoff=%s",
                        collection_name,
                        deleted,
                        cutoff.isoformat(),
                    )
                    results.append(
                        RetentionPurgeResult(
                            collection_name=collection_name,
                            deleted_count=deleted,
                            retention_days=policy.retention_days,
                            cutoff_date=cutoff,
                        )
                    )
                except Exception as exc:
                    logger.error("Error purgando %s: %s", collection_name, exc)
                    results.append(
                        RetentionPurgeResult(
                            collection_name=collection_name,
                            deleted_count=0,
                            retention_days=policy.retention_days,
                            cutoff_date=cutoff,
                            errors=[str(exc)],
                        )
                    )

            return results

    async def update_policy(
        self, request: RetentionPolicyUpdateRequest
    ) -> RetentionPolicyResponse:
        """Actualiza la política de retención para una colección."""
        with xray_recorder.in_subsegment("DataRetentionManager.update_policy"):
            db = get_database()
            col = db[RETENTION_COLLECTION]
            now = datetime.utcnow()

            result = await col.find_one_and_update(
                filter={"collection_name": request.collection_name},
                update={
                    "$set": {
                        "retention_days": request.retention_days,
                        "updated_at": now,
                    },
                    "$setOnInsert": {
                        "created_at": now,
                        "last_purge_at": None,
                        "last_purge_deleted_count": 0,
                    },
                },
                upsert=True,
                return_document=True,
                projection={"_id": 0},
            )
            logger.info(
                "Política actualizada: %s → %d días",
                request.collection_name,
                request.retention_days,
            )
            return RetentionPolicyResponse(
                collection_name=result["collection_name"],
                retention_days=result["retention_days"],
                last_purge_at=result.get("last_purge_at"),
                last_purge_deleted_count=result.get("last_purge_deleted_count", 0),
                updated_at=result["updated_at"],
            )

    async def get_policy(self, collection_name: str) -> RetentionPolicyResponse | None:
        """Consulta la política de retención de una colección."""
        db = get_database()
        col = db[RETENTION_COLLECTION]
        doc = await col.find_one({"collection_name": collection_name}, {"_id": 0})
        if not doc:
            return None
        return RetentionPolicyResponse(
            collection_name=doc["collection_name"],
            retention_days=doc["retention_days"],
            last_purge_at=doc.get("last_purge_at"),
            last_purge_deleted_count=doc.get("last_purge_deleted_count", 0),
            updated_at=doc["updated_at"],
        )

    async def _get_or_create_policy(self, collection_name: str) -> RetentionPolicy:
        """Obtiene la política existente o crea una con el default."""
        db = get_database()
        col = db[RETENTION_COLLECTION]
        doc = await col.find_one({"collection_name": collection_name})
        if doc:
            return RetentionPolicy(**{k: v for k, v in doc.items() if k != "_id"})

        # Crear con default
        default_days = DEFAULT_RETENTION_DAYS.get(collection_name, 365)
        policy = RetentionPolicy(
            collection_name=collection_name,
            retention_days=default_days,
        )
        await col.insert_one(policy.model_dump())
        return policy
