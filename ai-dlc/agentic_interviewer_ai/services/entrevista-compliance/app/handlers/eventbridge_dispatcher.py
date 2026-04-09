"""
EventBridge Dispatcher — router de eventos para compliance-lambda.
Mapea detail-type → componente correspondiente.
"""
from __future__ import annotations

import logging
from typing import Any

from app.components.audit_logger import AuditLogger
from app.components.consent_manager import ConsentManager
from app.components.escalation_alert_manager import EscalationAlertManager
from app.models.audit import AuditEventCreateRequest
from app.models.consent import ConsentCreateRequest
from app.models.escalation import EscalationCreateRequest

logger = logging.getLogger(__name__)

_consent_manager = ConsentManager()
_audit_logger = AuditLogger()
_escalation_manager = EscalationAlertManager()


# Tipos de eventos soportados
EVENT_CONSENT_RECORDED = "compliance.consent.recorded"
EVENT_AUDIT_EVENT = "compliance.audit.event"
EVENT_ESCALATION_RAISED = "compliance.escalation.raised"
EVENT_SESSION_ENDED = "compliance.session.ended"


async def dispatch(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    Enruta el evento de EventBridge al componente apropiado.

    Retorna dict con status y resultado para el log de Lambda.
    """
    detail_type = event.get("detail-type", "")
    detail = event.get("detail", {})

    logger.info("EventBridge recibido: detail-type='%s'", detail_type)

    if detail_type == EVENT_CONSENT_RECORDED:
        return await _handle_consent_recorded(detail)

    if detail_type == EVENT_AUDIT_EVENT:
        return await _handle_audit_event(detail)

    if detail_type == EVENT_ESCALATION_RAISED:
        return await _handle_escalation_raised(detail)

    if detail_type == EVENT_SESSION_ENDED:
        return await _handle_session_ended(detail)

    logger.warning("Evento no reconocido: '%s'", detail_type)
    return {"status": "ignored", "detail_type": detail_type}


async def _handle_consent_recorded(detail: dict) -> dict:
    """Procesa evento consent.recorded enviado por conversation-lambda."""
    try:
        request = ConsentCreateRequest(**detail)
        result = await _consent_manager.record_consent(request)
        return {
            "status": "ok",
            "event": EVENT_CONSENT_RECORDED,
            "session_id": result.session_id,
            "created": result.created,
        }
    except Exception as exc:
        logger.error("Error procesando consent.recorded: %s", exc)
        raise


async def _handle_audit_event(detail: dict) -> dict:
    """Procesa evento audit.event con registro de cadena hash."""
    try:
        request = AuditEventCreateRequest(**detail)
        result = await _audit_logger.log_event(request)
        return {
            "status": "ok",
            "event": EVENT_AUDIT_EVENT,
            "session_id": result.session_id,
            "seq_num": result.seq_num,
        }
    except Exception as exc:
        logger.error("Error procesando audit.event: %s", exc)
        raise


async def _handle_escalation_raised(detail: dict) -> dict:
    """Procesa evento escalation.raised con alertas dual-channel."""
    try:
        request = EscalationCreateRequest(**detail)
        result = await _escalation_manager.raise_escalation(request)
        return {
            "status": "ok",
            "event": EVENT_ESCALATION_RAISED,
            "session_id": result.session_id,
            "severity": result.severity,
        }
    except Exception as exc:
        logger.error("Error procesando escalation.raised: %s", exc)
        raise


async def _handle_session_ended(detail: dict) -> dict:
    """
    Procesa evento session.ended.
    Actualmente registra un AuditEvent de tipo 'session.ended'.
    """
    session_id = detail.get("session_id", "")
    logger.info("Sesion finalizada: %s", session_id)
    try:
        request = AuditEventCreateRequest(
            session_id=session_id,
            event_type="session.ended",
            actor_id=detail.get("actor_id", "system"),
            payload={"reason": detail.get("reason", "normal_completion")},
        )
        result = await _audit_logger.log_event(request)
        return {
            "status": "ok",
            "event": EVENT_SESSION_ENDED,
            "session_id": session_id,
            "seq_num": result.seq_num,
        }
    except Exception as exc:
        logger.error("Error procesando session.ended: %s", exc)
        raise
