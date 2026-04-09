"""
NPS Router — POST /nps, GET /nps/{session_id}.
US-25: Track Candidate NPS and Experience Quality.
JWT validado via entrevista-shared.
"""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.components.nps_collector import NPSCollector
from app.models.nps import NPSCreateRequest, NPSGetResponse, NPSResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/nps", tags=["nps"])
_security = HTTPBearer()
_collector = NPSCollector()


async def _get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_security)],
) -> dict:
    from entrevista_shared.auth.jwt_validator import validate_token
    from app.config import get_settings

    settings = get_settings()
    try:
        return validate_token(credentials.credentials, settings.jwt_secret, settings.jwt_algorithm)
    except Exception as exc:
        logger.warning("JWT invalido: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post(
    "",
    response_model=NPSResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registra o actualiza NPS del candidato (BR-C05: uno por sesión)",
)
async def submit_nps(
    request: NPSCreateRequest,
    _user: Annotated[dict, Depends(_get_current_user)],
) -> NPSResponse:
    """
    Registra la respuesta NPS del candidato.
    Si ya existe para la sesión, actualiza el score (BR-C05: upsert por session_id).
    Score debe estar entre 0 y 10 (inclusive).
    """
    return await _collector.submit_nps(request)


@router.get(
    "/{session_id}",
    response_model=NPSGetResponse,
    summary="Retorna el NPS de una sesión",
)
async def get_nps(
    session_id: str,
    _user: Annotated[dict, Depends(_get_current_user)],
) -> NPSGetResponse:
    """Retorna la respuesta NPS registrada para la sesión. 404 si no existe."""
    result = await _collector.get_nps(session_id)
    if not result.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No hay NPS registrado para la sesión '{session_id}'",
        )
    return result
