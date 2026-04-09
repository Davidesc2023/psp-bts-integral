"""
Audit Router — GET /audit/{session_id}, GET /audit/{session_id}/transcript, POST /audit/event.
US-23 (Audit Log Inmutable), US-24 (Trazabilidad). JWT validado via entrevista-shared.
"""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.components.audit_logger import AuditLogger
from app.models.audit import (
    AuditEventCreateRequest,
    AuditEventResponse,
    AuditLogResponse,
    AuditTranscriptResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audit", tags=["audit"])
_security = HTTPBearer()
_logger_component = AuditLogger()


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


@router.get(
    "/{session_id}",
    response_model=AuditLogResponse,
    summary="Retorna audit log paginado de una sesión (US-23)",
)
async def get_audit_log(
    session_id: str,
    page: Annotated[int, Query(ge=1, description="Página (1-based)")] = 1,
    limit: Annotated[int, Query(ge=1, le=200, description="Eventos por página")] = 50,
    _user: Annotated[dict, Depends(_get_current_user)] = None,
) -> AuditLogResponse:
    """
    Retorna los eventos de auditoría de una sesión, paginados por seq_num ascendente.
    Incluye chain_hash para verificar integridad de la cadena (US-24).
    """
    result = await _logger_component.get_audit_log(session_id, page=page, limit=limit)
    if result.total == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontraron eventos de auditoría para la sesión '{session_id}'",
        )
    return result


@router.get(
    "/{session_id}/transcript",
    response_model=AuditTranscriptResponse,
    summary="Retorna el transcript completo de una sesión",
)
async def get_transcript(
    session_id: str,
    _user: Annotated[dict, Depends(_get_current_user)] = None,
) -> AuditTranscriptResponse:
    """
    Retorna el transcript de la conversación de la sesión.
    El transcript es inmutable una vez almacenado (BR-C04).
    """
    result = await _logger_component.get_transcript(session_id)
    if result.total_turns == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No hay transcript para la sesión '{session_id}'",
        )
    return result


@router.post(
    "/event",
    response_model=AuditEventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registra un evento de auditoría con chain hash (US-24)",
)
async def log_audit_event(
    request: AuditEventCreateRequest,
    _user: Annotated[dict, Depends(_get_current_user)] = None,
) -> AuditEventResponse:
    """
    Registra un nuevo evento de auditoría.
    Calcula automáticamente seq_num (PAT-04) y chain_hash SHA-256 (PAT-03).
    """
    return await _logger_component.log_event(request)
