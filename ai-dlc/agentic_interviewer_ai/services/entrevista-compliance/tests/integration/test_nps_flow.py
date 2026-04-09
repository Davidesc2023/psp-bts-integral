"""
Integration test — NPS Flow E2E.
POST /nps → GET /nps/{session_id}.
"""
from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.router import app


@pytest.fixture(autouse=True)
def mock_xray(mocker):
    mocker.patch("aws_xray_sdk.core.xray_recorder.in_subsegment")


@pytest.fixture
def mock_jwt(mocker):
    mocker.patch(
        "entrevista_shared.auth.jwt_validator.validate_token",
        return_value={"sub": "int-001"},
    )


@pytest.fixture
def mock_nps_db(mocker):
    """Mock de la colección nps_responses."""
    stored = {}

    async def find_one_and_update(filter, update, **kwargs):
        session_id = filter.get("session_id", "")
        score = update.get("$set", {}).get("score", 0)
        category_map = {
            range(0, 7): "detractor",
            range(7, 9): "passive",
            range(9, 11): "promoter",
        }
        category = next(
            (c for r, c in category_map.items() if score in r), "unknown"
        )
        doc = {
            "session_id": session_id,
            "candidate_id": update.get("$setOnInsert", {}).get("candidate_id", "cand"),
            "score": score,
            "category": category,
            "comment": update.get("$set", {}).get("comment"),
            "timestamp": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": update.get("$set", {}).get("updated_at"),
        }
        stored[session_id] = doc
        return doc

    async def find_one(filter, projection=None):
        return stored.get(filter.get("session_id"))

    col = AsyncMock()
    col.find_one_and_update = AsyncMock(side_effect=find_one_and_update)
    col.find_one = AsyncMock(side_effect=find_one)

    db = MagicMock()
    db.__getitem__.return_value = col
    mocker.patch("app.components.nps_collector.get_database", return_value=db)
    return stored


@pytest.mark.asyncio
class TestNPSFlowIntegration:
    async def test_submit_then_get_nps(self, mock_jwt, mock_nps_db):
        """POST /nps → GET /nps/{session_id} retorna el score registrado."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            post_resp = await client.post(
                "/nps",
                json={
                    "session_id": "sess-nps-001",
                    "candidate_id": "cand-001",
                    "score": 9,
                    "comment": "Excelente experiencia",
                    "timestamp": "2026-04-08T10:00:00",
                },
                headers={"Authorization": "Bearer valid-token"},
            )
            assert post_resp.status_code == 201
            post_data = post_resp.json()
            assert post_data["score"] == 9
            assert post_data["category"] == "promoter"

            get_resp = await client.get(
                "/nps/sess-nps-001",
                headers={"Authorization": "Bearer valid-token"},
            )
            assert get_resp.status_code == 200
            get_data = get_resp.json()
            assert get_data["score"] == 9
            assert get_data["exists"] is True

    async def test_get_nps_not_found(self, mock_jwt, mock_nps_db):
        """GET /nps/{session_id} retorna 404 si no hay NPS."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get(
                "/nps/sess-nonexistent",
                headers={"Authorization": "Bearer valid-token"},
            )
        assert resp.status_code == 404

    async def test_nps_score_boundaries(self, mock_jwt, mock_nps_db):
        """Scores en límites (0 y 10) son aceptados."""
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            for score, expected_category in [(0, "detractor"), (10, "promoter")]:
                resp = await client.post(
                    "/nps",
                    json={
                        "session_id": f"sess-boundary-{score}",
                        "candidate_id": "cand-001",
                        "score": score,
                        "timestamp": "2026-04-08T10:00:00",
                    },
                    headers={"Authorization": "Bearer valid-token"},
                )
                assert resp.status_code == 201
                assert resp.json()["category"] == expected_category
