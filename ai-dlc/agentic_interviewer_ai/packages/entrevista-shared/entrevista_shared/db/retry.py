"""
Retry helper ligero para operaciones MongoDB en AWS Lambda.

Patrón: sin tenacity (MVP). Implementación manual con asyncio.sleep.
  - Máximo 3 intentos (1 original + 2 reintentos)
  - Delays: 100ms entre intento 1 y 2, 300ms entre intento 2 y 3
  - Solo reintenta ante errores PyMongoError
  - Errores de negocio (ValueError, KeyError, etc.) se propagan inmediatamente
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import TypeVar

from pymongo.errors import PyMongoError

log = logging.getLogger(__name__)

T = TypeVar("T")

# Delays en segundos entre reintentos: (antes del intento 2, antes del intento 3)
_RETRY_DELAYS: tuple[float, ...] = (0.1, 0.3)


async def with_db_retry(operation: Callable[[], Awaitable[T]]) -> T:
    """
    Ejecuta `operation` con hasta 2 reintentos ante errores de PyMongo.

    Args:
        operation: Callable async sin argumentos que ejecuta la operación MongoDB.

    Returns:
        El resultado de `operation` si tiene éxito.

    Raises:
        PyMongoError: Si todos los reintentos fallan, relanza el último error.
    """
    last_exc: PyMongoError | None = None

    # Intento 0 (original): sin delay
    # Intento 1: delay 100ms
    # Intento 2: delay 300ms
    delays: tuple[float | None, ...] = (None,) + _RETRY_DELAYS

    for attempt, delay in enumerate(delays, start=1):
        if delay is not None:
            await asyncio.sleep(delay)
        try:
            return await operation()
        except PyMongoError as exc:
            last_exc = exc
            log.warning(
                "MongoDB operation failed, retrying",
                extra={"attempt": attempt, "max_attempts": len(delays), "error": str(exc)},
            )

    raise last_exc  # type: ignore[misc]
