"""
Integration test — Consent Flow E2E.
POST /consent → verificar persistencia en MongoDB (mongomock-motor).
"""
from __future__ import annotations

from datetime import datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.router import app


@pytest.fixture(autouse=True)
def mock_xray(mocker):
    """Desactiva X-Ray en tests."""
    mocker.patch("aws_xray_sdk.core.xray_recorder.in_subsegment")
    mocker.patch("aws_xray_sdk.core.xray_recorder.begin_subsegment")
    mocker.patch("aws_xray_sdk.core.xray_recorder.end_subsegment")


@pytest.fixture
def mock_jwt(mocker):
    """Mockea jwt_validator para retornar payload válido."""
    mocker.patch(
        "entrevista_shared.auth.jwt_validator.validate_token",
        return_value={"sub": "int-001", "role": "interviewer"},
    )


@pytest.fixture
def mock_db(mocker):
    """Reemplaza get_database con motor mock."""
    from unittest.mock import AsyncMock, MagicMock
    from pymongo.errors import DuplicateKeyError

    col = AsyncMock()
    col.insert_one = AsyncMock(return_value=MagicMock())
    col.find_one = AsyncMock(return_value=None)

    db = MagicMock()
    db.__getitem__.return_value = col

    mocker.patch("app.components.consent_manager.get_database", return_value=db)
    return col


@pytest.mark.asyncio
class TestConsentFlowIntegration:
    async def test_post_consent_returns_201(self, mock_jwt, mock_db):
        """POST /consent con datos válidos retorna 201."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/consent",
                json={
                    "session_id": "sess-int-001",
                    "candidate_id": "cand-int-001",
                    "interviewer_id": "int-001",
                    "consented": True,
                    "method": "click",
                    "idempotency_key": "idem-int-001",
                    "timestamp": "2026-04-08T10:00:00",
                },
                headers={"Authorization": "Bearer valid-token"},
            )
        assert response.status_code == 201
        data = response.json()
        assert data["session_id"] == "sess-int-001"
        assert data["consented"] is True
        assert data["created"] is True

    async def test_post_consent_idempotent_returns_200(self, mock_jwt, mock_db):
        """Segundo POST idéntico retorna 200 (idempotencia PAT-01)."""
        from pymongo.errors import DuplicateKeyError

        existing = {
            "session_id": "sess-int-001",
            "candidate_id": "cand-int-001",
            "consented": True,
            "method": "click",
            "idempotency_key": "idem-int-001",
            "timestamp": datetime(2026, 4, 8, 10, 0, 0),
        }
        mock_db.insert_one.side_effect = DuplicateKeyError("dup")
        mock_db.find_one.return_value = existing

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/consent",
                json={
                    "session_id": "sess-int-001",
                    "candidate_id": "cand-int-001",
                    "interviewer_id": "int-001",
                    "consented": True,
                    "method": "click",
                    "idempotency_key": "idem-int-001",
                    "timestamp": "2026-04-08T10:00:00",
                },
                headers={"Authorization": "Bearer valid-token"},
            )
        assert response.status_code == 200
        assert response.json()["created"] is False

    async def test_post_consent_write_once_returns_409(self, mock_jwt, mock_db):
        """Cambio de decisión de consentimiento retorna 409 (BR-C02)."""
        from pymongo.errors import DuplicateKeyError

        existing = {
            "session_id": "sess-int-001",
            "candidate_id": "cand-int-001",
            "consented": True,  # Original True
            "method": "click",
            "idempotency_key": "idem-int-001",
            "timestamp": datetime(2026, 4, 8, 10, 0, 0),
        }
        mock_db.insert_one.side_effect = DuplicateKeyError("dup")
        mock_db.find_one.return_value = existing

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post(
                "/consent",
                json={
                    "session_id": "sess-int-001",
                    "candidate_id": "cand-int-001",
                    "interviewer_id": "int-001",
                    "consented": False,  # Intentar cambiar a False
                    "method": "click",
                    "idempotency_key": "idem-int-001",
                    "timestamp": "2026-04-08T10:00:00",
                },
                headers={"Authorization": "Bearer valid-token"},
            )
        assert response.status_code == 409
