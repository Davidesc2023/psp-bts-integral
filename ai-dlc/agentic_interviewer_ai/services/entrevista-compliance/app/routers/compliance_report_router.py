"""
Compliance Report Router — GET /compliance-report/{session_id}.
US-30: Export Compliance Report as PDF.
Estado: HTTP 501 Not Implemented (stub MVP post).
"""
from __future__ import annotations

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/compliance-report", tags=["compliance-report"])


@router.get(
    "/{session_id}",
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    summary="[STUB] Exporta reporte de compliance como PDF (US-30 — post-MVP)",
    responses={
        501: {
            "description": "No implementado en MVP. Disponible en versión futura.",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Export de reporte PDF no implementado en MVP (US-30).",
                        "status": "not_implemented",
                        "planned_version": "2.0",
                    }
                }
            },
        }
    },
)
async def export_compliance_report(session_id: str) -> JSONResponse:
    """
    **US-30 — Post-MVP stub.**

    La exportación de reportes de compliance como PDF está planificada para la versión 2.0.
    Este endpoint retorna HTTP 501 Not Implemented en la versión MVP.
    """
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "detail": f"Export de reporte PDF no implementado en MVP (US-30). Sesión: {session_id}",
            "status": "not_implemented",
            "planned_version": "2.0",
        },
    )
