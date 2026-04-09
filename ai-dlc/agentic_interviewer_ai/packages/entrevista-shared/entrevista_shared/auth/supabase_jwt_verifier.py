"""
Verificación de access tokens de Supabase Auth con PyJWT.

Patrón: cache in-memory del JWT secret con TTL de 900 segundos (= JWT Expiry).
Algoritmo: HS256 (Supabase emite tokens HMAC-SHA256).
"""

from __future__ import annotations

import os
import time
from typing import Any

import jwt  # PyJWT

# ---------------------------------------------------------------------------
# Cache in-memory del secret (COMP-06 — Patrón 6)
# ---------------------------------------------------------------------------
_SUPABASE_JWT_SECRET: str | None = None
_SECRET_LOADED_AT: float = 0.0
_SECRET_TTL_SECONDS: float = 900.0  # igual al JWT Expiry configurado en Supabase

_ALLOWED_ROLES: frozenset[str] = frozenset({"service_role", "authenticated"})


def _get_jwt_secret() -> str:
    """
    Devuelve el JWT secret de Supabase.
    Recarga desde el entorno si el cache expiró (TTL 900s).
    """
    global _SUPABASE_JWT_SECRET, _SECRET_LOADED_AT

    now = time.monotonic()
    if _SUPABASE_JWT_SECRET is None or (now - _SECRET_LOADED_AT) > _SECRET_TTL_SECONDS:
        secret = os.environ.get("SUPABASE_JWT_SECRET")
        if not secret:
            raise RuntimeError(
                "Variable de entorno SUPABASE_JWT_SECRET no está configurada."
            )
        _SUPABASE_JWT_SECRET = secret
        _SECRET_LOADED_AT = now

    return _SUPABASE_JWT_SECRET


def verify_supabase_token(token: str) -> dict[str, Any]:
    """
    Verifica un access token emitido por Supabase Auth.

    Args:
        token: JWT en formato Bearer (sin prefijo "Bearer ").

    Returns:
        Payload del JWT como diccionario si el token es válido.

    Raises:
        jwt.InvalidTokenError: Si el token es inválido, expirado, o tiene
                               un algoritmo o role no permitido.
        RuntimeError: Si SUPABASE_JWT_SECRET no está configurada.
    """
    secret = _get_jwt_secret()

    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"require": ["sub", "exp", "role"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise jwt.InvalidTokenError("Token expirado.") from exc
    except jwt.InvalidTokenError as exc:
        raise jwt.InvalidTokenError(f"Token inválido: {exc}") from exc

    role = payload.get("role")
    if role not in _ALLOWED_ROLES:
        raise jwt.InvalidTokenError(
            f"Role '{role}' no está autorizado. Roles permitidos: {sorted(_ALLOWED_ROLES)}"
        )

    return payload
