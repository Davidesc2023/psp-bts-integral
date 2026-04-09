"""
Scheduler Handler — invocado por EventBridge Scheduler (02:00 UTC diario).
Ejecuta la purga selectiva de datos según política de retención (PAT-08).
"""
from __future__ import annotations

import logging
from typing import Any

from app.components.data_retention_manager import DataRetentionManager
from app.models.retention import RetentionPurgeResult

logger = logging.getLogger(__name__)

_retention_manager = DataRetentionManager()


async def handle_scheduled_event(
    event: dict[str, Any], context: Any
) -> dict[str, Any]:
    """
    Handler para eventos de EventBridge Scheduler.
    Ejecuta DataRetentionManager.run_purge() y retorna resumen.

    Triggered por: cron(0 2 * * ? *) — diario a las 02:00 UTC.
    """
    action = event.get("detail", {}).get("action", "")
    logger.info("Scheduled event recibido: action='%s'", action)

    if action != "retention_purge":
        logger.warning("Acción de scheduler no reconocida: '%s'", action)
        return {"status": "ignored", "action": action}

    results: list[RetentionPurgeResult] = await _retention_manager.run_purge()

    total_deleted = sum(r.deleted_count for r in results)
    errors = [err for r in results for err in r.errors]

    summary = {
        "status": "ok" if not errors else "partial_error",
        "action": "retention_purge",
        "collections_processed": len(results),
        "total_deleted": total_deleted,
        "errors": errors,
        "details": [
            {
                "collection": r.collection_name,
                "deleted": r.deleted_count,
                "retention_days": r.retention_days,
                "cutoff": r.cutoff_date.isoformat(),
            }
            for r in results
        ],
    }

    logger.info(
        "Purge completado: collections=%d total_deleted=%d errors=%d",
        len(results),
        total_deleted,
        len(errors),
    )

    return summary
