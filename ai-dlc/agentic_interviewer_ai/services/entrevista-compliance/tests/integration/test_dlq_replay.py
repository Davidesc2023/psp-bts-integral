"""
Integration test — DLQ Replay (PAT-05).
Verifica que el DLQ processor re-procesa mensajes y genera alerta SNS al agotar reintentos.
"""
from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from dlq_processor.handler import MAX_RETRIES, handler


@pytest.fixture(autouse=True)
def mock_xray(mocker):
    mocker.patch("aws_xray_sdk.core.xray_recorder.in_subsegment")
    mocker.patch("aws_xray_sdk.core.patch_all")


def _make_sqs_event(body: dict, receive_count: int = 1) -> dict:
    return {
        "Records": [
            {
                "messageId": "msg-test-001",
                "receiptHandle": "handle-001",
                "body": json.dumps(body),
                "attributes": {
                    "ApproximateReceiveCount": str(receive_count),
                },
            }
        ]
    }


@pytest.mark.asyncio
class TestDLQReplayIntegration:
    @patch("dlq_processor.handler._sns_client")
    async def test_dlq_replays_audit_event(self, mock_sns, mocker):
        """Mensaje DLQ con evento audit.event es re-procesado exitosamente."""
        dispatch_mock = AsyncMock(return_value={"status": "ok"})
        mocker.patch("app.handlers.eventbridge_dispatcher.dispatch", dispatch_mock)

        body = {
            "original_event": {
                "source": "entrevista.conversation",
                "detail-type": "compliance.audit.event",
                "detail": {
                    "session_id": "sess-dlq-001",
                    "event_type": "session.started",
                    "actor_id": "int-001",
                    "payload": {},
                },
            }
        }
        event = _make_sqs_event(body, receive_count=1)
        result = handler(event, None)

        # Sin fallos en el batch
        assert result["batchItemFailures"] == []

    @patch("dlq_processor.handler._sns_client")
    async def test_dlq_exhausted_sends_sns_alert(self, mock_sns, mocker):
        """
        Mensaje con receive_count >= MAX_RETRIES publica alerta SNS y
        no re-encola el mensaje (batchItemFailures vacío).
        """
        mock_sns.publish = MagicMock(return_value={"MessageId": "sns-alert-001"})

        import os
        mocker.patch.dict(os.environ, {"SNS_TOPIC_ARN": "arn:aws:sns:us-east-1:123:test"})

        body = {
            "original_event": {
                "source": "entrevista.conversation",
                "detail-type": "compliance.audit.event",
                "detail": {"session_id": "sess-dlq-exhausted"},
            }
        }
        event = _make_sqs_event(body, receive_count=MAX_RETRIES)
        result = handler(event, None)

        # Agotado MAX_RETRIES → publicar SNS pero NO re-encolar
        assert result["batchItemFailures"] == []
        mock_sns.publish.assert_called_once()
        call_kwargs = mock_sns.publish.call_args.kwargs
        assert "DLQ Exhausted" in call_kwargs.get("Subject", "")

    @patch("dlq_processor.handler._sns_client")
    async def test_dlq_failure_returns_batch_item_failure(self, mock_sns, mocker):
        """
        Si el re-procesamiento lanza excepción irrecuperable,
        se retorna el messageId en batchItemFailures.
        """
        dispatch_mock = AsyncMock(side_effect=Exception("DB unreachable"))
        mocker.patch("app.handlers.eventbridge_dispatcher.dispatch", dispatch_mock)

        body = {
            "original_event": {
                "source": "entrevista.conversation",
                "detail-type": "compliance.audit.event",
                "detail": {"session_id": "sess-dlq-fail"},
            }
        }
        event = _make_sqs_event(body, receive_count=1)
        result = handler(event, None)

        assert any(
            item["itemIdentifier"] == "msg-test-001"
            for item in result["batchItemFailures"]
        )
