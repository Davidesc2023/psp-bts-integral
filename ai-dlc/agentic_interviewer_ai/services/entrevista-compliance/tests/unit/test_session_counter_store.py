"""
Unit tests — SessionCounterStore (PAT-04 atomic $inc).
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.components.session_counter_store import SessionCounterStore


@pytest.fixture
def store() -> SessionCounterStore:
    return SessionCounterStore()


class TestNextSeqNum:
    @patch("app.components.session_counter_store.get_database")
    async def test_first_event_returns_1(self, mock_get_db, store):
        """El primer evento de una sesión retorna seq_num=1."""
        col = AsyncMock()
        col.find_one_and_update = AsyncMock(return_value={"counter": 1})
        mock_get_db.return_value.__getitem__.return_value = col

        result = await store.next_seq_num("sess-001")

        assert result == 1
        col.find_one_and_update.assert_awaited_once()

    @patch("app.components.session_counter_store.get_database")
    async def test_sequential_increment(self, mock_get_db, store):
        """Llamadas sucesivas retornan valores incrementales."""
        call_count = [0]

        async def side_effect(*args, **kwargs):
            call_count[0] += 1
            return {"counter": call_count[0]}

        col = AsyncMock()
        col.find_one_and_update = AsyncMock(side_effect=side_effect)
        mock_get_db.return_value.__getitem__.return_value = col

        r1 = await store.next_seq_num("sess-001")
        r2 = await store.next_seq_num("sess-001")
        r3 = await store.next_seq_num("sess-001")

        assert r1 == 1
        assert r2 == 2
        assert r3 == 3

    @patch("app.components.session_counter_store.get_database")
    async def test_get_current_no_session(self, mock_get_db, store):
        """get_current retorna 0 si la sesión no existe."""
        col = AsyncMock()
        col.find_one = AsyncMock(return_value=None)
        mock_get_db.return_value.__getitem__.return_value = col

        result = await store.get_current("sess-nonexistent")
        assert result == 0

    @patch("app.components.session_counter_store.get_database")
    async def test_get_current_existing_session(self, mock_get_db, store):
        """get_current retorna el valor actual del contador."""
        col = AsyncMock()
        col.find_one = AsyncMock(return_value={"counter": 5})
        mock_get_db.return_value.__getitem__.return_value = col

        result = await store.get_current("sess-001")
        assert result == 5

    @patch("app.components.session_counter_store.get_database")
    async def test_uses_upsert(self, mock_get_db, store):
        """find_one_and_update se llama con upsert=True."""
        col = AsyncMock()
        col.find_one_and_update = AsyncMock(return_value={"counter": 1})
        mock_get_db.return_value.__getitem__.return_value = col

        await store.next_seq_num("sess-001")

        call_kwargs = col.find_one_and_update.call_args.kwargs
        assert call_kwargs.get("upsert") is True
