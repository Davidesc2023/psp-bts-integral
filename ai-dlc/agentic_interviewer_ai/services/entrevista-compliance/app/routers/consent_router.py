"""
Consent Router — POST /consent, GET /consent/{session_id}.
US-23/US-24. JWT validado via entrevista-shared.
"""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.components.consent_manager import ConsentAlreadyRecordedError, ConsentManager
from app.models.consent import ConsentCreateRequest, ConsentResponse, ConsentStatusResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/consent", tags=["consent"])
_security = HTTPBearer()
_manager = ConsentManager()


async def _get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_security)],
) -> dict:
    """Valida JWT usando entrevista-shared.jwt_validator."""
    from entrevista_shared.auth.jwt_validator import validate_token
    from app.config import get_settings

    settings = get_settings()
    try:
        payload = validate_token(credentials.credentials, settings.jwt_secret, settings.jwt_algorithm)
        return payload
    except Exception as exc:
        logger.warning("JWT invalido: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post(
    "",
    response_model=ConsentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registra consentimiento del candidato (idempotente por idempotency_key)",
)
async def record_consent(
    request: ConsentCreateRequest,
    _user: Annotated[dict, Depends(_get_current_user)],
) -> ConsentResponse:
    """
    Registra el consentimiento del candidato para una sesión.

    - **201 Created**: nuevo registro creado.
    - **200 OK**: registro idempotente (ya existía con misma decisión).
    - **409 Conflict**: intento de modificar consentimiento existente (BR-C02).
    """
    try:
        result = await _manager.record_consent(request)
        if not result.created:
            # Respuesta idempotente — cambiar status a 200
            from fastapi.responses import JSONResponse
            return JSONResponse(
                content=result.model_dump(mode="json"),
                status_code=status.HTTP_200_OK,
            )
        return result
    except ConsentAlreadyRecordedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


@router.get(
    "/{session_id}",
    response_model=ConsentStatusResponse,
    summary="Consulta el estado de consentimiento de una sesión",
)
async def get_consent(
    session_id: str,
    _user: Annotated[dict, Depends(_get_current_user)],
) -> ConsentStatusResponse:
    """Retorna el estado de consentimiento registrado para la sesión."""
    result = await _manager.get_consent(session_id)
    if not result.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No hay consentimiento registrado para la sesión '{session_id}'",
        )
    return result
