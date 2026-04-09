"""
Unit tests — EscalationAlertManager (PAT-06 non-blocking + PAT-07 dual-channel).
"""
from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.components.escalation_alert_manager import EscalationAlertManager
from app.models.escalation import EscalationCreateRequest


@pytest.fixture
def manager() -> EscalationAlertManager:
    with patch("app.components.escalation_alert_manager.boto3"):
        return EscalationAlertManager()


def _make_escalation_request(**kwargs) -> EscalationCreateRequest:
    defaults = {
        "session_id": "sess-001",
        "reason": "Candidato no otorgó consentimiento pero la sesión continuó",
        "severity": "critical",
        "timestamp": datetime(2026, 4, 8, 10, 0, 0),
    }
    defaults.update(kwargs)
    return EscalationCreateRequest(**defaults)


class TestRaiseEscalation:
    @patch("app.components.escalation_alert_manager.asyncio.create_task")
    @patch("app.components.escalation_alert_manager.get_database")
    async def test_raise_escalation_persists_record(
        self, mock_get_db, mock_create_task, manager
    ):
        """raise_escalation persiste el record en MongoDB."""
        col = AsyncMock()
        col.insert_one = AsyncMock(return_value=MagicMock())
        mock_get_db.return_value.__getitem__.return_value = col

        req = _make_escalation_request()
        result = await manager.raise_escalation(req)

        col.insert_one.assert_awaited_once()
        assert result.session_id == "sess-001"
        assert result.severity == "critical"
        assert result.created is True

    @patch("app.components.escalation_alert_manager.asyncio.create_task")
    @patch("app.components.escalation_alert_manager.get_database")
    async def test_raise_escalation_fires_task_non_blocking(
        self, mock_get_db, mock_create_task, manager
    ):
        """PAT-06: asyncio.create_task es invocado (fire-and-forget)."""
        col = AsyncMock()
        col.insert_one = AsyncMock(return_value=MagicMock())
        mock_get_db.return_value.__getitem__.return_value = col

        req = _make_escalation_request()
        await manager.raise_escalation(req)

        # Verificar que se disparó task no bloqueante
        mock_create_task.assert_called_once()

    @patch("app.components.escalation_alert_manager.get_database")
    async def test_publish_to_sns_calls_boto3(self, mock_get_db, manager):
        """_publish_to_sns invoca boto3 SNS publish."""
        manager._settings = MagicMock()
        manager._settings.sns_topic_arn = "arn:aws:sns:us-east-1:123:test"
        manager._sns = MagicMock()
        manager._sns.publish = MagicMock(return_value={"MessageId": "msg-123"})

        req = _make_escalation_request()
        result = await manager._publish_to_sns(req)

        assert result == "msg-123"
        manager._sns.publish.assert_called_once()

    @patch("app.components.escalation_alert_manager.get_database")
    async def test_publish_to_sns_skips_if_no_topic(self, mock_get_db, manager):
        """Si SNS_TOPIC_ARN está vacío, no se llama a boto3."""
        manager._settings = MagicMock()
        manager._settings.sns_topic_arn = ""
        manager._sns = MagicMock()

        req = _make_escalation_request()
        result = await manager._publish_to_sns(req)

        assert result is None
        manager._sns.publish.assert_not_called()

    @patch("app.components.escalation_alert_manager.get_database")
    async def test_emit_cw_metric_calls_boto3(self, mock_get_db, manager):
        """_emit_cw_metric invoca boto3 CloudWatch put_metric_data."""
        manager._settings = MagicMock()
        manager._settings.environment = "test"
        manager._cw = MagicMock()
        manager._cw.put_metric_data = MagicMock(return_value={})

        await manager._emit_cw_metric("critical")
        manager._cw.put_metric_data.assert_called_once()
        call_kwargs = manager._cw.put_metric_data.call_args.kwargs
        assert call_kwargs["Namespace"] == "EntreVista/Compliance"
