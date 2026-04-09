"""
Cliente MongoDB singleton usando Motor (async) para AWS Lambda.

Patrón: singleton de módulo — la conexión se crea una sola vez por instancia Lambda
(cold start) y se reutiliza en invocaciones warm.

Retry driver-level:
  retryWrites=True  — reintentos automáticos de escrituras idempotentes
  retryReads=True   — reintentos automáticos de lecturas
"""

from __future__ import annotations

import os

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

_client: AsyncIOMotorClient | None = None


def get_mongo_client() -> AsyncIOMotorClient:
    """
    Devuelve el cliente Motor singleton.
    Crea la conexión en el primer llamado (cold start).

    Raises:
        RuntimeError: Si MONGODB_URI no está configurada.
    """
    global _client

    if _client is None:
        uri = os.environ.get("MONGODB_URI")
        if not uri:
            raise RuntimeError(
                "Variable de entorno MONGODB_URI no está configurada."
            )
        _client = AsyncIOMotorClient(
            uri,
            retryWrites=True,
            retryReads=True,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=3000,
            socketTimeoutMS=10000,
        )

    return _client


def get_database(name: str) -> AsyncIOMotorDatabase:
    """
    Atajos para obtener una base de datos por nombre.

    Args:
        name: Nombre de la base de datos en MongoDB Atlas.
    """
    return get_mongo_client()[name]
