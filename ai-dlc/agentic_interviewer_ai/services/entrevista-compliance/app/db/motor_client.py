"""
Motor AsyncIOMotorClient singleton (PAT-09).
Gestión limpia de conexión en contexto Lambda (reutiliza conexión entre invocaciones en caliente).
Configuración: w="majority", j=True, wtimeout=5000 para durabilidad garantizada.
"""
from __future__ import annotations

import logging
import signal
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None


def _get_client() -> AsyncIOMotorClient:
    """
    Devuelve el cliente Motor singleton, creándolo si no existe.
    El cliente se reutiliza entre invocaciones Lambda calientes (PAT-09).
    """
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncIOMotorClient(
            settings.mongodb_uri,
            # Durabilidad garantizada
            w="majority",
            j=True,
            wtimeoutMS=5000,
            # Timeouts de conexión
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
            # Pool: adecuado para Lambda arm64 512MB
            maxPoolSize=10,
            minPoolSize=1,
            # Heartbeat
            heartbeatFrequencyMS=10000,
        )
        logger.info("Motor client creado (singleton PAT-09).")

        # Liberar recursos en SIGTERM (Lambda graceful shutdown)
        def _on_sigterm(*_: Any) -> None:
            close_client()

        signal.signal(signal.SIGTERM, _on_sigterm)

    return _client


def get_database() -> AsyncIOMotorDatabase:
    """Devuelve la base de datos de compliance."""
    settings = get_settings()
    return _get_client()[settings.mongodb_database]


def close_client() -> None:
    """Cierra el cliente Motor. Llamar en SIGTERM o en teardown de tests."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
        logger.info("Motor client cerrado.")
