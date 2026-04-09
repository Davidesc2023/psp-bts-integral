"""
EscalationAlertManager — PAT-06 (Non-blocking asyncio) + PAT-07 (Dual-channel SNS + CloudWatch).
Persiste la escalación, publica a SNS de forma no bloqueante y emite métrica a CloudWatch.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any

import boto3
from aws_xray_sdk.core import xray_recorder
from botocore.exceptions import ClientError

from app.config import get_settings
from app.db.motor_client import get_database
from app.models.escalation import (
    EscalationCreateRequest,
    EscalationRecord,
    EscalationResponse,
)

logger = logging.getLogger(__name__)

COLLECTION = "escalations"


class EscalationAlertManager:
    """
    Gestiona la creación de escalaciones de compliance.

    PAT-06: la publicación a SNS / CloudWatch se dispara como asyncio.create_task
            para no bloquear la respuesta al cliente si AWS tardar.
    PAT-07: dual-channel = SNS topic + CloudWatch PutMetricData.
    """

    def __init__(self) -> None:
        self._sns = boto3.client("sns")
        self._cw = boto3.client("cloudwatch")
        self._settings = get_settings()

    async def raise_escalation(
        self, request: EscalationCreateRequest
    ) -> EscalationResponse:
        """
        Persiste la escalación y dispara alertas dual-channel de forma no bloqueante.
        """
        with xray_recorder.in_subsegment("EscalationAlertManager.raise_escalation") as sub:
            sub.put_metadata("session_id", request.session_id)
            sub.put_annotation("severity", request.severity)

            db = get_database()
            col = db[COLLECTION]

            record = EscalationRecord(
                session_id=request.session_id,
                reason=request.reason,
                severity=request.severity,
                actor_id=request.actor_id,
                context=request.context,
                timestamp=request.timestamp,
            )
            await col.insert_one(record.model_dump())

            # PAT-06: fire-and-forget — no bloquea respuesta al cliente
            asyncio.create_task(
                self._send_dual_channel_alert(request, record)
            )

            logger.warning(
                "Escalacion creada: session=%s severity=%s reason=%.80s",
                request.session_id,
                request.severity,
                request.reason,
            )

            return EscalationResponse(
                session_id=request.session_id,
                severity=request.severity,
                reason=request.reason,
                timestamp=request.timestamp,
                created=True,
            )

    async def _send_dual_channel_alert(
        self, request: EscalationCreateRequest, record: EscalationRecord
    ) -> None:
        """Publica a SNS y emite métrica CloudWatch (PAT-07 dual-channel)."""
        sns_message_id = await self._publish_to_sns(request)
        await self._emit_cw_metric(request.severity)

        # Actualizar el registro con los IDs de notificación
        db = get_database()
        col = db[COLLECTION]
        await col.update_one(
            {"session_id": request.session_id, "timestamp": request.timestamp},
            {
                "$set": {
                    "sns_message_id": sns_message_id,
                    "cw_metric_published": True,
                }
            },
        )

    async def _publish_to_sns(self, request: EscalationCreateRequest) -> str | None:
        """Publica mensaje de alerta al SNS topic (canal 1 de PAT-07)."""
        if not self._settings.sns_topic_arn:
            logger.warning("SNS_TOPIC_ARN no configurado, omitiendo publicación.")
            return None

        message_body = (
            f"[COMPLIANCE ESCALATION]\n"
            f"Sesión: {request.session_id}\n"
            f"Severidad: {request.severity.upper()}\n"
            f"Razón: {request.reason}\n"
            f"Timestamp: {request.timestamp.isoformat()}"
        )
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self._sns.publish(
                    TopicArn=self._settings.sns_topic_arn,
                    Message=message_body,
                    Subject=f"[{request.severity.upper()}] Compliance Escalation — {request.session_id}",
                    MessageAttributes={
                        "severity": {
                            "DataType": "String",
                            "StringValue": request.severity,
                        },
                        "session_id": {
                            "DataType": "String",
                            "StringValue": request.session_id,
                        },
                    },
                ),
            )
            msg_id = response.get("MessageId")
            logger.info("SNS publicado: MessageId=%s", msg_id)
            return msg_id
        except ClientError as exc:
            logger.error("Error publicando a SNS: %s", exc)
            return None

    async def _emit_cw_metric(self, severity: str) -> None:
        """Emite métrica ComplianceEscalation a CloudWatch (canal 2 de PAT-07)."""
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self._cw.put_metric_data(
                    Namespace="EntreVista/Compliance",
                    MetricData=[
                        {
                            "MetricName": "EscalationCount",
                            "Dimensions": [
                                {"Name": "Severity", "Value": severity},
                                {"Name": "Environment", "Value": self._settings.environment},
                            ],
                            "Value": 1,
                            "Unit": "Count",
                            "Timestamp": datetime.utcnow(),
                        }
                    ],
                ),
            )
            logger.info("CloudWatch metric emitida: severity=%s", severity)
        except ClientError as exc:
            logger.error("Error emitiendo métrica CloudWatch: %s", exc)
