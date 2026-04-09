"""
Unit tests — ConsentManager (PAT-01 idempotency + PAT-02 write-once guard).
"""
from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pymongo.errors import DuplicateKeyError

from app.components.consent_manager import ConsentAlreadyRecordedError, ConsentManager
from app.models.consent import ConsentCreateRequest


@pytest.fixture
def manager() -> ConsentManager:
    return ConsentManager()


def _make_request(**kwargs) -> ConsentCreateRequest:
    defaults = {
        "session_id": "sess-001",
        "candidate_id": "cand-001",
        "interviewer_id": "int-001",
        "consented": True,
        "method": "click",
        "idempotency_key": "idem-abc123",
        "timestamp": datetime(2026, 4, 8, 10, 0, 0),
    }
    defaults.update(kwargs)
    return ConsentCreateRequest(**defaults)


class TestRecordConsent:
    @patch("app.components.consent_manager.get_database")
    async def test_record_consent_ok(self, mock_get_db, manager):
        """Nuevo consentimiento se registra correctamente."""
        col = AsyncMock()
        col.insert_one = AsyncMock(return_value=MagicMock())
        mock_get_db.return_value.__getitem__.return_value = col

        req = _make_request()
        result = await manager.record_consent(req)

        assert result.session_id == "sess-001"
        assert result.consented is True
        assert result.created is True
        col.insert_one.assert_awaited_once()

    @patch("app.components.consent_manager.get_database")
    async def test_record_consent_idempotent_same_decision(self, mock_get_db, manager):
        """Retry idempotente con misma decisión retorna created=False sin error."""
        existing_doc = {
            "session_id": "sess-001",
            "candidate_id": "cand-001",
            "consented": True,
            "method": "click",
            "idempotency_key": "idem-abc123",
            "timestamp": datetime(2026, 4, 8, 10, 0, 0),
        }
        col = AsyncMock()
        col.insert_one = AsyncMock(side_effect=DuplicateKeyError("dup"))
        col.find_one = AsyncMock(return_value=existing_doc)
        mock_get_db.return_value.__getitem__.return_value = col

        req = _make_request()
        result = await manager.record_consent(req)

        assert result.created is False
        assert result.consented is True
        assert result.session_id == "sess-001"

    @patch("app.components.consent_manager.get_database")
    async def test_record_consent_write_once_violation(self, mock_get_db, manager):
        """Intento de cambiar la decisión de consentimiento lanza ConsentAlreadyRecordedError."""
        existing_doc = {
            "session_id": "sess-001",
            "candidate_id": "cand-001",
            "consented": True,  # Original: True
            "method": "click",
            "idempotency_key": "idem-abc123",
            "timestamp": datetime(2026, 4, 8, 10, 0, 0),
        }
        col = AsyncMock()
        col.insert_one = AsyncMock(side_effect=DuplicateKeyError("dup"))
        col.find_one = AsyncMock(return_value=existing_doc)
        mock_get_db.return_value.__getitem__.return_value = col

        # Intentar cambiar consented a False (distinto del original)
        req = _make_request(consented=False)
        with pytest.raises(ConsentAlreadyRecordedError) as exc_info:
            await manager.record_consent(req)

        assert exc_info.value.session_id == "sess-001"

    @patch("app.components.consent_manager.get_database")
    async def test_get_consent_exists(self, mock_get_db, manager):
        """get_consent retorna exists=True si hay registro."""
        existing_doc = {
            "session_id": "sess-001",
            "consented": True,
            "method": "click",
            "timestamp": datetime(2026, 4, 8, 10, 0, 0),
        }
        col = AsyncMock()
        col.find_one = AsyncMock(return_value=existing_doc)
        mock_get_db.return_value.__getitem__.return_value = col

        result = await manager.get_consent("sess-001")
        assert result.exists is True
        assert result.consented is True

    @patch("app.components.consent_manager.get_database")
    async def test_get_consent_not_found(self, mock_get_db, manager):
        """get_consent retorna exists=False si no hay registro."""
        col = AsyncMock()
        col.find_one = AsyncMock(return_value=None)
        mock_get_db.return_value.__getitem__.return_value = col

        result = await manager.get_consent("sess-999")
        assert result.exists is False
        assert result.consented is None
