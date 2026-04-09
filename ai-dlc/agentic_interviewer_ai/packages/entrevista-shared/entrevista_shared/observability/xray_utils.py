"""
Utilidades de observabilidad con AWS X-Ray para código async.

Patrón: context manager async que abre/cierra subsegmentos X-Ray
y captura excepciones automáticamente.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

from aws_xray_sdk.core import xray_recorder

if TYPE_CHECKING:
    from aws_xray_sdk.core.models.subsegment import Subsegment

log = logging.getLogger(__name__)


@asynccontextmanager
async def xray_subsegment(name: str) -> AsyncGenerator[Subsegment | None, None]:
    """
    Context manager async que abre un subsegmento X-Ray con el nombre dado.

    Si X-Ray no está habilitado (e.g., en tests locales), opera en modo no-op.

    Uso:
        async with xray_subsegment("MongoDB.find_operator"):
            result = await collection.find_one(...)

    Args:
        name: Nombre del subsegmento (convención: "Servicio.operacion")
    """
    subsegment: Subsegment | None = None
    try:
        subsegment = xray_recorder.begin_subsegment(name)
        yield subsegment
    except Exception as exc:
        if subsegment is not None:
            try:
                subsegment.add_exception(exc, fatal=True)
            except Exception:
                # No fallar si X-Ray no puede registrar la excepción
                log.debug("xray_subsegment: no se pudo registrar excepción en X-Ray", exc_info=True)
        raise
    finally:
        if subsegment is not None:
            try:
                xray_recorder.end_subsegment()
            except Exception:
                log.debug("xray_subsegment: no se pudo cerrar subsegmento X-Ray", exc_info=True)
