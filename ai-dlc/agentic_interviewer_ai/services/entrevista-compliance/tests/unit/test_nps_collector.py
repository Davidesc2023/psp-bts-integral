"""
Unit tests — NPSCollector (BR-C05: un NPS por sesión).
"""
from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest

from app.components.nps_collector import NPSCollector
from app.models.nps import NPSCreateRequest, NPSResponse


@pytest.fixture
def collector() -> NPSCollector:
    return NPSCollector()


def _make_nps_request(**kwargs) -> NPSCreateRequest:
    defaults = {
        "session_id": "sess-001",
        "candidate_id": "cand-001",
        "score": 8,
        "timestamp": datetime(2026, 4, 8, 10, 0, 0),
    }
    defaults.update(kwargs)
    return NPSCreateRequest(**defaults)


class TestNPSValidation:
    def test_score_valid_range(self):
        """Scores 0–10 son aceptados."""
        for score in [0, 1, 5, 8, 10]:
            req = _make_nps_request(score=score)
            assert req.score == score

    def test_score_below_range_rejected(self):
        """Score < 0 lanza ValidationError."""
        with pytest.raises(Exception):
            NPSCreateRequest(
                session_id="s", candidate_id="c", score=-1,
                timestamp=datetime.utcnow()
            )

    def test_score_above_range_rejected(self):
        """Score > 10 lanza ValidationError."""
        with pytest.raises(Exception):
            NPSCreateRequest(
                session_id="s", candidate_id="c", score=11,
                timestamp=datetime.utcnow()
            )

    def test_nps_categorize_detractor(self):
        """Score 0–6 es detractor."""
        for score in range(0, 7):
            assert NPSResponse.categorize(score) == "detractor"

    def test_nps_categorize_passive(self):
        """Score 7–8 es passive."""
        assert NPSResponse.categorize(7) == "passive"
        assert NPSResponse.categorize(8) == "passive"

    def test_nps_categorize_promoter(self):
        """Score 9–10 es promoter."""
        assert NPSResponse.categorize(9) == "promoter"
        assert NPSResponse.categorize(10) == "promoter"


class TestSubmitNPS:
    @patch("app.components.nps_collector.get_database")
    async def test_submit_nps_new_session(self, mock_get_db, collector):
        """Registra nuevo NPS para sesión sin NPS previo."""
        now = datetime(2026, 4, 8, 10, 0, 0)
        upsert_result = {
            "session_id": "sess-001",
            "candidate_id": "cand-001",
            "score": 9,
            "category": "promoter",
            "comment": None,
            "timestamp": now,
            "created_at": now,
            "updated_at": None,
        }
        col = AsyncMock()
        col.find_one_and_update = AsyncMock(return_value=upsert_result)
        mock_get_db.return_value.__getitem__.return_value = col

        req = _make_nps_request(score=9)
        result = await collector.submit_nps(req)

        assert result.score == 9
        assert result.category == "promoter"
        assert result.session_id == "sess-001"
        col.find_one_and_update.assert_awaited_once()

    @patch("app.components.nps_collector.get_database")
    async def test_submit_nps_updates_existing(self, mock_get_db, collector):
        """Upsert actualiza score existente (BR-C05: un NPS por sesión)."""
        now = datetime(2026, 4, 8, 10, 0, 0)
        updated_result = {
            "session_id": "sess-001",
            "candidate_id": "cand-001",
            "score": 5,  # actualizado de 9 → 5
            "category": "detractor",
            "comment": None,
            "timestamp": now,
            "created_at": now,
            "updated_at": now,
        }
        col = AsyncMock()
        col.find_one_and_update = AsyncMock(return_value=updated_result)
        mock_get_db.return_value.__getitem__.return_value = col

        req = _make_nps_request(score=5)
        result = await collector.submit_nps(req)

        assert result.score == 5
        assert result.category == "detractor"

    @patch("app.components.nps_collector.get_database")
    async def test_get_nps_not_found(self, mock_get_db, collector):
        """get_nps retorna exists=False si no hay registro."""
        col = AsyncMock()
        col.find_one = AsyncMock(return_value=None)
        mock_get_db.return_value.__getitem__.return_value = col

        result = await collector.get_nps("sess-999")
        assert result.exists is False

    @patch("app.components.nps_collector.get_database")
    async def test_get_nps_found(self, mock_get_db, collector):
        """get_nps retorna datos correctos si existe."""
        now = datetime.utcnow()
        col = AsyncMock()
        col.find_one = AsyncMock(return_value={
            "session_id": "sess-001",
            "score": 8,
            "category": "passive",
            "comment": "Bien",
            "timestamp": now,
        })
        mock_get_db.return_value.__getitem__.return_value = col

        result = await collector.get_nps("sess-001")
        assert result.exists is True
        assert result.score == 8
        assert result.category == "passive"
