"""
Unit tests — AuditLogger (PAT-03 chain hash + PAT-04 seq_num atómico).
"""
from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.components.audit_logger import GENESIS_HASH, AuditLogger, _sha256, _compute_chain_hash
from app.models.audit import AuditEventCreateRequest


@pytest.fixture
def logger_() -> AuditLogger:
    return AuditLogger()


def _make_audit_request(**kwargs) -> AuditEventCreateRequest:
    defaults = {
        "session_id": "sess-001",
        "event_type": "session.started",
        "actor_id": "int-001",
        "payload": {"info": "value"},
        "timestamp": datetime(2026, 4, 8, 10, 0, 0),
    }
    defaults.update(kwargs)
    return AuditEventCreateRequest(**defaults)


class TestChainHash:
    def test_genesis_hash_length(self):
        """El hash génesis es exactamente 64 caracteres hex."""
        assert len(GENESIS_HASH) == 64
        assert all(c == "0" for c in GENESIS_HASH)

    def test_sha256_returns_64_hex(self):
        """_sha256 retorna exactamente 64 caracteres hex."""
        result = _sha256("test_data")
        assert len(result) == 64
        assert all(c in "0123456789abcdef" for c in result)

    def test_chain_hash_deterministic(self):
        """_compute_chain_hash es determinístico."""
        prev = "a" * 64
        payload = "b" * 64
        h1 = _compute_chain_hash(prev, payload)
        h2 = _compute_chain_hash(prev, payload)
        assert h1 == h2
        assert len(h1) == 64

    def test_chain_hash_changes_with_prev(self):
        """Cambiar prev_hash produce un chain_hash distinto."""
        payload = "b" * 64
        h1 = _compute_chain_hash("a" * 64, payload)
        h2 = _compute_chain_hash("c" * 64, payload)
        assert h1 != h2


class TestLogEvent:
    @patch("app.components.audit_logger._counter_store")
    @patch("app.components.audit_logger.get_database")
    async def test_log_event_first_event_uses_genesis(
        self, mock_get_db, mock_counter_store, logger_
    ):
        """Primer evento usa GENESIS_HASH como prev_hash."""
        mock_counter_store.next_seq_num = AsyncMock(return_value=1)

        col = AsyncMock()
        col.find_one = AsyncMock(return_value=None)  # Sin evento previo
        col.insert_one = AsyncMock(return_value=MagicMock())
        mock_get_db.return_value.__getitem__.return_value = col

        req = _make_audit_request()
        result = await logger_.log_event(req)

        assert result.seq_num == 1
        assert result.prev_hash == GENESIS_HASH
        assert len(result.chain_hash) == 64
        assert len(result.payload_hash) == 64

    @patch("app.components.audit_logger._counter_store")
    @patch("app.components.audit_logger.get_database")
    async def test_log_event_second_event_links_to_first(
        self, mock_get_db, mock_counter_store, logger_
    ):
        """El segundo evento enlaza con el chain_hash del primero."""
        first_chain_hash = "f" * 64
        mock_counter_store.next_seq_num = AsyncMock(return_value=2)

        col = AsyncMock()
        col.find_one = AsyncMock(return_value={"chain_hash": first_chain_hash})
        col.insert_one = AsyncMock(return_value=MagicMock())
        mock_get_db.return_value.__getitem__.return_value = col

        req = _make_audit_request(event_type="session.consent.recorded")
        result = await logger_.log_event(req)

        assert result.seq_num == 2
        assert result.prev_hash == first_chain_hash

    @patch("app.components.audit_logger._counter_store")
    @patch("app.components.audit_logger.get_database")
    async def test_get_audit_log_paginado(
        self, mock_get_db, mock_counter_store, logger_
    ):
        """get_audit_log retorna eventos paginados correctamente."""
        events_docs = [
            {
                "session_id": "sess-001",
                "seq_num": i,
                "event_type": "test",
                "actor_id": "actor",
                "payload_hash": "a" * 64,
                "chain_hash": "b" * 64,
                "prev_hash": "c" * 64,
                "timestamp": datetime(2026, 4, 8, 10, 0, 0),
            }
            for i in range(1, 4)
        ]

        col = AsyncMock()
        col.count_documents = AsyncMock(return_value=3)

        async def async_iter(_docs):
            for d in _docs:
                yield d

        mock_cursor = MagicMock()
        mock_cursor.sort.return_value = mock_cursor
        mock_cursor.skip.return_value = mock_cursor
        mock_cursor.limit.return_value = mock_cursor
        mock_cursor.__aiter__ = lambda s: async_iter(events_docs)
        col.find.return_value = mock_cursor

        mock_get_db.return_value.__getitem__.return_value = col

        result = await logger_.get_audit_log("sess-001", page=1, limit=50)

        assert result.total == 3
        assert len(result.events) == 3
        assert result.page == 1
