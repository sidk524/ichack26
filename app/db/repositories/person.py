"""Repository for person records."""

from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.schemas import ExtractedInfo, PersonRecord, TranscriptChunk
from app.utils.logging import get_context_logger


class PersonRepository:
    """Repository for managing person call records."""

    def __init__(self, database: AsyncIOMotorDatabase):
        self.collection = database.persons
        self.logger = get_context_logger(__name__)

    async def create(self, person_id: str, **kwargs) -> PersonRecord:
        """Create a new person record."""
        record = PersonRecord(person_id=person_id, **kwargs)
        await self.collection.insert_one(record.model_dump())
        self.logger.info(
            f"Created person record: {person_id}",
            extra={"event": "person_created", "person_id": person_id},
        )
        return record

    async def get(self, person_id: str) -> PersonRecord | None:
        """Get a person record by ID."""
        doc = await self.collection.find_one({"person_id": person_id})
        if doc:
            doc.pop("_id", None)
            return PersonRecord(**doc)
        return None

    async def get_or_create(self, person_id: str, **kwargs) -> tuple[PersonRecord, bool]:
        """Get existing record or create new one. Returns (record, created)."""
        existing = await self.get(person_id)
        if existing:
            return existing, False
        return await self.create(person_id, **kwargs), True

    async def add_transcript_chunk(
        self, person_id: str, chunk: TranscriptChunk
    ) -> PersonRecord | None:
        """Add a transcript chunk to a person's record."""
        result = await self.collection.find_one_and_update(
            {"person_id": person_id},
            {
                "$push": {"transcript_chunks": chunk.model_dump()},
                "$set": {"updated_at": datetime.utcnow()},
            },
            return_document=True,
        )
        if result:
            result.pop("_id", None)
            return PersonRecord(**result)
        return None

    async def update_extracted_info(
        self, person_id: str, info: ExtractedInfo
    ) -> PersonRecord | None:
        """Update the extracted information for a person."""
        result = await self.collection.find_one_and_update(
            {"person_id": person_id},
            {
                "$set": {
                    "extracted_info": info.model_dump(),
                    "updated_at": datetime.utcnow(),
                },
                "$push": {"extraction_history": info.model_dump()},
            },
            return_document=True,
        )
        if result:
            result.pop("_id", None)
            self.logger.info(
                f"Updated extracted info for {person_id}",
                extra={"event": "info_extracted", "person_id": person_id},
            )
            return PersonRecord(**result)
        return None

    async def end_call(self, person_id: str) -> PersonRecord | None:
        """Mark a call as ended."""
        now = datetime.utcnow()
        result = await self.collection.find_one_and_update(
            {"person_id": person_id},
            {
                "$set": {
                    "is_active": False,
                    "call_ended_at": now,
                    "updated_at": now,
                }
            },
            return_document=True,
        )
        if result:
            result.pop("_id", None)
            self.logger.info(
                f"Call ended for {person_id}",
                extra={"event": "call_ended", "person_id": person_id},
            )
            return PersonRecord(**result)
        return None

    async def get_active_persons(self) -> list[PersonRecord]:
        """Get all persons with active calls."""
        cursor = self.collection.find({"is_active": True})
        records = []
        async for doc in cursor:
            doc.pop("_id", None)
            records.append(PersonRecord(**doc))
        return records

    async def get_all_with_extracted_info(self) -> list[PersonRecord]:
        """Get all persons that have extracted info."""
        cursor = self.collection.find({"extracted_info": {"$ne": None}})
        records = []
        async for doc in cursor:
            doc.pop("_id", None)
            records.append(PersonRecord(**doc))
        return records

    async def count_active(self) -> int:
        """Count active calls."""
        return await self.collection.count_documents({"is_active": True})

    async def count_total(self) -> int:
        """Count total person records."""
        return await self.collection.count_documents({})

    async def delete(self, person_id: str) -> bool:
        """Delete a person record."""
        result = await self.collection.delete_one({"person_id": person_id})
        return result.deleted_count > 0

    async def delete_all(self) -> int:
        """Delete all person records. Use with caution."""
        result = await self.collection.delete_many({})
        return result.deleted_count
