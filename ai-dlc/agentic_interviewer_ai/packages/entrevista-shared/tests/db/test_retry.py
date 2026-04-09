"""
Tests unitarios para with_db_retry.

Cobertura:
  - Operación exitosa al primer intento → sin reintentos
  - Falla 1 vez, éxito en 2do intento → retorna resultado
  - Falla 3 veces → relanza PyMongoError tras agotar reintentos
  - Error no-PyMongo (ValueError) → se propaga inmediatamente sin reintentos
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from pymongo.errors import ConnectionFailure, PyMongoError

from entrevista_shared.db.retry import with_db_retry


# ---------------------------------------------------------------------------
# Casos de éxito
# ---------------------------------------------------------------------------
class TestWithDbRetrySuccess:
    async def test_success_on_first_attempt_no_sleep(self):
        operation = AsyncMock(return_value={"_id": "doc-1"})

        with patch("entrevista_shared.db.retry.asyncio.sleep") as mock_sleep:
            result = await with_db_retry(operation)

        assert result == {"_id": "doc-1"}
        operation.assert_called_once()
        mock_sleep.assert_not_called()

    async def test_success_on_second_attempt_after_one_failure(self):
        operation = AsyncMock(
            side_effect=[ConnectionFailure("timeout"), {"_id": "doc-2"}]
        )

        with patch("entrevista_shared.db.retry.asyncio.sleep") as mock_sleep:
            result = await with_db_retry(operation)

        assert result == {"_id": "doc-2"}
        assert operation.call_count == 2
        mock_sleep.assert_called_once_with(0.1)  # primer delay = 100ms


# ---------------------------------------------------------------------------
# Casos de agotamiento de reintentos
# ---------------------------------------------------------------------------
class TestWithDbRetryExhausted:
    async def test_all_attempts_fail_raises_last_pymongo_error(self):
        exc = ConnectionFailure("Atlas unreachable")
        operation = AsyncMock(side_effect=exc)

        with patch("entrevista_shared.db.retry.asyncio.sleep"):
            with pytest.raises(PyMongoError) as exc_info:
                await with_db_retry(operation)

        assert exc_info.value is exc
        assert operation.call_count == 3  # 1 original + 2 reintentos

    async def test_retry_delays_are_100ms_and_300ms(self):
        operation = AsyncMock(side_effect=ConnectionFailure("fail"))
        sleep_calls: list[float] = []

        async def capture_sleep(delay: float) -> None:
            sleep_calls.append(delay)

        with patch("entrevista_shared.db.retry.asyncio.sleep", side_effect=capture_sleep):
            with pytest.raises(PyMongoError):
                await with_db_retry(operation)

        assert sleep_calls == [0.1, 0.3]


# ---------------------------------------------------------------------------
# Propagación inmediata de errores no-PyMongo
# ---------------------------------------------------------------------------
class TestWithDbRetryNonMongoError:
    async def test_value_error_propagates_immediately_no_retry(self):
        operation = AsyncMock(side_effect=ValueError("unexpected"))

        with patch("entrevista_shared.db.retry.asyncio.sleep") as mock_sleep:
            with pytest.raises(ValueError, match="unexpected"):
                await with_db_retry(operation)

        operation.assert_called_once()
        mock_sleep.assert_not_called()
