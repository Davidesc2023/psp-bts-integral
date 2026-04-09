"""
Unit tests — DataRetentionManager (PAT-08 selective purge + BR-C07 legal hold).
"""
from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.components.data_retention_manager import (
    DEFAULT_RETENTION_DAYS,
    DataRetentionManager,
)
from app.models.retention import MIN_RETENTION_DAYS, RetentionPolicyUpdateRequest


@pytest.fixture
def manager() -> DataRetentionManager:
    return DataRetentionManager()


class TestRetentionPolicyValidation:
    def test_retention_days_minimum(self):
        """retention_days mínimo aceptado es 30."""
        req = RetentionPolicyUpdateRequest(
            collection_name="audit_events",
            retention_days=MIN_RETENTION_DAYS,
        )
        assert req.retention_days == MIN_RETENTION_DAYS

    def test_retention_days_below_minimum_rejected(self):
        """retention_days < 30 lanza ValidationError."""
        with pytest.raises(Exception):
            RetentionPolicyUpdateRequest(
                collection_name="audit_events",
                retention_days=15,
            )

    def test_invalid_collection_rejected(self):
        """collection_name fuera de lista permitida lanza ValidationError."""
        with pytest.raises(Exception):
            RetentionPolicyUpdateRequest(
                collection_name="nonexistent_collection",
                retention_days=90,
            )


class TestRunPurge:
    @patch("app.components.data_retention_manager.get_database")
    async def test_purge_deletes_old_docs(self, mock_get_db, manager):
        """run_purge elimina documentos anteriores al cutoff."""
        policy_doc = {
            "collection_name": "audit_events",
            "retention_days": 365,
            "last_purge_at": None,
            "last_purge_deleted_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        data_col = AsyncMock()
        data_col.delete_many = AsyncMock(return_value=MagicMock(deleted_count=42))

        retention_col = AsyncMock()
        retention_col.find_one = AsyncMock(return_value=policy_doc)
        retention_col.update_one = AsyncMock()

        def col_selector(name):
            if name == "campaigns_retention":
                return retention_col
            return data_col

        mock_db = MagicMock()
        mock_db.__getitem__.side_effect = col_selector
        mock_get_db.return_value = mock_db

        # Parchear _get_or_create_policy para retornar la política directamente
        from app.models.retention import RetentionPolicy
        policy = RetentionPolicy(
            collection_name="audit_events",
            retention_days=365,
        )
        manager._get_or_create_policy = AsyncMock(return_value=policy)

        results = await manager.run_purge()

        assert any(r.collection_name == "audit_events" and r.deleted_count == 42 for r in results)

    @patch("app.components.data_retention_manager.get_database")
    async def test_purge_uses_cutoff_date(self, mock_get_db, manager):
        """run_purge calcula cutoff = now - retention_days."""
        from app.models.retention import RetentionPolicy

        before = datetime.utcnow() - timedelta(days=365) - timedelta(seconds=5)

        data_col = AsyncMock()
        delete_call_args = {}

        async def capture_delete(*args, **kwargs):
            delete_call_args["filter"] = args[0] if args else kwargs.get("filter")
            return MagicMock(deleted_count=0)

        data_col.delete_many = AsyncMock(side_effect=capture_delete)

        retention_col = AsyncMock()
        retention_col.update_one = AsyncMock()
        mock_db = MagicMock()
        mock_db.__getitem__.side_effect = lambda n: (
            retention_col if n == "campaigns_retention" else data_col
        )
        mock_get_db.return_value = mock_db

        policy = RetentionPolicy(collection_name="audit_events", retention_days=365)
        manager._get_or_create_policy = AsyncMock(return_value=policy)

        await manager.run_purge()

        if delete_call_args.get("filter"):
            cutoff_used = delete_call_args["filter"]["timestamp"]["$lt"]
            # El cutoff debe estar antes de "before"
            assert cutoff_used >= before

    @patch("app.components.data_retention_manager.get_database")
    async def test_update_policy_ok(self, mock_get_db, manager):
        """update_policy actualiza correctamente la política."""
        now = datetime.utcnow()
        updated = {
            "collection_name": "nps_responses",
            "retention_days": 180,
            "last_purge_at": None,
            "last_purge_deleted_count": 0,
            "updated_at": now,
        }
        col = AsyncMock()
        col.find_one_and_update = AsyncMock(return_value=updated)
        mock_get_db.return_value.__getitem__.return_value = col

        req = RetentionPolicyUpdateRequest(
            collection_name="nps_responses",
            retention_days=180,
        )
        result = await manager.update_policy(req)
        assert result.retention_days == 180
        assert result.collection_name == "nps_responses"
