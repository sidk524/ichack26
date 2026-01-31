"""Repository for disaster summary with optimistic locking."""

from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.schemas import DisasterSummary
from app.utils.logging import get_context_logger


class OptimisticLockError(Exception):
    """Raised when optimistic lock fails due to version mismatch."""

    pass


class SummaryRepository:
    """Repository for managing the aggregate disaster summary."""

    SUMMARY_ID = "current"

    def __init__(self, database: AsyncIOMotorDatabase):
        self.collection = database.summaries
        self.logger = get_context_logger(__name__)

    async def get(self) -> DisasterSummary:
        """Get the current disaster summary, creating if not exists."""
        doc = await self.collection.find_one({"summary_id": self.SUMMARY_ID})
        if doc:
            doc.pop("_id", None)
            return DisasterSummary(**doc)

        # Create initial summary
        summary = DisasterSummary(summary_id=self.SUMMARY_ID)
        await self.collection.insert_one(summary.model_dump())
        self.logger.info(
            "Created initial disaster summary",
            extra={"event": "summary_created"},
        )
        return summary

    async def update(
        self, summary: DisasterSummary, expected_version: int | None = None
    ) -> DisasterSummary:
        """
        Update the disaster summary with optimistic locking.

        Args:
            summary: The updated summary
            expected_version: Expected version for optimistic locking.
                            If None, uses summary.version - 1.

        Raises:
            OptimisticLockError: If version mismatch occurs
        """
        if expected_version is None:
            expected_version = summary.version - 1

        # Increment version and update timestamp
        summary.version = expected_version + 1
        summary.updated_at = datetime.utcnow()

        result = await self.collection.find_one_and_update(
            {
                "summary_id": self.SUMMARY_ID,
                "version": expected_version,
            },
            {"$set": summary.model_dump()},
            return_document=True,
        )

        if result is None:
            # Check if it's because summary doesn't exist or version mismatch
            existing = await self.collection.find_one({"summary_id": self.SUMMARY_ID})
            if existing:
                self.logger.warning(
                    f"Optimistic lock failed: expected version {expected_version}, "
                    f"found {existing.get('version')}",
                    extra={
                        "event": "optimistic_lock_failed",
                        "expected_version": expected_version,
                        "actual_version": existing.get("version"),
                    },
                )
                raise OptimisticLockError(
                    f"Version mismatch: expected {expected_version}, "
                    f"found {existing.get('version')}"
                )
            else:
                # Summary doesn't exist, create it
                await self.collection.insert_one(summary.model_dump())
                self.logger.info(
                    "Created summary during update",
                    extra={"event": "summary_created_on_update"},
                )

        self.logger.info(
            f"Updated disaster summary to version {summary.version}",
            extra={"event": "summary_updated", "version": summary.version},
        )
        return summary

    async def update_with_retry(
        self, update_fn, max_retries: int = 3
    ) -> DisasterSummary:
        """
        Update summary with automatic retry on optimistic lock failure.

        Args:
            update_fn: Async function that takes current summary and returns updated summary
            max_retries: Maximum number of retry attempts

        Returns:
            Updated summary
        """
        for attempt in range(max_retries):
            try:
                current = await self.get()
                updated = await update_fn(current)
                return await self.update(updated, expected_version=current.version)
            except OptimisticLockError:
                if attempt == max_retries - 1:
                    self.logger.error(
                        f"Failed to update summary after {max_retries} retries",
                        extra={"event": "summary_update_failed", "retries": max_retries},
                    )
                    raise
                self.logger.debug(
                    f"Retry {attempt + 1}/{max_retries} due to optimistic lock failure",
                    extra={"event": "summary_update_retry", "attempt": attempt + 1},
                )

        # Should not reach here
        raise RuntimeError("Unexpected state in update_with_retry")

    async def reset(self) -> DisasterSummary:
        """Reset the summary to initial state."""
        summary = DisasterSummary(summary_id=self.SUMMARY_ID, version=1)
        await self.collection.replace_one(
            {"summary_id": self.SUMMARY_ID},
            summary.model_dump(),
            upsert=True,
        )
        self.logger.info("Reset disaster summary", extra={"event": "summary_reset"})
        return summary
