"""
Integration test — Audit Chain Hash E2E.
Múltiples POST /audit/event → verificar chain hash linkage (PAT-03).
"""
from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.components.audit_logger import GENESIS_HASH, AuditLogger, _compute_chain_hash, _sha256
from app.models.audit import AuditEventCreateRequest


@pytest.fixture(autouse=True)
def mock_xray(mocker):
    mocker.patch("aws_xray_sdk.core.xray_recorder.in_subsegment")


@pytest.fixture
def audit_logger():
    return AuditLogger()


@pytest.mark.asyncio
class TestAuditChainIntegration:
    async def test_chain_hash_links_three_events(self, mocker, audit_logger):
        """
        3 eventos consecutivos forman una cadena donde cada prev_hash
        coincide con el chain_hash del evento anterior.
        """
        seq_counter = [0]

        async def mock_next_seq(session_id: str) -> int:
            seq_counter[0] += 1
            return seq_counter[0]

        mocker.patch(
            "app.components.audit_logger._counter_store.next_seq_num",
            side_effect=mock_next_seq,
        )

        stored_events = []

        async def mock_insert(doc):
            stored_events.append(doc.copy() if hasattr(doc, "copy") else dict(doc))
            return MagicMock()

        async def mock_find_one(query, projection=None):
            if not stored_events:
                return None
            seq_wanted = query.get("seq_num")
            for ev in stored_events:
                if ev.get("seq_num") == seq_wanted:
                    return ev
            return None

        col = AsyncMock()
        col.insert_one = AsyncMock(side_effect=mock_insert)
        col.find_one = AsyncMock(side_effect=mock_find_one)

        db = MagicMock()
        db.__getitem__.return_value = col
        mocker.patch("app.components.audit_logger.get_database", return_value=db)

        # Registrar 3 eventos
        events = []
        for i in range(1, 4):
            req = AuditEventCreateRequest(
                session_id="sess-chain-001",
                event_type=f"event.type.{i}",
                actor_id="int-001",
                payload={"index": i},
                timestamp=datetime(2026, 4, 8, 10, i, 0),
            )
            result = await audit_logger.log_event(req)
            events.append(result)

        # Verificar cadena
        assert events[0].seq_num == 1
        assert events[0].prev_hash == GENESIS_HASH

        assert events[1].seq_num == 2
        assert events[1].prev_hash == events[0].chain_hash

        assert events[2].seq_num == 3
        assert events[2].prev_hash == events[1].chain_hash

        # Verificar que chain_hash es reproducible
        for event in events:
            expected = _compute_chain_hash(event.prev_hash, event.payload_hash)
            assert event.chain_hash == expected

    async def test_chain_hash_tampering_detectable(self):
        """
        Si el payload cambia, el payload_hash cambia y la cadena es verificable.
        """
        original_payload = {"score": 85}
        tampered_payload = {"score": 95}

        original_hash = _sha256('{"score":85}')
        tampered_hash = _sha256('{"score":95}')

        assert original_hash != tampered_hash

        # Construir cadena con original
        chain1 = _compute_chain_hash(GENESIS_HASH, original_hash)
        # Intentar construir la misma cadena con payload adulterado
        chain2 = _compute_chain_hash(GENESIS_HASH, tampered_hash)

        # Las cadenas son distintas → tampering detectable
        assert chain1 != chain2
