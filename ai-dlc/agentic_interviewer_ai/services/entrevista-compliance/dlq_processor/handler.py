"""
DLQ Processor Lambda — PAT-05 (DLQ auto-replay).
Procesa mensajes fallidos del SQS Dead Letter Queue.
Max 3 reintentos por mensaje; si agota → publica alerta SNS.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, log_level, logging.INFO))

MAX_RETRIES = 3
_sns_client = boto3.client("sns")


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    Procesa registros SQS del DLQ (BatchSize=1, ReportBatchItemFailures).

    Por cada mensaje:
    1. Deserializar el body original del evento fallido.
    2. Re-invocar el componente apropiado (máx MAX_RETRIES intentos).
    3. Si falla tras MAX_RETRIES → publicar alerta SNS.
    4. Retornar batchItemFailures vacío si todos procesados, o con los IDs si no.
    """
    records = event.get("Records", [])
    batch_item_failures = []

    for record in records:
        message_id = record.get("messageId", "unknown")
        receipt_handle = record.get("receiptHandle", "")
        approximate_receive_count = int(
            record.get("attributes", {}).get("ApproximateReceiveCount", "1")
        )

        logger.warning(
            "DLQ message recibido: messageId=%s receiveCount=%d",
            message_id,
            approximate_receive_count,
        )

        try:
            body = json.loads(record.get("body", "{}"))
            asyncio.get_event_loop().run_until_complete(
                _replay_message(body, message_id, approximate_receive_count)
            )
        except Exception as exc:
            logger.error(
                "Error irrecuperable procesando DLQ message=%s: %s", message_id, exc
            )
            batch_item_failures.append({"itemIdentifier": message_id})

    return {"batchItemFailures": batch_item_failures}


async def _replay_message(
    body: dict, message_id: str, receive_count: int
) -> None:
    """
    Re-procesa el mensaje originalmente fallido.
    Si receiveCount >= MAX_RETRIES → publicar alerta SNS y no re-encolar.
    """
    if receive_count >= MAX_RETRIES:
        logger.error(
            "Mensaje %s ha excedido max_retries=%d. Enviando alerta SNS.",
            message_id,
            MAX_RETRIES,
        )
        await _send_dlq_exhausted_alert(body, message_id, receive_count)
        # No lanzar excepción → marcar como procesado para no volver a DLQ
        return

    # Extraer el evento original del cuerpo del mensaje DLQ
    original_event = body.get("original_event", body)
    detail_type = original_event.get("detail-type", "")
    detail = original_event.get("detail", {})

    logger.info("Re-procesando evento DLQ: detail-type=%s messageId=%s", detail_type, message_id)

    from app.handlers.eventbridge_dispatcher import dispatch
    result = await dispatch(original_event, None)
    logger.info("DLQ replay exitoso: messageId=%s result=%s", message_id, result)


async def _send_dlq_exhausted_alert(
    body: dict, message_id: str, receive_count: int
) -> None:
    """Publica alerta SNS cuando un mensaje DLQ agota MAX_RETRIES."""
    sns_topic_arn = os.environ.get("SNS_TOPIC_ARN", "")
    if not sns_topic_arn:
        logger.warning("SNS_TOPIC_ARN no configurado, omitiendo alerta de DLQ agotado.")
        return

    message = (
        f"[DLQ EXHAUSTED]\n"
        f"MessageId: {message_id}\n"
        f"ReceiveCount: {receive_count}\n"
        f"MaxRetries: {MAX_RETRIES}\n"
        f"OriginalBody: {json.dumps(body, default=str)[:500]}"
    )

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: _sns_client.publish(
                TopicArn=sns_topic_arn,
                Message=message,
                Subject=f"[CRITICAL] DLQ Exhausted — entrevista-compliance — {message_id}",
                MessageAttributes={
                    "severity": {"DataType": "String", "StringValue": "critical"},
                    "source": {"DataType": "String", "StringValue": "dlq-processor"},
                },
            ),
        )
        logger.info("Alerta DLQ exhausted publicada en SNS: messageId=%s", message_id)
    except ClientError as exc:
        logger.error("Error publicando alerta DLQ en SNS: %s", exc)
