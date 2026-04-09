"""
Lambda Handler entry point — entrevista-compliance.
Enruta entre:
  - HTTP via API Gateway → Mangum ASGI adapter
  - EventBridge events → eventbridge_dispatcher
  - EventBridge Scheduler → scheduler_handler
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

# Configura X-Ray antes de importar boto3/otros módulos AWS (PAT-10)
from aws_xray_sdk.core import patch_all, xray_recorder

xray_recorder.configure(service="entrevista-compliance")
patch_all()

from mangum import Mangum

from app.router import app

logger = logging.getLogger(__name__)
log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, log_level, logging.INFO))

# Mangum ASGI adapter para API Gateway HTTP v2
_mangum_handler = Mangum(app, lifespan="off")


def handler(event: dict[str, Any], context: Any) -> Any:
    """
    Lambda handler principal.

    Routing logic:
    1. Si el evento tiene 'source' → EventBridge → dispatcher async
    2. Si el action es 'retention_purge' (Scheduler) → scheduler async
    3. De lo contrario → HTTP request via Mangum
    """
    source = event.get("source", "")
    detail_type = event.get("detail-type", "")

    # EventBridge Scheduler (detail-type = ScheduledEvent)
    if detail_type == "ScheduledEvent" or (
        source == "aws.scheduler"
    ):
        logger.info("Routing a scheduler_handler: action=%s", event.get("detail", {}).get("action"))
        from app.handlers.scheduler_handler import handle_scheduled_event
        return asyncio.get_event_loop().run_until_complete(
            handle_scheduled_event(event, context)
        )

    # EventBridge custom events
    if source and source.startswith("entrevista."):
        logger.info("Routing a eventbridge_dispatcher: detail-type=%s", detail_type)
        from app.handlers.eventbridge_dispatcher import dispatch
        return asyncio.get_event_loop().run_until_complete(
            dispatch(event, context)
        )

    # HTTP API Gateway
    return _mangum_handler(event, context)
