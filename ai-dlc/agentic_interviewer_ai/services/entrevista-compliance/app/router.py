"""
FastAPI application factory — registro de routers y middleware.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers.audit_router import router as audit_router
from app.routers.compliance_report_router import router as compliance_report_router
from app.routers.consent_router import router as consent_router
from app.routers.nps_router import router as nps_router

logger = logging.getLogger(__name__)

_settings = get_settings()


def create_app() -> FastAPI:
    """Crea y configura la instancia FastAPI con todos los routers."""
    app = FastAPI(
        title="EntreVista Compliance API",
        description=(
            "API de Compliance para EntreVista AI. "
            "Gestiona Consentimientos (US-23/US-24), Audit Log inmutable (US-23/US-24), "
            "NPS de candidatos (US-25) y Retención de datos (US-33)."
        ),
        version="1.0.0",
        docs_url="/docs" if _settings.environment != "prod" else None,
        redoc_url="/redoc" if _settings.environment != "prod" else None,
    )

    # CORS — restringido en prod
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if _settings.environment != "prod" else [],
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # Health check (sin autenticación)
    @app.get("/health", tags=["health"], summary="Health check")
    async def health() -> dict:
        return {"status": "ok", "service": "entrevista-compliance", "env": _settings.environment}

    # Routers de dominio
    app.include_router(consent_router)
    app.include_router(audit_router)
    app.include_router(nps_router)
    app.include_router(compliance_report_router)

    logger.info("FastAPI app creada con 4 routers registrados.")
    return app


# Instancia global usada por Mangum y por tests
app = create_app()
